import json
import math
import os
import shutil
import socket
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Literal

import cv2
import numpy as np
import socketio
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from socket_hub import connect_touchdesigner, disconnect_touchdesigner, emit_touchdesigner_event, sio

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = PROJECT_ROOT / "data"
NOIR_COLOR_DB_PATH = DATA_ROOT / "noir_color_db.json"
LEGACY_PIPELINE_DIR = PROJECT_ROOT / "face-feature-mvp"
if str(LEGACY_PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(LEGACY_PIPELINE_DIR))

from main import COLOR_KEYS, _aggregate_results, _is_usable_frame  # noqa: E402
from modules.color_extractor import extract_colors  # noqa: E402
from modules.feature_calculator import calculate_features  # noqa: E402
from modules.json_saver import save_result  # noqa: E402
from modules.landmark import FaceLandmarkDetector, normalized_to_pixel  # noqa: E402
from modules.skin_analysis import analyze_skin_color  # noqa: E402

from recommendation.recommend import run_recommendation_for_session  # noqa: E402

Pose = Literal["front", "left", "right"]
SIDE_POSE_NOSE_OFFSET_RATIO = 0.14

app = FastAPI(title="Capstone Face Capture API")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OUTPUT_ROOT = Path(__file__).resolve().parent / "outputs"
SESSION_ROOT = OUTPUT_ROOT / "sessions"
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/outputs", StaticFiles(directory=OUTPUT_ROOT), name="outputs")


def _new_session_id():
    return f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"


def _session_dir(session_id):
    return SESSION_ROOT / session_id


def _json_safe_path(path):
    return "/" + path.relative_to(Path(__file__).resolve().parent).as_posix()


def _detect_lan_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def _public_server_origin(request: Request):
    configured = os.getenv("CAPSTONE_PUBLIC_SERVER_ORIGIN", "").rstrip("/")
    if configured:
        return configured

    base_url = str(request.base_url).rstrip("/")
    hostname = request.url.hostname or ""
    if hostname in {"localhost", "127.0.0.1", "0.0.0.0"}:
        return base_url.replace(hostname, _detect_lan_ip(), 1)

    return base_url


def _public_file_url(request: Request, path: Path):
    return f"{_public_server_origin(request)}{_json_safe_path(path)}"


def _decode_image(data):
    image_array = np.frombuffer(data, np.uint8)
    frame = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Unable to decode image frame.")
    return frame


def _distance(point_a, point_b):
    return math.dist(point_a, point_b)


def _eye_openness(landmarks, frame_shape, outer_idx, inner_idx, top_idx, bottom_idx):
    outer = normalized_to_pixel(landmarks[outer_idx], frame_shape)
    inner = normalized_to_pixel(landmarks[inner_idx], frame_shape)
    top = normalized_to_pixel(landmarks[top_idx], frame_shape)
    bottom = normalized_to_pixel(landmarks[bottom_idx], frame_shape)
    eye_width = _distance(outer, inner)
    eye_height = _distance(top, bottom)
    return eye_height / eye_width if eye_width else 0.0


def _quality_score(frame, landmarks):
    left_eye_outer = normalized_to_pixel(landmarks[33], frame.shape)
    right_eye_outer = normalized_to_pixel(landmarks[263], frame.shape)
    left_face = normalized_to_pixel(landmarks[127], frame.shape)
    right_face = normalized_to_pixel(landmarks[356], frame.shape)
    face_width = _distance(left_face, right_face)
    if not face_width:
        return 0.0

    eye_tilt = abs(left_eye_outer[1] - right_eye_outer[1]) / face_width
    left_openness = _eye_openness(landmarks, frame.shape, 33, 133, 159, 145)
    right_openness = _eye_openness(landmarks, frame.shape, 362, 263, 386, 374)
    openness = (left_openness + right_openness) / 2
    return round((1.0 - min(eye_tilt, 1.0)) * 0.7 + min(openness / 0.22, 1.0) * 0.3, 4)


def _frame_sharpness(frame):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _frame_stability(frame, previous_frame):
    if previous_frame is None:
        return 0.5

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    previous_gray = cv2.cvtColor(previous_frame, cv2.COLOR_BGR2GRAY)
    diff = cv2.absdiff(gray, previous_gray)
    mean_diff = float(np.mean(diff))
    return max(0.0, 1.0 - min(mean_diff / 28.0, 1.0))


def _normalize_metric(value, values, higher_is_better=True):
    minimum = min(values)
    maximum = max(values)
    if maximum == minimum:
        return 0.5

    normalized = (value - minimum) / (maximum - minimum)
    return normalized if higher_is_better else 1.0 - normalized


def _nose_offset_ratio(frame, landmarks):
    left_face = normalized_to_pixel(landmarks[127], frame.shape)
    right_face = normalized_to_pixel(landmarks[356], frame.shape)
    nose = normalized_to_pixel(landmarks[1], frame.shape)
    face_center_x = (left_face[0] + right_face[0]) / 2
    face_width = _distance(left_face, right_face)
    return (nose[0] - face_center_x) / face_width if face_width else 0.0


def _side_pose_metrics(frame, landmarks, pose, previous_frame=None):
    direction = _nose_offset_ratio(frame, landmarks)
    direction_strength = abs(direction)
    expected_direction = (
        direction <= -SIDE_POSE_NOSE_OFFSET_RATIO
        if pose == "left"
        else direction >= SIDE_POSE_NOSE_OFFSET_RATIO
    )
    if not expected_direction:
        return None

    left_eye_outer = normalized_to_pixel(landmarks[33], frame.shape)
    right_eye_outer = normalized_to_pixel(landmarks[263], frame.shape)
    left_face = normalized_to_pixel(landmarks[127], frame.shape)
    right_face = normalized_to_pixel(landmarks[356], frame.shape)
    face_width = _distance(left_face, right_face)
    eye_tilt = abs(left_eye_outer[1] - right_eye_outer[1]) / face_width if face_width else 1.0
    return {
        "directionStrength": direction_strength,
        "eyeTilt": eye_tilt,
        "sharpness": _frame_sharpness(frame),
        "stability": _frame_stability(frame, previous_frame),
    }


def _side_pose_fallback_metrics(frame, previous_frame=None):
    return {
        "sharpness": _frame_sharpness(frame),
        "stability": _frame_stability(frame, previous_frame),
    }


def _build_sample(frame, landmarks, *, has_makeup=False, makeup_input_missing=False):
    analysis_result = analyze_skin_color(frame, landmarks, has_makeup=has_makeup)
    skin_analysis = analysis_result["skinAnalysis"]
    skin_base_rgb = (
        skin_analysis.get("skinBaseColor", {}).get("rgb")
        or skin_analysis.get("dominantRGB")
    )
    colors = extract_colors(
        frame,
        landmarks,
        skin_base_color=skin_base_rgb,
        has_makeup=has_makeup,
        makeup_input_missing=makeup_input_missing,
    )
    features = calculate_features(frame, landmarks)
    colors["skinColor"] = {
        **colors.get("skinColor", {}),
        "rgb": skin_analysis["dominantRGB"],
        "hex": skin_analysis["hex"],
    }
    sample = {key: colors[key] for key in COLOR_KEYS}
    sample["skinAnalysis"] = skin_analysis
    sample["personalColor"] = analysis_result["personalColor"]
    sample["features"] = features
    return sample


def _select_side_representative(frames, pose, pose_dir):
    detector = FaceLandmarkDetector()
    candidates = []
    fallback_candidates = []
    previous_frame = None

    try:
        for index, (frame_path, frame) in enumerate(frames):
            landmarks = detector.detect(frame)
            fallback_candidates.append(
                {
                    "index": index,
                    "path": frame_path,
                    "frame": frame,
                    "metrics": _side_pose_fallback_metrics(frame, previous_frame),
                }
            )
            if landmarks is None:
                previous_frame = frame
                continue

            metrics = _side_pose_metrics(frame, landmarks, pose, previous_frame)
            previous_frame = frame
            if metrics is None:
                continue

            candidates.append(
                {
                    "index": index,
                    "path": frame_path,
                    "frame": frame,
                    "metrics": metrics,
                }
            )
    finally:
        detector.close()

    if not candidates:
        candidates = fallback_candidates
        selection_mode = "imageQualityFallback"
    else:
        selection_mode = "landmarkPose"

    last_index = max(len(frames) - 1, 1)

    if selection_mode == "landmarkPose":
        metric_values = {
            key: [candidate["metrics"][key] for candidate in candidates]
            for key in ["directionStrength", "eyeTilt", "sharpness", "stability"]
        }

        for candidate in candidates:
            metrics = candidate["metrics"]
            temporal_position = candidate["index"] / last_index
            middle_frame_score = 1.0 - abs(temporal_position - 0.5) * 2
            candidate["score"] = round(
                _normalize_metric(
                    metrics["directionStrength"],
                    metric_values["directionStrength"],
                )
                * 0.46
                + _normalize_metric(
                    metrics["eyeTilt"],
                    metric_values["eyeTilt"],
                    higher_is_better=False,
                )
                * 0.12
                + _normalize_metric(metrics["sharpness"], metric_values["sharpness"]) * 0.18
                + _normalize_metric(metrics["stability"], metric_values["stability"]) * 0.16
                + middle_frame_score * 0.08,
                4,
            )
    else:
        metric_values = {
            key: [candidate["metrics"][key] for candidate in candidates]
            for key in ["sharpness", "stability"]
        }

        for candidate in candidates:
            metrics = candidate["metrics"]
            temporal_position = candidate["index"] / last_index
            middle_frame_score = 1.0 - abs(temporal_position - 0.5) * 2
            candidate["score"] = round(
                _normalize_metric(metrics["sharpness"], metric_values["sharpness"]) * 0.42
                + _normalize_metric(metrics["stability"], metric_values["stability"]) * 0.34
                + middle_frame_score * 0.24,
                4,
            )

    representative = max(candidates, key=lambda item: item["score"])
    representative_path = pose_dir / "representative.jpg"
    cv2.imwrite(str(representative_path), representative["frame"])
    stale_result_path = pose_dir / "result.json"
    if stale_result_path.exists():
        stale_result_path.unlink()

    result = {
        "pose": pose,
        "analysisSkipped": True,
        "validFrameCount": len(candidates),
        "representativeScore": representative["score"],
        "representativeIndex": representative["index"],
        "selectionMode": selection_mode,
    }

    return result, representative_path, None, len(candidates)


def _analyze_pose(frames, pose, pose_dir, *, has_makeup=False, makeup_input_missing=False):
    if pose in ["left", "right"]:
        return _select_side_representative(frames, pose, pose_dir)

    detector = FaceLandmarkDetector()
    samples = []
    stable_frames = []

    try:
        for frame_path, frame in frames:
            landmarks = detector.detect(frame)
            if landmarks is None or not _is_usable_frame(frame, landmarks):
                continue

            try:
                sample = _build_sample(
                    frame,
                    landmarks,
                    has_makeup=has_makeup,
                    makeup_input_missing=makeup_input_missing,
                )
            except (ValueError, KeyError):
                continue

            samples.append(sample)
            stable_frames.append(
                {
                    "path": frame_path,
                    "frame": frame,
                    "score": _quality_score(frame, landmarks),
                }
            )
    finally:
        detector.close()

    if not samples:
        raise HTTPException(
            status_code=422,
            detail="No stable face frames detected. Try facing forward with eyes open and better lighting.",
        )

    result = _aggregate_results(samples)
    representative = max(stable_frames, key=lambda item: item["score"])
    representative_path = pose_dir / "representative.jpg"
    cv2.imwrite(str(representative_path), representative["frame"])
    result_path = save_result(result, output_dir=pose_dir, filename="result.json")

    return result, representative_path, result_path, len(samples)


def _merge_final_result(session_dir):
    final_result = {"sessionId": session_dir.name}
    representative_images = {}

    front_dir = session_dir / "front"
    front_result_path = front_dir / "result.json"
    if not front_result_path.exists():
        raise HTTPException(
            status_code=400,
            detail="Missing completed capture data for pose: front",
        )

    with front_result_path.open("r", encoding="utf-8") as file:
        final_result["front"] = json.load(file)

    representative_path = session_dir / "front" / "representative.jpg"
    if not representative_path.exists():
        raise HTTPException(
            status_code=400,
            detail="Missing representative image for pose: front",
        )

    representative_images["front"] = _json_safe_path(representative_path)

    final_path = session_dir / "final_result.json"
    with final_path.open("w", encoding="utf-8") as file:
        json.dump(final_result, file, indent=2, ensure_ascii=False)

    recommendation_path = run_recommendation_for_session(session_dir, final_result)
    with recommendation_path.open("r", encoding="utf-8") as file:
        recommendation_result = json.load(file)

    return final_result, representative_images, recommendation_path, recommendation_result


def _find_latest_complete_session_dir():
    if not SESSION_ROOT.exists():
        return None

    session_dirs = sorted(
        [path for path in SESSION_ROOT.iterdir() if path.is_dir()],
        key=lambda path: path.name,
        reverse=True,
    )
    for session_dir in session_dirs:
        front_result_path = session_dir / "front" / "result.json"
        representative_path = session_dir / "front" / "representative.jpg"
        if front_result_path.exists() and representative_path.exists():
            return session_dir

    return None


def _find_latest_session_with_recommendation():
    if not SESSION_ROOT.exists():
        return None

    session_dirs = sorted(
        [path for path in SESSION_ROOT.iterdir() if path.is_dir()],
        key=lambda path: path.name,
        reverse=True,
    )
    for session_dir in session_dirs:
        recommendation_path = session_dir / "recommendation_result.json"
        if recommendation_path.exists():
            return session_dir

    return None


def _find_latest_session_with_final_selection():
    if not SESSION_ROOT.exists():
        return None

    session_dirs = sorted(
        [path for path in SESSION_ROOT.iterdir() if path.is_dir()],
        key=lambda path: path.name,
        reverse=True,
    )
    for session_dir in session_dirs:
        final_selection_path = session_dir / "final_selection.json"
        if final_selection_path.exists():
            return session_dir

    return None


def _ensure_path_inside(parent: Path, child: Path):
    parent_resolved = parent.resolve()
    child_resolved = child.resolve()
    try:
        child_resolved.relative_to(parent_resolved)
    except ValueError as error:
        raise HTTPException(status_code=500, detail="Unsafe session path detected.") from error
    return child_resolved


def _prune_old_session_dirs(keep: int = 5):
    keep_count = max(int(keep), 0)
    if not SESSION_ROOT.exists():
        return {
            "kept": [],
            "deleted": [],
            "totalBefore": 0,
            "totalAfter": 0,
        }

    session_dirs = sorted(
        [
            path
            for path in SESSION_ROOT.iterdir()
            if path.is_dir() and path.name.startswith("session_")
        ],
        key=lambda path: path.name,
        reverse=True,
    )
    kept_dirs = session_dirs[:keep_count]
    delete_dirs = session_dirs[keep_count:]
    deleted = []

    for session_dir in delete_dirs:
        safe_path = _ensure_path_inside(SESSION_ROOT, session_dir)
        shutil.rmtree(safe_path)
        deleted.append(session_dir.name)

    return {
        "kept": [path.name for path in kept_dirs],
        "deleted": deleted,
        "totalBefore": len(session_dirs),
        "totalAfter": len(kept_dirs),
    }


def _resolve_session_for_final_selection(session_id: str | None):
    if session_id:
      session_dir = _session_dir(session_id)
      if not session_dir.exists():
          raise HTTPException(status_code=404, detail="Session folder not found.")
      return session_dir

    session_dir = _find_latest_session_with_recommendation()
    if session_dir is None:
        raise HTTPException(
            status_code=404,
            detail="No session with recommendation_result.json found.",
        )

    return session_dir


def _load_json_file(path: Path, missing_detail: str):
    if not path.exists():
        raise HTTPException(status_code=404, detail=missing_detail)

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _load_noir_color_db_products():
    data = _load_json_file(NOIR_COLOR_DB_PATH, "noir_color_db.json not found.")
    return data.get("products", [])


def _extract_first(value):
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _pick_user_analysis(recommendation_result: dict):
    return (
        recommendation_result.get("recommendation", {}).get("userAnalysis")
        or recommendation_result.get("data", {}).get("userAnalysis")
        or recommendation_result.get("userAnalysis")
        or {}
    )


def _pick_recommendations(recommendation_result: dict):
    return (
        recommendation_result.get("recommendedProducts")
        or recommendation_result.get("recommendations")
        or recommendation_result.get("finalRecommendations")
        or recommendation_result
        or {}
    )


def _find_matching_product(products: list[dict], target: str, selected: dict):
    product_type = "blush" if target == "blush" else "lip"
    selected_id = selected.get("id")
    selected_display_id = str(selected.get("displayID") or "").lstrip("0")
    selected_name = str(selected.get("name") or selected.get("displayName") or "").lower()

    for product in products:
        if product.get("productType") != product_type:
            continue
        if selected_id is not None and str(product.get("id")) == str(selected_id):
            return product
        if selected_display_id and str(product.get("displayID") or "").lstrip("0") == selected_display_id:
            return product
        if selected_name and selected_name in {
            str(product.get("name") or "").lower(),
            str(product.get("displayName") or "").lower(),
        }:
            return product

    return {}


def _complete_selected_product(products: list[dict], target: str, selected: dict):
    db_product = _find_matching_product(products, target, selected)
    if db_product:
        return db_product

    # Fallback keeps the API usable if the color DB is missing a product entry.
    return {
        "id": selected.get("id"),
        "name": selected.get("name"),
        "displayName": selected.get("displayName"),
        "displayID": selected.get("displayID"),
        "hex": selected.get("hex"),
        "rgb": selected.get("rgb"),
        "productType": target,
    }


def _build_mobile_result_url(request: Request, session_id: str, mobile_origin: str | None = None):
    if mobile_origin:
        return f"{mobile_origin.rstrip('/')}/result/{session_id}"

    configured_origin = request.app.extra.get("mobile_result_origin")
    if configured_origin:
        return f"{configured_origin.rstrip('/')}/result/{session_id}"

    host_header = request.headers.get("host", "127.0.0.1:8000")
    host = host_header.split(":")[0]
    return f"{request.url.scheme}://{host}:5174/result/{session_id}"


def _write_final_selection(session_dir: Path, selected: dict):
    recommendation_path = session_dir / "recommendation_result.json"
    recommendation_result = _load_json_file(
        recommendation_path,
        "recommendation_result.json not found for this session.",
    )

    selected_blush = selected.get("blush")
    selected_lip = selected.get("lip")
    if not selected_blush or not selected_lip:
        raise HTTPException(status_code=400, detail="selected.blush and selected.lip are required.")

    products = _load_noir_color_db_products()
    recommendations = _pick_recommendations(recommendation_result)
    eye_palette = _extract_first(
        recommendations.get("eye_palette")
        or recommendations.get("eyePalette")
        or recommendation_result.get("eye_palette")
        or recommendation_result.get("eyePalette"),
    )

    final_selection = {
        "sessionId": session_dir.name,
        "createdAt": datetime.utcnow().isoformat(timespec="milliseconds") + "Z",
        "source": {
            "recommendationFile": "recommendation_result.json",
            "selectedBy": "client-tablet",
        },
        "userAnalysis": _pick_user_analysis(recommendation_result),
        "finalSelection": {
            "lip": _complete_selected_product(products, "lip", selected_lip),
            "blush": _complete_selected_product(products, "blush", selected_blush),
            "eyePalette": eye_palette or {},
        },
    }

    final_selection_path = session_dir / "final_selection.json"
    with final_selection_path.open("w", encoding="utf-8") as file:
        json.dump(final_selection, file, indent=2, ensure_ascii=False)

    return final_selection_path, final_selection


@app.post("/api/capture/analyze")
async def analyze_capture(
    pose: Pose = Form(...),
    sessionId: str | None = Form(None),
    hasMakeup: bool | None = Form(None),
    frames: list[UploadFile] = File(...),
):
    if not frames:
        raise HTTPException(status_code=400, detail="At least one frame is required.")

    session_id = sessionId or _new_session_id()
    pose_dir = _session_dir(session_id) / pose
    frames_dir = pose_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    decoded_frames = []
    for index, upload in enumerate(frames):
        data = await upload.read()
        try:
            frame = _decode_image(data)
        except ValueError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

        frame_path = frames_dir / f"frame_{index:04d}.jpg"
        cv2.imwrite(str(frame_path), frame)
        decoded_frames.append((frame_path, frame))

    result, representative_path, _, valid_count = _analyze_pose(
        decoded_frames,
        pose,
        pose_dir,
        has_makeup=bool(hasMakeup),
        makeup_input_missing=hasMakeup is None,
    )
    representative_image_path = _json_safe_path(representative_path)

    return {
        "sessionId": session_id,
        "pose": pose,
        "validFrameCount": valid_count,
        "representativeImage": representative_image_path,
        "result": result,
    }


@app.post("/api/capture/finalize")
async def finalize_capture(payload: dict, request: Request):
    session_id = payload.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="sessionId is required.")

    session_dir = _session_dir(session_id)
    final_result, images, recommendation_path, recommendation_result = _merge_final_result(
        session_dir,
    )
    representative_path = session_dir / "front" / "representative.jpg"
    representative_image_url = _public_file_url(request, representative_path)
    image_ready_payload = {
        "event": "capture_image_ready",
        "sessionId": session_id,
        "pose": "front",
        "imagePath": images["front"],
        "imageUrl": representative_image_url,
    }
    print("[socket] capture:image-ready", image_ready_payload)
    await emit_touchdesigner_event(
        "touchdesigner:capture-image-ready",
        image_ready_payload,
    )

    return {
        "sessionId": session_id,
        "frontImage": images["front"],
        "frontImageUrl": representative_image_url,
        "finalResult": final_result,
        "recommendationPath": _json_safe_path(recommendation_path),
        "recommendationResult": recommendation_result,
    }


@app.get("/api/sessions/latest/recommendation")
async def get_latest_session_recommendation():
    session_dir = _find_latest_session_with_recommendation()
    if session_dir is None:
        raise HTTPException(
            status_code=404,
            detail="No session with recommendation_result.json found.",
        )

    recommendation_path = session_dir / "recommendation_result.json"
    with recommendation_path.open("r", encoding="utf-8") as file:
        recommendation_result = json.load(file)

    return {
        "sessionId": session_dir.name,
        "recommendationPath": _json_safe_path(recommendation_path),
        "recommendationResult": recommendation_result,
    }


@app.post("/api/sessions/prune")
async def prune_old_sessions(keep: int = 5):
    result = _prune_old_session_dirs(keep=keep)
    return {
        "ok": True,
        "keep": keep,
        **result,
    }


@app.get("/api/capture/latest")
async def latest_capture():
    session_dir = _find_latest_complete_session_dir()
    if session_dir is None:
        raise HTTPException(status_code=404, detail="No completed capture session found.")

    final_result, images, recommendation_path, recommendation_result = _merge_final_result(
        session_dir,
    )

    return {
        "sessionId": session_dir.name,
        "frontImage": images["front"],
        "finalResult": final_result,
        "recommendationPath": _json_safe_path(recommendation_path),
        "recommendationResult": recommendation_result,
    }


@app.get("/api/capture/{session_id}/recommendation")
async def get_session_recommendation(session_id: str):
    recommendation_path = _session_dir(session_id) / "recommendation_result.json"
    if not recommendation_path.exists():
        raise HTTPException(
            status_code=404,
            detail="recommendation_result.json not found for this session.",
        )

    with recommendation_path.open("r", encoding="utf-8") as file:
        return json.load(file)


@app.post("/api/tablet/final-selection")
async def save_tablet_final_selection(payload: dict, request: Request):
    session_dir = _resolve_session_for_final_selection(payload.get("sessionId"))
    selected = payload.get("selected") or {}
    final_selection_path, _ = _write_final_selection(session_dir, selected)
    mobile_result_url = _build_mobile_result_url(
        request,
        session_dir.name,
        payload.get("mobileOrigin"),
    )

    return {
        "ok": True,
        "sessionId": session_dir.name,
        "finalSelectionPath": _json_safe_path(final_selection_path),
        "mobileResultUrl": mobile_result_url,
    }


SENSOR_REGION_MAP = {
    1: "blush_left",
    2: "blush_right",
    3: "lips",
}


@app.get("/api/touchdesigner/sensor")
async def receive_touchdesigner_sensor(id: int, value: int = 1):
    if id not in SENSOR_REGION_MAP:
        raise HTTPException(
            status_code=400,
            detail="Unknown sensor id. Use 1=blush_left, 2=blush_right, 3=lips.",
        )

    normalized_value = 1 if int(value) else 0
    payload = {
        "event": "sensor_triggered",
        "sensor": id,
        "value": normalized_value,
        "region": SENSOR_REGION_MAP[id],
    }

    print("[socket] touchdesigner:sensor", payload)
    await emit_touchdesigner_event("touchdesigner:sensor-triggered", payload)

    return {
        "ok": True,
        **payload,
    }


@app.get("/api/mobile/final-selection/latest")
async def get_latest_mobile_final_selection():
    session_dir = _find_latest_session_with_final_selection()
    if session_dir is None:
        raise HTTPException(status_code=404, detail="No final_selection.json found.")

    final_selection_path = session_dir / "final_selection.json"
    return _load_json_file(final_selection_path, "final_selection.json not found.")


@app.get("/api/mobile/final-selection/{session_id}")
async def get_mobile_final_selection(session_id: str):
    final_selection_path = _session_dir(session_id) / "final_selection.json"
    return _load_json_file(final_selection_path, "final_selection.json not found for this session.")


@app.websocket("/")
@app.websocket("/ws")
@app.websocket("/ws/")
@app.websocket("/ws/touchdesigner")
async def touchdesigner_websocket(websocket: WebSocket):
    await connect_touchdesigner(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        disconnect_touchdesigner(websocket)


asgi_app = socketio.ASGIApp(sio, app)

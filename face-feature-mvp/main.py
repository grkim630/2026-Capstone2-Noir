import argparse
import math
from collections import Counter

import numpy as np

from modules.color_extractor import extract_colors, rgb_to_hex
from modules.feature_calculator import calculate_features
from modules.json_saver import save_result
from modules.landmark import FaceLandmarkDetector, normalized_to_pixel
from modules.skin_analysis import analyze_skin_color
from modules.webcam import capture_frames


COLOR_KEYS = [
    "skinColor",
    "lipColor",
    "cheekColor",
    "foreheadColor",
    "eyeAreaColor",
    "irisColor",
]


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


def _is_usable_frame(frame, landmarks):
    left_eye_outer = normalized_to_pixel(landmarks[33], frame.shape)
    right_eye_outer = normalized_to_pixel(landmarks[263], frame.shape)
    left_face = normalized_to_pixel(landmarks[127], frame.shape)
    right_face = normalized_to_pixel(landmarks[356], frame.shape)
    face_width = _distance(left_face, right_face)

    if not face_width:
        return False

    eye_tilt = abs(left_eye_outer[1] - right_eye_outer[1]) / face_width
    if eye_tilt > 0.08:
        return False

    left_openness = _eye_openness(landmarks, frame.shape, 33, 133, 159, 145)
    right_openness = _eye_openness(landmarks, frame.shape, 362, 263, 386, 374)
    return ((left_openness + right_openness) / 2) >= 0.12


def _aggregate_color(samples, key):
    rgb_values = [sample[key]["rgb"] for sample in samples]
    rgb = np.median(rgb_values, axis=0).astype(int).tolist()
    result = {"rgb": rgb, "hex": rgb_to_hex(rgb)}

    if key == "foreheadColor":
        result.update(
            {
                "source": _mode([sample[key].get("source", "detected") for sample in samples]),
                "coverage": round(
                    float(np.median([sample[key].get("coverage", 1.0) for sample in samples])),
                    4,
                ),
                "occluded": _mode([bool(sample[key].get("occluded", False)) for sample in samples]),
                "confidence": _mode([sample[key].get("confidence", "medium") for sample in samples]),
                "reason": _mode([sample[key].get("reason") for sample in samples]),
            }
        )

    for metadata_key in ("makeupInfluenced",):
        values = [sample[key].get(metadata_key) for sample in samples if metadata_key in sample[key]]
        if values:
            result[metadata_key] = _mode(values)

    return result


def _aggregate_features(samples):
    feature_keys = samples[0]["features"].keys()
    features = {}

    for key in feature_keys:
        values = [sample["features"][key] for sample in samples]
        if isinstance(values[0], str):
            features[key] = Counter(values).most_common(1)[0][0]
        else:
            features[key] = round(float(np.median(values)), 4)

    return features


def _mode(values):
    return Counter(values).most_common(1)[0][0]


def _median_mapping(samples, parent_key, child_key):
    keys = samples[0][parent_key][child_key].keys()
    return {
        key: round(
            float(np.median([sample[parent_key][child_key][key] for sample in samples])),
            4,
        )
        for key in keys
    }


def _aggregate_skin_analysis(samples):
    dominant_rgb = np.median(
        [sample["skinAnalysis"]["dominantRGB"] for sample in samples],
        axis=0,
    ).astype(int).tolist()
    tone_keys = samples[0]["skinAnalysis"]["tone"].keys()

    return {
        "dominantRGB": dominant_rgb,
        "hex": rgb_to_hex(dominant_rgb),
        "LAB": _median_mapping(samples, "skinAnalysis", "LAB"),
        "HSV": _median_mapping(samples, "skinAnalysis", "HSV"),
        "melanin": _mode([sample["skinAnalysis"]["melanin"] for sample in samples]),
        "redness": _mode([sample["skinAnalysis"]["redness"] for sample in samples]),
        "tone": {
            key: _mode([sample["skinAnalysis"]["tone"][key] for sample in samples])
            for key in tone_keys
        },
        "metrics": _median_mapping(samples, "skinAnalysis", "metrics"),
        "skinBaseColor": _aggregate_skin_base_color(samples),
        "makeup": _aggregate_makeup(samples, parent_key="skinAnalysis"),
    }


def _aggregate_skin_base_color(samples):
    values = []
    for sample in samples:
        skin_base = sample.get("skinBaseColor") or sample.get("skinAnalysis", {}).get("skinBaseColor")
        if skin_base and skin_base.get("rgb"):
            values.append(skin_base["rgb"])

    if not values:
        values = [sample["skinAnalysis"]["dominantRGB"] for sample in samples]

    rgb = np.median(values, axis=0).astype(int).tolist()
    return {
        "rgb": rgb,
        "hex": rgb_to_hex(rgb),
        "source": "current_face_base_tone",
        "confidence": _mode(
            [
                (sample.get("skinBaseColor") or sample.get("skinAnalysis", {}).get("skinBaseColor") or {}).get(
                    "confidence",
                    "medium",
                )
                for sample in samples
            ]
        ),
        "description": "Base facial tone from the current captured face, not a bare-skin restoration.",
    }


def _aggregate_makeup(samples, parent_key=None):
    records = []
    for sample in samples:
        container = sample.get(parent_key, {}) if parent_key else sample
        record = container.get("makeup")
        if record:
            records.append(record)

    if not records:
        return {
            "hasMakeup": False,
            "source": "intro_user_input",
            "inputMissing": True,
            "compensationApplied": False,
            "method": "color_makeup_region_weight_adjustment",
        }

    has_makeup = _mode([bool(record.get("hasMakeup", False)) for record in records])
    return {
        "hasMakeup": has_makeup,
        "source": _mode([record.get("source", "intro_user_input") for record in records]),
        "inputMissing": _mode([bool(record.get("inputMissing", False)) for record in records]),
        "compensationApplied": _mode(
            [bool(record.get("compensationApplied", has_makeup)) for record in records]
        ),
        "method": _mode(
            [record.get("method", "color_makeup_region_weight_adjustment") for record in records]
        ),
        "note": records[0].get("note"),
    }


def _aggregate_quality(samples):
    records = [sample.get("quality", {}) for sample in samples if sample.get("quality")]
    if not records:
        return {}

    coverage_values = [
        record.get("foreheadCoverage")
        for record in records
        if isinstance(record.get("foreheadCoverage"), (int, float))
    ]

    return {
        "hasMakeup": _mode([bool(record.get("hasMakeup", False)) for record in records]),
        "makeupInputSource": _mode(
            [record.get("makeupInputSource", "intro_user_input") for record in records]
        ),
        "makeupInputMissing": _mode(
            [bool(record.get("makeupInputMissing", False)) for record in records]
        ),
        "foreheadOccluded": _mode(
            [bool(record.get("foreheadOccluded", False)) for record in records]
        ),
        "foreheadColorSource": _mode(
            [record.get("foreheadColorSource", "detected") for record in records]
        ),
        "foreheadCoverage": round(float(np.median(coverage_values)), 4) if coverage_values else None,
        "skinBaseConfidence": _mode(
            [record.get("skinBaseConfidence", "medium") for record in records]
        ),
    }


def _aggregate_personal_color(samples):
    keys = samples[0]["personalColor"].keys()
    return {
        key: _mode([sample["personalColor"][key] for sample in samples])
        for key in keys
    }


def _aggregate_results(samples):
    result = {key: _aggregate_color(samples, key) for key in COLOR_KEYS}
    result["skinAnalysis"] = _aggregate_skin_analysis(samples)
    result["personalColor"] = _aggregate_personal_color(samples)
    result["features"] = _aggregate_features(samples)
    result["skinBaseColor"] = _aggregate_skin_base_color(samples)
    result["makeup"] = _aggregate_makeup(samples)
    result["quality"] = _aggregate_quality(samples)
    return result


def run_pipeline(camera_index=0, output_dir="outputs", duration_seconds=3.0):
    frames = capture_frames(
        camera_index=camera_index,
        duration_seconds=duration_seconds,
    )
    detector = FaceLandmarkDetector()
    samples = []

    try:
        for frame in frames:
            landmarks = detector.detect(frame)
            if landmarks is None or not _is_usable_frame(frame, landmarks):
                continue

            try:
                analysis_result = analyze_skin_color(frame, landmarks)
            except ValueError:
                continue

            skin_analysis = analysis_result["skinAnalysis"]
            colors = extract_colors(frame, landmarks)
            features = calculate_features(frame, landmarks)
            colors["skinColor"] = {
                "rgb": skin_analysis["dominantRGB"],
                "hex": skin_analysis["hex"],
            }
            sample = {key: colors[key] for key in COLOR_KEYS}
            sample["skinAnalysis"] = skin_analysis
            sample["personalColor"] = analysis_result["personalColor"]
            sample["features"] = features
            samples.append(sample)
    finally:
        detector.close()

    if not samples:
        raise RuntimeError(
            "No stable face frames detected. Try facing forward with eyes open and better lighting."
        )

    result = _aggregate_results(samples)
    return save_result(result, output_dir=output_dir)


def parse_args():
    parser = argparse.ArgumentParser(description="Face feature MVP extractor")
    parser.add_argument("--camera", type=int, default=0, help="Webcam index")
    parser.add_argument(
        "--duration",
        type=float,
        default=3.0,
        help="Seconds to collect frames for median stabilization",
    )
    parser.add_argument("--output-dir", default="outputs", help="JSON output directory")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    saved_path = run_pipeline(
        camera_index=args.camera,
        output_dir=args.output_dir,
        duration_seconds=args.duration,
    )
    print(f"Saved result to: {saved_path}")

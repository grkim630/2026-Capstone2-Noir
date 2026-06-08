import argparse
from pathlib import Path

import cv2

from main import COLOR_KEYS, _aggregate_results, _is_usable_frame
from modules.color_extractor import extract_colors
from modules.feature_calculator import calculate_features
from modules.json_saver import save_result
from modules.landmark import FaceLandmarkDetector
from modules.skin_analysis import analyze_skin_color


IMAGE_EXTENSIONS = {".bmp", ".jpeg", ".jpg", ".png", ".webp"}
VIDEO_EXTENSIONS = {".avi", ".m4v", ".mkv", ".mov", ".mp4", ".webm", ".wmv"}
PROJECT_DIR = Path(__file__).resolve().parent
DEFAULT_SAMPLE_DIR = PROJECT_DIR / "samples"


def _media_type(path, requested_type):
    if requested_type != "auto":
        return requested_type

    suffix = path.suffix.lower()
    if suffix in IMAGE_EXTENSIONS:
        return "image"
    if suffix in VIDEO_EXTENSIONS:
        return "video"

    raise ValueError(
        f"Unsupported input extension '{suffix}'. Use --type image or --type video."
    )


def _resolve_input_path(input_path, sample_dir=DEFAULT_SAMPLE_DIR):
    path = Path(input_path)
    if path.exists() or path.is_absolute():
        return path

    sample_path = Path(sample_dir) / path
    if sample_path.exists():
        return sample_path

    return path


def _build_sample(frame, landmarks):
    analysis_result = analyze_skin_color(frame, landmarks)
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
    return sample


def _sample_frame(frame, detector, allow_unstable=False):
    landmarks = detector.detect(frame)
    if landmarks is None:
        return None
    if not allow_unstable and not _is_usable_frame(frame, landmarks):
        return None

    try:
        return _build_sample(frame, landmarks)
    except ValueError:
        return None


def _run_image(path, detector, allow_unstable=False):
    frame = cv2.imread(str(path))
    if frame is None:
        raise RuntimeError(f"Could not read image: {path}")

    sample = _sample_frame(frame, detector, allow_unstable=allow_unstable)
    if sample is None:
        raise RuntimeError(
            "No usable face was detected in the image. Try a clearer frontal face, "
            "or pass --allow-unstable for testing."
        )

    return [sample]


def _run_video(
    path,
    detector,
    allow_unstable=False,
    max_frames=60,
    sample_step=5,
    start_seconds=0.0,
    duration_seconds=None,
):
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {path}")

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    start_frame = max(int(start_seconds * fps), 0)
    sample_step = max(int(sample_step), 1)
    samples = []

    if start_frame:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    frame_index = start_frame

    try:
        while len(samples) < max_frames:
            ok, frame = cap.read()
            if not ok:
                break

            elapsed = (frame_index - start_frame) / fps
            if duration_seconds is not None and elapsed > duration_seconds:
                break

            if (frame_index - start_frame) % sample_step == 0:
                sample = _sample_frame(
                    frame,
                    detector,
                    allow_unstable=allow_unstable,
                )
                if sample is not None:
                    samples.append(sample)

            frame_index += 1
    finally:
        cap.release()

    if not samples:
        raise RuntimeError(
            "No usable face frames were detected in the video. Try a clearer frontal "
            "section, adjust --start/--duration, or pass --allow-unstable for testing."
        )

    return samples


def run_from_file(
    input_path,
    input_type="auto",
    output_dir="outputs",
    sample_dir=DEFAULT_SAMPLE_DIR,
    allow_unstable=False,
    max_frames=60,
    sample_step=5,
    start_seconds=0.0,
    duration_seconds=None,
):
    path = _resolve_input_path(input_path, sample_dir=sample_dir)
    if not path.exists():
        raise FileNotFoundError(f"Input file does not exist: {path}")

    media_type = _media_type(path, input_type)
    detector = FaceLandmarkDetector()

    try:
        if media_type == "image":
            samples = _run_image(path, detector, allow_unstable=allow_unstable)
        else:
            samples = _run_video(
                path,
                detector,
                allow_unstable=allow_unstable,
                max_frames=max_frames,
                sample_step=sample_step,
                start_seconds=start_seconds,
                duration_seconds=duration_seconds,
            )
    finally:
        detector.close()

    result = _aggregate_results(samples)
    return save_result(result, output_dir=output_dir)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Extract face feature JSON from an image or video file."
    )
    parser.add_argument(
        "input",
        help="Image or video filename inside samples, or a direct file path.",
    )
    parser.add_argument(
        "--type",
        choices=["auto", "image", "video"],
        default="auto",
        help="Input type. Defaults to extension-based auto detection.",
    )
    parser.add_argument("--output-dir", default="outputs", help="JSON output directory")
    parser.add_argument(
        "--sample-dir",
        default=str(DEFAULT_SAMPLE_DIR),
        help="Directory to search when input is only a filename.",
    )
    parser.add_argument(
        "--allow-unstable",
        action="store_true",
        help="Skip frontal-face and eye-open checks for test fixtures.",
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=60,
        help="Maximum usable video frames to aggregate.",
    )
    parser.add_argument(
        "--sample-step",
        type=int,
        default=5,
        help="Process every Nth video frame.",
    )
    parser.add_argument(
        "--start",
        type=float,
        default=0.0,
        help="Video start offset in seconds.",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=None,
        help="Optional video duration in seconds from --start.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    saved_path = run_from_file(
        input_path=args.input,
        input_type=args.type,
        output_dir=args.output_dir,
        sample_dir=args.sample_dir,
        allow_unstable=args.allow_unstable,
        max_frames=args.max_frames,
        sample_step=args.sample_step,
        start_seconds=args.start,
        duration_seconds=args.duration,
    )
    print(f"Saved result to: {saved_path}")

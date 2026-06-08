import cv2
import numpy as np

from modules.landmark import normalized_to_pixel
from modules.skin_cluster import dominant_skin_rgb


LEFT_CHEEK_CENTER = 205
RIGHT_CHEEK_CENTER = 425
FOREHEAD_POINTS = [10, 67, 297, 109, 338]
EXTENDED_FOREHEAD_POINTS = [109, 10, 338, 297, 332, 9, 103, 67]
LEFT_EYE_POINTS = [33, 133, 159, 145]
RIGHT_EYE_POINTS = [362, 263, 386, 374]
LEFT_EYE_CENTER_POINTS = [33, 133]
RIGHT_EYE_CENTER_POINTS = [362, 263]
RIGHT_IRIS_POINTS = [469, 470, 471, 472]
LEFT_IRIS_POINTS = [474, 475, 476, 477]
MIN_COLOR_PIXELS = 20
MIN_IRIS_PIXELS = 10
IRIS_INNER_RADIUS_RATIO = 0.35
IRIS_OUTER_RADIUS_RATIO = 0.85
IRIS_DARK_PERCENTILE = 30
OUTER_LIP_POINTS = [
    61,
    185,
    40,
    39,
    37,
    0,
    267,
    269,
    270,
    409,
    291,
    375,
    321,
    405,
    314,
    17,
    84,
    181,
    91,
    146,
]


def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def _points_from_landmarks(landmarks, indices, frame_shape):
    return np.array(
        [normalized_to_pixel(landmarks[index], frame_shape) for index in indices],
        dtype=np.int32,
    )


def _polygon_mask(frame_shape, landmarks, indices):
    mask = np.zeros(frame_shape[:2], dtype=np.uint8)
    points = _points_from_landmarks(landmarks, indices, frame_shape)
    cv2.fillPoly(mask, [points], 255)
    return mask


def _ellipse_mask(frame_shape, center, axes):
    mask = np.zeros(frame_shape[:2], dtype=np.uint8)
    cv2.ellipse(mask, center, axes, 0, 0, 360, 255, -1)
    return mask


def _average_color_results(color_results):
    rgb = np.mean([color["rgb"] for color in color_results], axis=0).astype(int).tolist()
    return {"rgb": rgb, "hex": rgb_to_hex(rgb)}


def _pixels_to_color(pixels):
    rgb = np.median(pixels, axis=0).astype(int).tolist()
    return {"rgb": rgb, "hex": rgb_to_hex(rgb)}


def _erode_mask(mask, kernel_size=3):
    if np.count_nonzero(mask) < MIN_COLOR_PIXELS:
        return mask

    kernel = np.ones((kernel_size, kernel_size), dtype=np.uint8)
    eroded = cv2.erode(mask, kernel, iterations=1)
    if np.count_nonzero(eroded) < MIN_COLOR_PIXELS:
        return mask

    return eroded


def _trim_brightness_outliers(pixels, low_percentile=12, high_percentile=97):
    pixel_block = pixels.reshape(-1, 1, 3).astype(np.uint8)
    hsv = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2HSV).reshape(-1, 3)
    value = hsv[:, 2].astype(np.float32)
    low = np.percentile(value, low_percentile)
    high = np.percentile(value, high_percentile)
    keep_mask = (value >= low) & (value <= high)
    filtered = pixels[keep_mask]

    if len(filtered) < MIN_COLOR_PIXELS:
        return pixels

    return filtered


def _skin_like_pixels(pixels):
    pixel_block = pixels.reshape(-1, 1, 3).astype(np.uint8)
    hsv = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2HSV).reshape(-1, 3)
    ycrcb = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2YCrCb).reshape(-1, 3)

    saturation = hsv[:, 1] / 255
    value = hsv[:, 2] / 255
    cr = ycrcb[:, 1]
    cb = ycrcb[:, 2]

    keep_mask = (
        (value >= 0.24)
        & (saturation >= 0.04)
        & (saturation <= 0.72)
        & (cr >= 130)
        & (cr <= 180)
        & (cb >= 75)
        & (cb <= 145)
    )
    filtered = pixels[keep_mask]

    if len(filtered) < MIN_COLOR_PIXELS:
        return pixels

    return filtered


def _skin_like_pixel_mask(pixels):
    pixel_block = pixels.reshape(-1, 1, 3).astype(np.uint8)
    hsv = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2HSV).reshape(-1, 3)
    ycrcb = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2YCrCb).reshape(-1, 3)

    saturation = hsv[:, 1] / 255
    value = hsv[:, 2] / 255
    cr = ycrcb[:, 1]
    cb = ycrcb[:, 2]

    return (
        (value >= 0.24)
        & (saturation >= 0.04)
        & (saturation <= 0.72)
        & (cr >= 130)
        & (cr <= 180)
        & (cb >= 75)
        & (cb <= 145)
    )


def _filter_color_pixels(pixels, mode):
    if mode == "lip":
        filtered = _trim_brightness_outliers(
            pixels,
            low_percentile=30,
            high_percentile=98,
        )
    else:
        filtered = _trim_brightness_outliers(pixels)

    if mode in ("skin", "eye_area"):
        filtered = _skin_like_pixels(filtered)

    return filtered


def _representative_color(pixels, mode="generic"):
    if len(pixels) < 3:
        return _pixels_to_color(pixels)

    if mode == "lip":
        return _pixels_to_color(pixels)

    try:
        rgb = dominant_skin_rgb(pixels, k=3, max_samples=5000)
    except ValueError:
        rgb = np.median(pixels, axis=0).astype(int).tolist()

    return {"rgb": rgb, "hex": rgb_to_hex(rgb)}


def _mask_to_color(frame_bgr, mask, mode="generic"):
    mask = _erode_mask(mask, kernel_size=5 if mode == "lip" else 3)
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pixels = frame_rgb[mask == 255]
    if pixels.size == 0:
        raise ValueError("No pixels were sampled for color extraction.")

    filtered = _filter_color_pixels(pixels, mode)
    return _representative_color(filtered, mode=mode)


def _crop_and_scale(frame_bgr, points, padding=8, scale=4):
    height, width = frame_bgr.shape[:2]
    x_min = max(int(np.min(points[:, 0])) - padding, 0)
    y_min = max(int(np.min(points[:, 1])) - padding, 0)
    x_max = min(int(np.max(points[:, 0])) + padding, width - 1)
    y_max = min(int(np.max(points[:, 1])) + padding, height - 1)

    crop = frame_bgr[y_min : y_max + 1, x_min : x_max + 1]
    if crop.size == 0:
        raise ValueError("No pixels were sampled for iris color extraction.")

    crop = cv2.resize(crop, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    scaled_points = ((points - np.array([x_min, y_min])) * scale).astype(np.int32)
    return crop, scaled_points


def _remove_iris_noise(crop_bgr, iris_mask, center, radius):
    hsv = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    inner_mask = np.zeros(iris_mask.shape, dtype=np.uint8)
    outer_mask = np.zeros(iris_mask.shape, dtype=np.uint8)
    cv2.circle(
        inner_mask,
        center,
        max(int(radius * IRIS_INNER_RADIUS_RATIO), 2),
        255,
        -1,
    )
    cv2.circle(
        outer_mask,
        center,
        max(int(radius * IRIS_OUTER_RADIUS_RATIO), 3),
        255,
        -1,
    )

    ring_mask = cv2.bitwise_and(iris_mask, outer_mask)
    ring_mask = cv2.bitwise_and(ring_mask, cv2.bitwise_not(inner_mask))

    ring_values = value[ring_mask == 255]
    if ring_values.size:
        dark_cutoff = np.percentile(ring_values, IRIS_DARK_PERCENTILE)
        dark_mask = (value <= dark_cutoff).astype(np.uint8) * 255
    else:
        dark_mask = np.full(iris_mask.shape, 255, dtype=np.uint8)

    highlight_mask = ((value > 210) & (saturation < 80)).astype(np.uint8) * 255

    clean_mask = cv2.bitwise_and(ring_mask, cv2.bitwise_not(dark_mask))
    clean_mask = cv2.bitwise_and(clean_mask, cv2.bitwise_not(highlight_mask))

    return clean_mask


def _exclude_face_detail_masks(base_mask, frame_shape, landmarks):
    lip_mask = _polygon_mask(frame_shape, landmarks, OUTER_LIP_POINTS)
    left_eye_mask = _polygon_mask(frame_shape, landmarks, LEFT_EYE_POINTS)
    right_eye_mask = _polygon_mask(frame_shape, landmarks, RIGHT_EYE_POINTS)
    excluded = cv2.bitwise_or(lip_mask, cv2.bitwise_or(left_eye_mask, right_eye_mask))
    return cv2.bitwise_and(base_mask, cv2.bitwise_not(excluded))


def extract_cheek_colors(frame_bgr, landmarks):
    height, width = frame_bgr.shape[:2]
    face_width = abs(
        normalized_to_pixel(landmarks[454], frame_bgr.shape)[0]
        - normalized_to_pixel(landmarks[234], frame_bgr.shape)[0]
    )
    axis_x = max(int(face_width * 0.08), 12)
    axis_y = max(int(face_width * 0.11), 16)

    cheek_colors = {}
    for name, center_index in (
        ("leftCheek", LEFT_CHEEK_CENTER),
        ("rightCheek", RIGHT_CHEEK_CENTER),
    ):
        center = normalized_to_pixel(landmarks[center_index], frame_bgr.shape)
        center = (min(max(center[0], 0), width - 1), min(max(center[1], 0), height - 1))
        mask = _ellipse_mask(frame_bgr.shape, center, (axis_x, axis_y))
        mask = _exclude_face_detail_masks(mask, frame_bgr.shape, landmarks)
        cheek_colors[name] = _mask_to_color(frame_bgr, mask, mode="skin")

    return cheek_colors


def extract_skin_color(frame_bgr, landmarks):
    cheek_colors = extract_cheek_colors(frame_bgr, landmarks)
    return _average_color_results(
        [cheek_colors["leftCheek"], cheek_colors["rightCheek"]]
    )


def extract_cheek_color(frame_bgr, landmarks):
    cheek_colors = extract_cheek_colors(frame_bgr, landmarks)
    return _average_color_results(
        [cheek_colors["leftCheek"], cheek_colors["rightCheek"]]
    )


def extract_forehead_color(frame_bgr, landmarks):
    color = extract_forehead_color_with_status(frame_bgr, landmarks)
    return {"rgb": color["rgb"], "hex": color["hex"]}


def _central_forehead_mask(frame_shape, landmarks):
    face_width = abs(
        normalized_to_pixel(landmarks[356], frame_shape)[0]
        - normalized_to_pixel(landmarks[127], frame_shape)[0]
    )
    top = normalized_to_pixel(landmarks[10], frame_shape)
    brow_center = normalized_to_pixel(landmarks[9], frame_shape)
    center = (
        int((top[0] + brow_center[0]) / 2),
        int((top[1] + brow_center[1]) / 2),
    )
    axis_x = max(int(face_width * 0.075), 12)
    axis_y = max(int(abs(brow_center[1] - top[1]) * 0.42), int(face_width * 0.045), 10)
    return _ellipse_mask(frame_shape, center, (axis_x, axis_y))


def _classify_forehead_mask(frame_bgr, mask, source):
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pixels = frame_rgb[mask == 255]

    if pixels.size == 0:
        return {
            "color": None,
            "source": source,
            "coverage": 0.0,
            "occluded": True,
            "confidence": "low",
            "reason": "forehead_occluded_by_hair_or_dark_pixels",
        }

    skin_mask = _skin_like_pixel_mask(pixels)
    skin_candidate_ratio = float(np.mean(skin_mask)) if len(pixels) else 0.0
    hsv = cv2.cvtColor(pixels.reshape(-1, 1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV).reshape(-1, 3)
    dark_ratio = float(np.mean((hsv[:, 2] / 255) < 0.28)) if len(hsv) else 1.0

    if skin_candidate_ratio >= 0.45 and dark_ratio <= 0.35:
        detected = _representative_color(_filter_color_pixels(pixels, "skin"), mode="skin")
        return {
            "color": detected,
            "source": source,
            "coverage": round(skin_candidate_ratio, 4),
            "occluded": False,
            "confidence": "high" if skin_candidate_ratio >= 0.6 else "medium",
            "reason": None,
        }

    return {
        "color": None,
        "source": source,
        "coverage": round(skin_candidate_ratio, 4),
        "occluded": True,
        "confidence": "low",
        "reason": "forehead_occluded_by_hair_or_dark_pixels",
    }


def extract_forehead_color_with_status(frame_bgr, landmarks, fallback_rgb=None):
    center_mask = _central_forehead_mask(frame_bgr.shape, landmarks)
    center_mask = _exclude_face_detail_masks(center_mask, frame_bgr.shape, landmarks)
    center_result = _classify_forehead_mask(frame_bgr, center_mask, "detected_center")
    if center_result["color"]:
        return {
            **center_result["color"],
            "source": center_result["source"],
            "coverage": center_result["coverage"],
            "occluded": False,
            "confidence": center_result["confidence"],
            "reason": None,
        }

    extended_mask = _polygon_mask(frame_bgr.shape, landmarks, EXTENDED_FOREHEAD_POINTS)
    extended_mask = _exclude_face_detail_masks(extended_mask, frame_bgr.shape, landmarks)
    extended_result = _classify_forehead_mask(frame_bgr, extended_mask, "detected_extended")
    if extended_result["color"]:
        return {
            **extended_result["color"],
            "source": extended_result["source"],
            "coverage": extended_result["coverage"],
            "occluded": False,
            "confidence": extended_result["confidence"],
            "reason": "center_forehead_unusable_used_extended_forehead",
        }

    fallback = fallback_rgb or [0, 0, 0]
    return {
        "rgb": fallback,
        "hex": rgb_to_hex(fallback),
        "source": "inferred_from_skin_base",
        "coverage": max(center_result["coverage"], extended_result["coverage"]),
        "occluded": True,
        "confidence": "low",
        "reason": "forehead_occluded_by_hair_or_dark_pixels",
    }


def extract_lip_color(frame_bgr, landmarks):
    mask = _polygon_mask(frame_bgr.shape, landmarks, OUTER_LIP_POINTS)
    return _mask_to_color(frame_bgr, mask, mode="lip")


def extract_eye_area_color(frame_bgr, landmarks):
    face_width = abs(
        normalized_to_pixel(landmarks[356], frame_bgr.shape)[0]
        - normalized_to_pixel(landmarks[127], frame_bgr.shape)[0]
    )
    axis_x = max(int(face_width * 0.12), 16)
    axis_y = max(int(face_width * 0.04), 8)
    upward_offset = max(int(face_width * 0.04), 8)

    eye_area_colors = []
    for center_indices in (LEFT_EYE_CENTER_POINTS, RIGHT_EYE_CENTER_POINTS):
        points = [normalized_to_pixel(landmarks[index], frame_bgr.shape) for index in center_indices]
        eye_center = (
            int(np.mean([point[0] for point in points])),
            int(np.mean([point[1] for point in points])),
        )
        center = (eye_center[0], max(eye_center[1] - upward_offset, 0))
        mask = _ellipse_mask(frame_bgr.shape, center, (axis_x, axis_y))
        mask[eye_center[1] :, :] = 0
        mask = _exclude_face_detail_masks(mask, frame_bgr.shape, landmarks)
        eye_area_colors.append(_mask_to_color(frame_bgr, mask, mode="eye_area"))

    return _average_color_results(eye_area_colors)


def extract_single_iris_color(frame_bgr, landmarks, iris_indices):
    if len(landmarks) <= max(iris_indices):
        raise ValueError("Iris landmarks are unavailable. Enable refine_landmarks=True.")

    points = _points_from_landmarks(landmarks, iris_indices, frame_bgr.shape)
    crop, scaled_points = _crop_and_scale(frame_bgr, points)
    crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)

    iris_mask = np.zeros(crop.shape[:2], dtype=np.uint8)
    hull = cv2.convexHull(scaled_points)
    cv2.fillConvexPoly(iris_mask, hull, 255)

    (center_x, center_y), radius = cv2.minEnclosingCircle(scaled_points)
    clean_mask = _remove_iris_noise(
        crop,
        iris_mask,
        (int(center_x), int(center_y)),
        radius,
    )

    pixels = crop_rgb[clean_mask == 255]
    if len(pixels) < MIN_IRIS_PIXELS:
        raise ValueError("No pixels were sampled for iris color extraction.")

    return _pixels_to_color(pixels)


def extract_iris_color(frame_bgr, landmarks):
    right_iris = extract_single_iris_color(frame_bgr, landmarks, RIGHT_IRIS_POINTS)
    left_iris = extract_single_iris_color(frame_bgr, landmarks, LEFT_IRIS_POINTS)
    return _average_color_results([right_iris, left_iris])


def extract_colors(
    frame_bgr,
    landmarks,
    *,
    skin_base_color=None,
    has_makeup=False,
    makeup_input_missing=False,
):
    skin_color = extract_skin_color(frame_bgr, landmarks)
    skin_base_rgb = skin_base_color or skin_color["rgb"]
    forehead_color = extract_forehead_color_with_status(
        frame_bgr,
        landmarks,
        fallback_rgb=skin_base_rgb,
    )
    cheek_color = extract_cheek_color(frame_bgr, landmarks)
    lip_color = extract_lip_color(frame_bgr, landmarks)
    eye_area_color = extract_eye_area_color(frame_bgr, landmarks)

    if has_makeup:
        lip_color = {**lip_color, "makeupInfluenced": True}
        eye_area_color = {**eye_area_color, "makeupInfluenced": True}
        cheek_color = {**cheek_color, "makeupInfluenced": "possible"}

    return {
        "skinColor": skin_color,
        "lipColor": lip_color,
        "cheekColor": cheek_color,
        "foreheadColor": forehead_color,
        "eyeAreaColor": eye_area_color,
        "irisColor": extract_iris_color(frame_bgr, landmarks),
        "skinBaseColor": {
            "rgb": skin_base_rgb,
            "hex": rgb_to_hex(skin_base_rgb),
            "source": "current_face_base_tone",
            "confidence": "medium" if has_makeup else "high",
            "description": (
                "Base facial tone from the current captured face, "
                "not a bare-skin restoration."
            ),
        },
        "makeup": {
            "hasMakeup": bool(has_makeup),
            "source": "intro_user_input",
            "inputMissing": bool(makeup_input_missing),
            "compensationApplied": bool(has_makeup),
            "method": "color_makeup_region_weight_adjustment",
            "note": (
                "Foundation/base makeup is included in skinBaseColor. "
                "Only localized color makeup influence such as blush, "
                "lip, and eye shadow is reduced or flagged."
            ),
        },
        "quality": {
            "hasMakeup": bool(has_makeup),
            "makeupInputSource": "intro_user_input",
            "makeupInputMissing": bool(makeup_input_missing),
            "foreheadOccluded": bool(forehead_color.get("occluded")),
            "foreheadCoverage": forehead_color.get("coverage"),
            "foreheadColorSource": forehead_color.get("source"),
            "skinBaseConfidence": "medium" if has_makeup else "high",
        },
    }

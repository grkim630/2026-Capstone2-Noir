import cv2
import numpy as np

from modules.landmark import normalized_to_pixel


LEFT_CHEEK_CENTER = 205
RIGHT_CHEEK_CENTER = 425

FOREHEAD_POINTS = [109, 10, 338, 297, 332, 9, 103, 67]
JAW_POINTS = [
    234,
    93,
    132,
    58,
    172,
    136,
    150,
    149,
    176,
    148,
    152,
    377,
    400,
    378,
    379,
    365,
    397,
    288,
    361,
    323,
    454,
]

LEFT_EYE_POINTS = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7]
RIGHT_EYE_POINTS = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382]
LEFT_EYEBROW_POINTS = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
RIGHT_EYEBROW_POINTS = [336, 296, 334, 293, 300, 285, 295, 282, 283, 276]
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


def _face_width(landmarks, frame_shape):
    left_face = normalized_to_pixel(landmarks[127], frame_shape)
    right_face = normalized_to_pixel(landmarks[356], frame_shape)
    return abs(right_face[0] - left_face[0])


def _cheek_masks(frame_shape, landmarks):
    face_width = max(_face_width(landmarks, frame_shape), 1)
    axis_x = max(int(face_width * 0.09), 14)
    axis_y = max(int(face_width * 0.12), 18)

    masks = []
    for center_index in (LEFT_CHEEK_CENTER, RIGHT_CHEEK_CENTER):
        center = normalized_to_pixel(landmarks[center_index], frame_shape)
        masks.append(_ellipse_mask(frame_shape, center, (axis_x, axis_y)))

    return masks


def _cheek_region_masks(frame_shape, landmarks):
    face_width = max(_face_width(landmarks, frame_shape), 1)
    axis_x = max(int(face_width * 0.09), 14)
    axis_y = max(int(face_width * 0.12), 18)

    return {
        "leftCheek": _ellipse_mask(
            frame_shape,
            normalized_to_pixel(landmarks[LEFT_CHEEK_CENTER], frame_shape),
            (axis_x, axis_y),
        ),
        "rightCheek": _ellipse_mask(
            frame_shape,
            normalized_to_pixel(landmarks[RIGHT_CHEEK_CENTER], frame_shape),
            (axis_x, axis_y),
        ),
    }


def _exclude_non_skin_regions(mask, frame_shape, landmarks):
    exclusion_masks = [
        _polygon_mask(frame_shape, landmarks, LEFT_EYE_POINTS),
        _polygon_mask(frame_shape, landmarks, RIGHT_EYE_POINTS),
        _polygon_mask(frame_shape, landmarks, LEFT_EYEBROW_POINTS),
        _polygon_mask(frame_shape, landmarks, RIGHT_EYEBROW_POINTS),
        _polygon_mask(frame_shape, landmarks, OUTER_LIP_POINTS),
    ]

    exclusion = np.zeros(frame_shape[:2], dtype=np.uint8)
    for exclusion_mask in exclusion_masks:
        exclusion = cv2.bitwise_or(exclusion, exclusion_mask)

    exclusion = cv2.dilate(exclusion, np.ones((9, 9), dtype=np.uint8), iterations=1)
    return cv2.bitwise_and(mask, cv2.bitwise_not(exclusion))


def create_skin_region_masks(frame_bgr, landmarks):
    """
    Build separate candidate masks so skin analysis can reject covered or tinted areas.
    """
    frame_shape = frame_bgr.shape
    region_masks = _cheek_region_masks(frame_shape, landmarks)
    region_masks["forehead"] = _polygon_mask(frame_shape, landmarks, FOREHEAD_POINTS)
    region_masks["jaw"] = _polygon_mask(frame_shape, landmarks, JAW_POINTS)

    return {
        name: cv2.medianBlur(
            _exclude_non_skin_regions(mask, frame_shape, landmarks),
            5,
        )
        for name, mask in region_masks.items()
    }


def create_skin_mask(frame_bgr, landmarks):
    """
    Build a conservative skin mask from landmark-defined cheek, forehead, and jaw regions.

    Hair is not explicitly segmented here; instead, the forehead region is kept low and
    landmark-bounded so it avoids most hairline pixels in the MVP.
    """
    frame_shape = frame_bgr.shape
    mask = np.zeros(frame_shape[:2], dtype=np.uint8)

    for region_mask in create_skin_region_masks(frame_bgr, landmarks).values():
        mask = cv2.bitwise_or(mask, region_mask)

    return cv2.medianBlur(mask, 5)


def extract_skin_region_pixels(frame_bgr, landmarks):
    region_masks = create_skin_region_masks(frame_bgr, landmarks)
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    region_pixels = {}

    for name, mask in region_masks.items():
        pixels = frame_rgb[mask == 255]
        if pixels.size:
            region_pixels[name] = pixels

    if not region_pixels:
        raise ValueError("No skin pixels were extracted from the region masks.")

    return region_pixels, region_masks


def extract_skin_pixels(frame_bgr, landmarks):
    mask = create_skin_mask(frame_bgr, landmarks)
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pixels = frame_rgb[mask == 255]

    if pixels.size == 0:
        raise ValueError("No skin pixels were extracted from the mask.")

    return pixels, mask

import math

from modules.landmark import normalized_to_pixel


AVATAR_BASELINE = {
    # Temporary character reference values. Tune these later per game character.
    "eyeRatio": 0.06,
    "eyeSize": 0.26,
    "faceRatio": 1.45,
    "jawWidth": 0.82,
    "cheekWidth": 0.9,
    "noseLength": 0.32,
    "eyeDistance": 0.34,
    "mouthSize": 0.42,
}


def _distance(point_a, point_b):
    return math.dist(point_a, point_b)


def _normalize_for_avatar(value, key):
    baseline = AVATAR_BASELINE[key]
    if not baseline:
        return 0.0

    normalized = value / baseline
    return round(min(max(normalized, 0.0), 1.0), 4)


def _landmark_point(landmarks, index, frame_shape):
    return normalized_to_pixel(landmarks[index], frame_shape)


def _face_width(landmarks, frame_shape):
    left_face = _landmark_point(landmarks, 127, frame_shape)
    right_face = _landmark_point(landmarks, 356, frame_shape)
    return _distance(left_face, right_face)


def _face_height(landmarks, frame_shape):
    forehead = _landmark_point(landmarks, 10, frame_shape)
    chin = _landmark_point(landmarks, 152, frame_shape)
    return _distance(forehead, chin)


def _eye_dimensions(landmarks, frame_shape, outer_idx, inner_idx, top_idx, bottom_idx):
    outer = _landmark_point(landmarks, outer_idx, frame_shape)
    inner = _landmark_point(landmarks, inner_idx, frame_shape)
    top = _landmark_point(landmarks, top_idx, frame_shape)
    bottom = _landmark_point(landmarks, bottom_idx, frame_shape)

    width = _distance(outer, inner)
    height = _distance(top, bottom)
    return width, height


def calculate_eye_size_ratio(frame_bgr, landmarks):
    left_width, left_height = _eye_dimensions(
        landmarks,
        frame_bgr.shape,
        33,
        133,
        159,
        145,
    )
    right_width, right_height = _eye_dimensions(
        landmarks,
        frame_bgr.shape,
        362,
        263,
        386,
        374,
    )
    face_width = _face_width(landmarks, frame_bgr.shape)
    if not face_width:
        return 0.0

    left_eye_ratio = left_height / left_width if left_width else 0.0
    right_eye_ratio = right_height / right_width if right_width else 0.0
    eye_shape_ratio = (left_eye_ratio + right_eye_ratio) / 2
    eye_width_ratio = ((left_width + right_width) / 2) / face_width

    # Combines eye openness with face-width normalization for stable comparisons.
    return round(eye_shape_ratio * eye_width_ratio, 4)


def calculate_eye_size(frame_bgr, landmarks):
    left_width, _ = _eye_dimensions(landmarks, frame_bgr.shape, 33, 133, 159, 145)
    right_width, _ = _eye_dimensions(landmarks, frame_bgr.shape, 362, 263, 386, 374)
    face_width = _face_width(landmarks, frame_bgr.shape)
    eye_size = ((left_width + right_width) / 2) / face_width if face_width else 0.0
    return round(eye_size, 4)


def calculate_face_ratio(frame_bgr, landmarks):
    face_width = _face_width(landmarks, frame_bgr.shape)
    face_height = _face_height(landmarks, frame_bgr.shape)
    return round(face_height / face_width, 4) if face_width else 0.0


def calculate_jaw_width(frame_bgr, landmarks):
    left_jaw = _landmark_point(landmarks, 172, frame_bgr.shape)
    right_jaw = _landmark_point(landmarks, 397, frame_bgr.shape)
    face_width = _face_width(landmarks, frame_bgr.shape)
    jaw_width = _distance(left_jaw, right_jaw)
    return round(jaw_width / face_width, 4) if face_width else 0.0


def calculate_cheek_width(frame_bgr, landmarks):
    face_width = _face_width(landmarks, frame_bgr.shape)
    cheek_width = _distance(
        _landmark_point(landmarks, 234, frame_bgr.shape),
        _landmark_point(landmarks, 454, frame_bgr.shape),
    )
    return round(cheek_width / face_width, 4) if face_width else 0.0


def calculate_nose_length(frame_bgr, landmarks):
    nose_bridge = _landmark_point(landmarks, 168, frame_bgr.shape)
    nose_tip = _landmark_point(landmarks, 2, frame_bgr.shape)
    face_height = _face_height(landmarks, frame_bgr.shape)
    nose_length = _distance(nose_bridge, nose_tip)
    return round(nose_length / face_height, 4) if face_height else 0.0


def calculate_eye_distance(frame_bgr, landmarks):
    left_inner_eye = _landmark_point(landmarks, 133, frame_bgr.shape)
    right_inner_eye = _landmark_point(landmarks, 362, frame_bgr.shape)
    face_width = _face_width(landmarks, frame_bgr.shape)
    eye_distance = _distance(left_inner_eye, right_inner_eye)
    return round(eye_distance / face_width, 4) if face_width else 0.0


def calculate_mouth_size(frame_bgr, landmarks):
    left_mouth = _landmark_point(landmarks, 61, frame_bgr.shape)
    right_mouth = _landmark_point(landmarks, 291, frame_bgr.shape)
    face_width = _face_width(landmarks, frame_bgr.shape)
    mouth_size = _distance(left_mouth, right_mouth)
    return round(mouth_size / face_width, 4) if face_width else 0.0


def classify_face_contour(face_ratio, jaw_width, cheek_width):
    jaw_to_cheek = jaw_width / cheek_width if cheek_width else 0.0

    if face_ratio >= 1.45:
        return "long"
    if jaw_to_cheek >= 0.9:
        return "square"
    if jaw_to_cheek <= 0.75:
        return "v_shape"
    return "oval"


def calculate_features(frame_bgr, landmarks):
    eye_ratio = calculate_eye_size_ratio(frame_bgr, landmarks)
    eye_size = calculate_eye_size(frame_bgr, landmarks)
    face_ratio = calculate_face_ratio(frame_bgr, landmarks)
    jaw_width = calculate_jaw_width(frame_bgr, landmarks)
    cheek_width = calculate_cheek_width(frame_bgr, landmarks)
    nose_length = calculate_nose_length(frame_bgr, landmarks)
    eye_distance = calculate_eye_distance(frame_bgr, landmarks)
    mouth_size = calculate_mouth_size(frame_bgr, landmarks)

    return {
        "eyeRatio": _normalize_for_avatar(eye_ratio, "eyeRatio"),
        "eyeSize": _normalize_for_avatar(eye_size, "eyeSize"),
        "faceRatio": _normalize_for_avatar(face_ratio, "faceRatio"),
        "faceContour": classify_face_contour(face_ratio, jaw_width, cheek_width),
        "jawWidth": _normalize_for_avatar(jaw_width, "jawWidth"),
        "cheekWidth": _normalize_for_avatar(cheek_width, "cheekWidth"),
        "noseLength": _normalize_for_avatar(nose_length, "noseLength"),
        "eyeDistance": _normalize_for_avatar(eye_distance, "eyeDistance"),
        "mouthSize": _normalize_for_avatar(mouth_size, "mouthSize"),
    }

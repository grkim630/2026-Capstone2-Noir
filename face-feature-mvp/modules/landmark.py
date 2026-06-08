import cv2
import mediapipe as mp


class FaceLandmarkDetector:
    """Small wrapper around MediaPipe Face Mesh for one-face MVP detection."""

    def __init__(self, max_num_faces=1, min_detection_confidence=0.5):
        self._face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=max_num_faces,
            refine_landmarks=True,
            min_detection_confidence=min_detection_confidence,
        )

    def detect(self, frame_bgr):
        rgb_frame = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        result = self._face_mesh.process(rgb_frame)

        if not result.multi_face_landmarks:
            return None

        return result.multi_face_landmarks[0].landmark

    def close(self):
        self._face_mesh.close()


def normalized_to_pixel(landmark, frame_shape):
    height, width = frame_shape[:2]
    x = min(max(int(landmark.x * width), 0), width - 1)
    y = min(max(int(landmark.y * height), 0), height - 1)
    return x, y

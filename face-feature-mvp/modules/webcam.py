import cv2
import time


def open_camera(camera_index=0, width=1280, height=720):
    """Open a webcam and apply a practical default resolution."""
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open webcam at index {camera_index}.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    return cap


def capture_frame(camera_index=0, window_name="Face Feature MVP"):
    """
    Capture one frame from the webcam.

    Press Space/Enter to capture, or Esc/Q to cancel.
    """
    cap = open_camera(camera_index)

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                raise RuntimeError("Failed to read frame from webcam.")

            cv2.imshow(window_name, cv2.flip(frame, 1))
            key = cv2.waitKey(1) & 0xFF

            if key in (13, 32):  # Enter or Space
                return frame
            if key in (27, ord("q")):  # Esc or Q
                raise RuntimeError("Frame capture cancelled by user.")
    finally:
        cap.release()
        cv2.destroyWindow(window_name)


def capture_frames(camera_index=0, duration_seconds=3.0, window_name="Face Feature MVP"):
    """
    Capture multiple frames for stable feature extraction.

    Press Space/Enter to start sampling, or Esc/Q to cancel.
    """
    cap = open_camera(camera_index)
    frames = []
    is_sampling = False
    started_at = None

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                raise RuntimeError("Failed to read frame from webcam.")

            display = cv2.flip(frame, 1)

            if is_sampling:
                elapsed = time.monotonic() - started_at
                remaining = max(duration_seconds - elapsed, 0)
                frames.append(frame.copy())
                cv2.putText(
                    display,
                    f"Capturing... {remaining:.1f}s",
                    (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0),
                    2,
                )

                if elapsed >= duration_seconds:
                    return frames
            else:
                cv2.putText(
                    display,
                    "Press Space/Enter to start stable capture",
                    (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0, 255, 255),
                    2,
                )

            cv2.imshow(window_name, display)
            key = cv2.waitKey(1) & 0xFF

            if key in (13, 32) and not is_sampling:
                is_sampling = True
                started_at = time.monotonic()
            if key in (27, ord("q")):
                raise RuntimeError("Frame capture cancelled by user.")
    finally:
        cap.release()
        cv2.destroyWindow(window_name)

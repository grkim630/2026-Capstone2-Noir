import cv2
import numpy as np


def rgb_to_hex(rgb):
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def rgb_to_lab(rgb):
    """
    Convert RGB to CIE LAB.

    LAB is useful for skin analysis because L separates perceived brightness from
    color-opponent channels: a roughly tracks red-green and b roughly tracks yellow-blue.
    """
    pixel = np.array([[rgb]], dtype=np.uint8)
    lab = cv2.cvtColor(pixel, cv2.COLOR_RGB2LAB)[0][0]

    return {
        "L": round(float(lab[0]) * 100 / 255, 2),
        "a": round(float(lab[1]) - 128, 2),
        "b": round(float(lab[2]) - 128, 2),
    }


def rgb_to_hsv(rgb):
    pixel = np.array([[rgb]], dtype=np.uint8)
    hsv = cv2.cvtColor(pixel, cv2.COLOR_RGB2HSV)[0][0]

    return {
        "H": round(float(hsv[0]) * 2, 2),
        "S": round(float(hsv[1]) / 255, 4),
        "V": round(float(hsv[2]) / 255, 4),
    }


def convert_rgb(rgb):
    return {
        "rgb": rgb,
        "hex": rgb_to_hex(rgb),
        "LAB": rgb_to_lab(rgb),
        "HSV": rgb_to_hsv(rgb),
    }

"""RGB/HEX/HSV/LAB 변환 및 Delta E (CIE76) 유틸."""

from __future__ import annotations

import math
import re
from typing import Sequence

REF_X = 95.047
REF_Y = 100.000
REF_Z = 108.883


def clamp_score(score: float) -> float:
    return max(0.0, min(100.0, score))


def round2(value: float) -> float:
    return round(value * 100) / 100


def round3(value: float) -> float:
    return round(value * 1000) / 1000


def normalize_hex(hex_value: str) -> str:
    clean = str(hex_value or "").strip().lstrip("#")
    if len(clean) == 3:
        clean = "".join(ch * 2 for ch in clean)
    if len(clean) != 6:
        raise ValueError(f"Invalid HEX value: {hex_value}")
    return f"#{clean.upper()}"


def hex_to_rgb(hex_value: str) -> list[int]:
    clean = normalize_hex(hex_value).lstrip("#")
    return [
        int(clean[0:2], 16),
        int(clean[2:4], 16),
        int(clean[4:6], 16),
    ]


def parse_rgb_string(rgb_string: str) -> list[int] | None:
    if not rgb_string:
        return None

    text = str(rgb_string).strip()
    match = re.match(r"^\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$", text)
    if not match:
        numbers = re.findall(r"\d+", text)
        if len(numbers) >= 3:
            return [int(numbers[0]), int(numbers[1]), int(numbers[2])]
        return None

    return [int(match.group(1)), int(match.group(2)), int(match.group(3))]


def resolve_product_rgb(hex_value: str, rgb_string: str) -> list[int]:
    """RGB 문자열 파싱 실패 시 HEX에서 복원."""
    parsed = parse_rgb_string(rgb_string)
    if parsed is not None:
        return [max(0, min(255, value)) for value in parsed]
    return hex_to_rgb(hex_value)


def to_rgb01(rgb: Sequence[int]) -> list[float]:
    return [round3(value / 255.0) for value in rgb]


def _linearize(channel: float) -> float:
    channel /= 255.0
    if channel <= 0.04045:
        return channel / 12.92
    return ((channel + 0.055) / 1.055) ** 2.4


def _f_lab(value: float) -> float:
    if value > (6 / 29) ** 3:
        return value ** (1 / 3)
    return (value / (3 * ((6 / 29) ** 2))) + (4 / 29)


def rgb_to_hsv(rgb: Sequence[int]) -> dict[str, float]:
    r, g, b = [value / 255.0 for value in rgb]
    maximum = max(r, g, b)
    minimum = min(r, g, b)
    delta = maximum - minimum

    if delta == 0:
        hue = 0.0
    elif maximum == r:
        hue = 60.0 * (((g - b) / delta) % 6)
    elif maximum == g:
        hue = 60.0 * (((b - r) / delta) + 2)
    else:
        hue = 60.0 * (((r - g) / delta) + 4)

    saturation = 0.0 if maximum == 0 else (delta / maximum) * 100.0
    value = maximum * 100.0

    return {
        "H": round2(hue % 360),
        "S": round2(saturation),
        "V": round2(value),
    }


def rgb_to_lab(rgb: Sequence[int]) -> dict[str, float]:
    red = _linearize(rgb[0])
    green = _linearize(rgb[1])
    blue = _linearize(rgb[2])

    x = (red * 0.4124564 + green * 0.3575761 + blue * 0.1804375) * 100.0
    y = (red * 0.2126729 + green * 0.7151522 + blue * 0.0721750) * 100.0
    z = (red * 0.0193339 + green * 0.1191920 + blue * 0.9503041) * 100.0

    fx = _f_lab(x / REF_X)
    fy = _f_lab(y / REF_Y)
    fz = _f_lab(z / REF_Z)

    l_star = (116.0 * fy) - 16.0
    a_star = 500.0 * (fx - fy)
    b_star = 200.0 * (fy - fz)

    return {
        "L": round2(l_star),
        "a": round2(a_star),
        "b": round2(b_star),
    }


def calculate_delta_e(lab1: dict[str, float], lab2: dict[str, float]) -> float:
    return math.sqrt(
        (lab1["L"] - lab2["L"]) ** 2
        + (lab1["a"] - lab2["a"]) ** 2
        + (lab1["b"] - lab2["b"]) ** 2
    )

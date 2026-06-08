"""퍼스널컬러·톤·카테고리별 추천 점수 계산."""

from __future__ import annotations

from typing import Any

from .color_utils import (
    calculate_delta_e,
    clamp_score,
    rgb_to_hsv,
    rgb_to_lab,
    round2,
)

VALID_PERSONAL_COLOR_TYPES = [
    "spring_light",
    "spring_bright",
    "summer_light",
    "summer_muted",
    "autumn_muted",
    "autumn_deep",
    "winter_bright",
    "winter_deep",
]

TYPE_RELATIONS: dict[str, dict[str, list[str]]] = {
    "spring_light": {
        "close": ["spring_bright", "summer_light"],
        "boundary": ["autumn_muted"],
    },
    "spring_bright": {
        "close": ["spring_light", "winter_bright"],
        "boundary": ["autumn_deep"],
    },
    "summer_light": {
        "close": ["spring_light", "summer_muted"],
        "boundary": ["winter_bright"],
    },
    "summer_muted": {
        "close": ["summer_light", "autumn_muted"],
        "boundary": ["winter_deep"],
    },
    "autumn_muted": {
        "close": ["summer_muted", "autumn_deep"],
        "boundary": ["spring_light"],
    },
    "autumn_deep": {
        "close": ["autumn_muted", "winter_deep"],
        "boundary": ["spring_bright"],
    },
    "winter_bright": {
        "close": ["spring_bright", "winter_deep"],
        "boundary": ["summer_light"],
    },
    "winter_deep": {
        "close": ["autumn_deep", "winter_bright"],
        "boundary": ["summer_muted"],
    },
}

TYPE_TEMPERATURE: dict[str, str] = {
    "spring_light": "warm",
    "spring_bright": "warm",
    "autumn_muted": "warm",
    "autumn_deep": "warm",
    "summer_light": "cool",
    "summer_muted": "cool",
    "winter_bright": "cool",
    "winter_deep": "cool",
}

TONE_ORDER = ["low", "medium", "high"]

SEASON_LABELS_KO = {
    "spring_light": "spring_light",
    "spring_bright": "spring_bright",
    "summer_light": "summer_light",
    "summer_muted": "summer_muted",
    "autumn_muted": "autumn_muted",
    "autumn_deep": "autumn_deep",
    "winter_bright": "winter_bright",
    "winter_deep": "winter_deep",
}


def get_type_compatibility_score(user_type: str, product_personal_color: str) -> float:
    if user_type == product_personal_color:
        return 100.0

    relation = TYPE_RELATIONS.get(user_type, {})
    if product_personal_color in relation.get("close", []):
        return 80.0
    if product_personal_color in relation.get("boundary", []):
        return 65.0

    user_temp = TYPE_TEMPERATURE.get(user_type)
    product_temp = TYPE_TEMPERATURE.get(product_personal_color)
    if user_temp and product_temp and user_temp == product_temp:
        return 50.0

    return 20.0


def get_temperature_score(user_temperature: str, product_personal_color: str) -> float:
    product_temperature = TYPE_TEMPERATURE.get(product_personal_color)
    if not product_temperature:
        return 50.0
    if user_temperature == product_temperature:
        return 100.0
    if user_temperature == "neutral":
        return 70.0
    return 20.0


def classify_brightness_from_hsv(hsv: dict[str, float]) -> str:
    value = hsv["V"]
    if value >= 75:
        return "high"
    if value >= 55:
        return "medium"
    return "low"


def classify_chroma_from_hsv(hsv: dict[str, float]) -> str:
    saturation = hsv["S"]
    if saturation >= 55:
        return "high"
    if saturation >= 30:
        return "medium"
    return "low"


def get_tone_step_score(user_tone_value: str, product_tone_value: str) -> float:
    user_index = TONE_ORDER.index(user_tone_value) if user_tone_value in TONE_ORDER else -1
    product_index = TONE_ORDER.index(product_tone_value) if product_tone_value in TONE_ORDER else -1
    if user_index == -1 or product_index == -1:
        return 50.0

    diff = abs(user_index - product_index)
    if diff == 0:
        return 100.0
    if diff == 1:
        return 70.0
    return 30.0


def get_brightness_score(user_brightness: str, product_rgb: list[int]) -> float:
    hsv = rgb_to_hsv(product_rgb)
    product_brightness = classify_brightness_from_hsv(hsv)
    return get_tone_step_score(user_brightness, product_brightness)


def get_chroma_score(user_chroma: str, product_rgb: list[int]) -> float:
    hsv = rgb_to_hsv(product_rgb)
    product_chroma = classify_chroma_from_hsv(hsv)
    return get_tone_step_score(user_chroma, product_chroma)


def _is_redness_high(user_analysis: dict[str, Any]) -> bool:
    return user_analysis.get("redness") == "high"


def _redness_penalty(product_rgb: list[int], hsv: dict[str, float], s_threshold: float, r_threshold: int, rg_gap: int, penalty: float) -> float:
    red, green, _blue = product_rgb
    if hsv["S"] >= s_threshold and red >= r_threshold and (red - green) >= rg_gap:
        return penalty
    return 0.0


def get_category_adjustment_score(
    category: str,
    user_analysis: dict[str, Any],
    product: dict[str, Any],
) -> float:
    user_type = user_analysis["season"]
    product_personal_color = product["personalColor"]
    product_rgb = product["rgb"]
    hsv = rgb_to_hsv(product_rgb)
    user_temp = TYPE_TEMPERATURE.get(user_type)
    product_temp = TYPE_TEMPERATURE.get(product_personal_color)

    if category == "lip":
        score = 80.0
        type_score = get_type_compatibility_score(user_type, product_personal_color)
        if type_score >= 100:
            score = 100.0
        elif type_score >= 80:
            score = max(score, 85.0)
        elif type_score >= 65:
            score = max(score, 75.0)

        if _is_redness_high(user_analysis):
            if hsv["S"] >= 65:
                score -= 15.0
            score -= _redness_penalty(product_rgb, hsv, 65, 180, 50, 10.0)

        if user_type in ("spring_light", "summer_light") and hsv["V"] < 45 and hsv["S"] > 55:
            score -= 20.0

        return clamp_score(score)

    if category == "blush":
        product_lab = rgb_to_lab(product_rgb)
        skin_lab = user_analysis["skinLAB"]
        delta_e = calculate_delta_e(skin_lab, product_lab)

        if delta_e <= 15:
            score = 100.0
        elif delta_e <= 30:
            score = 80.0
        elif delta_e <= 45:
            score = 60.0
        else:
            score = 40.0

        if _is_redness_high(user_analysis):
            if hsv["S"] >= 60:
                score -= 10.0
            score -= _redness_penalty(product_rgb, hsv, 60, 180, 45, 10.0)

        if user_type in ("spring_light", "summer_light") and hsv["V"] < 50:
            score -= 15.0

        return clamp_score(score)

    if category == "eye_palette":
        score = 80.0
        type_score = get_type_compatibility_score(user_type, product_personal_color)
        if type_score >= 100:
            score = 100.0
        elif type_score >= 80:
            score = 85.0
        elif type_score >= 65:
            score = 70.0
        elif user_temp and product_temp and user_temp == product_temp:
            score = max(score, 65.0)

        if user_type in ("spring_light", "summer_light") and hsv["V"] < 45:
            score -= 20.0
        if user_type in ("winter_deep", "autumn_deep") and hsv["V"] >= 75 and hsv["S"] < 30:
            score -= 15.0

        return clamp_score(score)

    return 50.0


def calculate_final_score(user_analysis: dict[str, Any], product: dict[str, Any]) -> dict[str, float]:
    product_personal_color = product["personalColor"]
    product_rgb = product["rgb"]

    type_compatibility_score = get_type_compatibility_score(
        user_analysis["season"],
        product_personal_color,
    )
    temperature_score = get_temperature_score(
        user_analysis["temperature"],
        product_personal_color,
    )
    brightness_score = get_brightness_score(user_analysis["brightness"], product_rgb)
    chroma_score = get_chroma_score(user_analysis["chroma"], product_rgb)
    category_adjustment_score = get_category_adjustment_score(
        product["productType"],
        user_analysis,
        product,
    )

    final_score = (
        type_compatibility_score * 0.50
        + temperature_score * 0.15
        + brightness_score * 0.15
        + chroma_score * 0.10
        + category_adjustment_score * 0.10
    )

    return {
        "typeCompatibilityScore": round2(type_compatibility_score),
        "temperatureScore": round2(temperature_score),
        "brightnessScore": round2(brightness_score),
        "chromaScore": round2(chroma_score),
        "categoryAdjustmentScore": round2(category_adjustment_score),
        "finalScore": round2(final_score),
    }


def sort_recommendation_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def sort_key(item: dict[str, Any]) -> tuple:
        scores = item["scores"]
        return (
            -scores["finalScore"],
            -scores["typeCompatibilityScore"],
            -scores["categoryAdjustmentScore"],
            -scores["brightnessScore"],
            -scores["chromaScore"],
            item["id"],
        )

    return sorted(items, key=sort_key)


def generate_reason(user_analysis: dict[str, Any], item: dict[str, Any]) -> str:
    user_type = user_analysis["season"]
    product_type = item["personalColor"]
    category = item["productType"]
    type_score = item["scores"]["typeCompatibilityScore"]
    category_ko = {"lip": "립", "blush": "블러쉬", "eye_palette": "아이 팔레트"}.get(
        category,
        category,
    )

    if type_score >= 100:
        match_text = f"사용자의 {user_type} 타입과 정확히 일치하며"
    elif type_score >= 80:
        match_text = f"사용자의 {user_type} 타입과 가까운 {product_type} 계열로"
    elif type_score >= 65:
        match_text = f"사용자의 {user_type} 타입과 경계 호환되는 {product_type} 계열로"
    else:
        match_text = f"사용자 톤과 조화를 고려한 {product_type} 계열로"

    if category == "blush":
        detail = "피부의 볼 색상과 자연스럽게 어울려 생기를 더해줄 수 있는"
    elif category == "lip":
        detail = "따뜻하고 부드러운 포인트를 줄 수 있는"
    else:
        detail = "눈가에 깊이와 분위기를 더해줄 수 있는"

    return f"{match_text}, {detail} {category_ko} 컬러입니다."

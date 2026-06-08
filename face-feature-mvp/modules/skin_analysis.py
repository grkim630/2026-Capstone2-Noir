import cv2
import numpy as np

from modules.color_convert import convert_rgb
from modules.skin_cluster import dominant_skin_rgb
from modules.skin_mask import extract_skin_pixels, extract_skin_region_pixels


MIN_REGION_PIXELS = 80
SKIN_PIXEL_HIGH_PERCENTILE = 97
SHADOW_REGION_LIGHTNESS_DELTA = 5
REGION_BASE_WEIGHTS = {
    "leftCheek": 1.0,
    "rightCheek": 1.0,
    "forehead": 0.65,
    "jaw": 0.8,
}


def _lighting_params(region_profiles):
    lightness_values = [profile["lightness"] for profile in region_profiles]
    lightness_range = max(lightness_values) - min(lightness_values)

    if lightness_range < 5:
        return {
            "shadow_weight": 0.6,
            "low_percentile": 20,
            "cluster_delta": 7,
        }
    if lightness_range < 10:
        return {
            "shadow_weight": 0.35,
            "low_percentile": 25,
            "cluster_delta": 5,
        }
    if lightness_range < 16:
        return {
            "shadow_weight": 0.2,
            "low_percentile": 35,
            "cluster_delta": 3,
        }
    return {
        "shadow_weight": 0.12,
        "low_percentile": 40,
        "cluster_delta": 2,
    }


def _melanin_score(lightness, yellowness):
    # Darker and more yellow-shifted skin generally maps to a higher approximate score.
    score = (100 - lightness) * 0.75 + max(yellowness, 0) * 0.8
    return round(max(0.0, min(score, 100.0)), 2)


def _estimate_melanin(lightness, yellowness):
    score = _melanin_score(lightness, yellowness)

    if score < 28:
        return "low"
    if score < 48:
        return "medium"
    return "high"


def _estimate_redness(redness_value):
    if redness_value < 8:
        return "low"
    if redness_value < 18:
        return "medium"
    return "high"


def _estimate_temperature(lab):
    warm_score = lab["b"] - lab["a"]
    cool_score = lab["a"] - lab["b"]

    if warm_score >= 6:
        return "warm"
    if cool_score >= 4:
        return "cool"
    return "neutral"


def _estimate_brightness(lightness):
    if lightness >= 70:
        return "bright"
    if lightness >= 62:
        return "medium"
    return "deep"


def _estimate_chroma(saturation):
    if saturation >= 0.42:
        return "high"
    if saturation >= 0.24:
        return "medium"
    return "low"


def _estimate_tone(lab, hsv):
    return {
        "temperature": _estimate_temperature(lab),
        "brightness": _estimate_brightness(lab["L"]),
        "chroma": _estimate_chroma(hsv["S"]),
    }


def _analysis_metrics(lab, hsv):
    return {
        "melanin": _melanin_score(lab["L"], lab["b"]),
        "redness": round(float(lab["a"]), 2),
        "temperature": round(float(lab["b"] - lab["a"]), 2),
        "brightness": round(float(lab["L"]), 2),
        "saturation": round(float(hsv["S"]) * 100, 2),
    }


def _resolve_temperature(tone):
    if tone["temperature"] in ["warm", "cool"]:
        return tone["temperature"]

    if tone["brightness"] == "bright":
        return "warm" if tone["chroma"] != "low" else "cool"

    return "warm" if tone["chroma"] == "low" else "cool"


def _personal_color_chroma(tone_chroma):
    if tone_chroma == "high":
        return "clear"
    if tone_chroma == "medium":
        return "medium"
    return "muted"


def _personal_color_season(temperature, brightness, chroma):
    is_light = brightness in ["bright", "medium"]

    if temperature == "warm":
        if is_light:
            if chroma == "clear":
                return "spring_bright"
            return "spring_light"
        if chroma == "clear":
            return "autumn_deep"
        return "autumn_muted"

    if is_light:
        if chroma == "clear":
            return "winter_bright"
        return "summer_light"
    if chroma == "clear":
        return "winter_deep"
    return "summer_muted"


def _classify_personal_color(tone):
    temperature = _resolve_temperature(tone)
    brightness = tone["brightness"]
    chroma = _personal_color_chroma(tone["chroma"])

    return {
        "temperature": temperature,
        "brightness": brightness,
        "chroma": chroma,
        "season": _personal_color_season(temperature, brightness, chroma),
    }


def _skin_candidate_pixels(pixels):
    pixel_block = pixels.reshape(-1, 1, 3).astype(np.uint8)
    hsv = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2HSV).reshape(-1, 3)
    ycrcb = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2YCrCb).reshape(-1, 3)

    saturation = hsv[:, 1] / 255
    value = hsv[:, 2] / 255
    cr = ycrcb[:, 1]
    cb = ycrcb[:, 2]

    candidate_mask = (
        (value >= 0.24)
        & (saturation >= 0.06)
        & (saturation <= 0.72)
        & (cr >= 130)
        & (cr <= 180)
        & (cb >= 75)
        & (cb <= 145)
    )
    return pixels[candidate_mask], hsv


def _region_profile(name, pixels):
    candidate_pixels, hsv = _skin_candidate_pixels(pixels)
    if len(candidate_pixels) < MIN_REGION_PIXELS:
        return None

    median_rgb = np.median(candidate_pixels, axis=0).astype(int).tolist()
    color_data = convert_rgb(median_rgb)
    dark_ratio = float(np.mean((hsv[:, 2] / 255) < 0.28))
    candidate_ratio = len(candidate_pixels) / len(pixels)

    if candidate_ratio < 0.25:
        return None
    if name == "forehead" and (candidate_ratio < 0.45 or dark_ratio > 0.35):
        return None

    return {
        "name": name,
        "pixels": candidate_pixels,
        "LAB": color_data["LAB"],
        "HSV": color_data["HSV"],
        "lightness": color_data["LAB"]["L"],
        "weight": REGION_BASE_WEIGHTS.get(name, 0.7),
    }


def _apply_lighting_weights(region_profiles, lighting_params):
    reference_lightness = float(
        np.median([profile["lightness"] for profile in region_profiles])
    )

    for profile in region_profiles:
        if profile["lightness"] < reference_lightness - SHADOW_REGION_LIGHTNESS_DELTA:
            profile["weight"] *= lighting_params["shadow_weight"]

    return region_profiles


def _apply_makeup_weights(region_profiles, has_makeup=False):
    reference_profiles = [
        profile
        for profile in region_profiles
        if profile["name"] not in ["leftCheek", "rightCheek"]
    ]
    if not reference_profiles:
        reference_profiles = region_profiles

    reference_redness = float(
        np.median([profile["LAB"]["a"] for profile in reference_profiles])
    )

    for profile in region_profiles:
        is_cheek = profile["name"] in ["leftCheek", "rightCheek"]
        redness_delta = profile["LAB"]["a"] - reference_redness
        if is_cheek and redness_delta >= 7 and profile["HSV"]["S"] >= 0.18:
            profile["weight"] *= 0.35
            profile["makeupInfluence"] = "possible_blush"

        if has_makeup and is_cheek and redness_delta >= 5 and profile["HSV"]["S"] >= 0.22:
            profile["weight"] *= 0.6
            profile["makeupInfluence"] = "possible_blush_makeup_mode"

    return region_profiles


def _weighted_pixels(region_profiles, random_state=42):
    rng = np.random.default_rng(random_state)
    weighted_blocks = []

    for profile in region_profiles:
        pixels = profile["pixels"]
        keep_count = max(int(len(pixels) * profile["weight"]), MIN_REGION_PIXELS)
        keep_count = min(keep_count, len(pixels))

        if keep_count < len(pixels):
            indices = rng.choice(len(pixels), size=keep_count, replace=False)
            pixels = pixels[indices]

        weighted_blocks.append(pixels)

    return np.vstack(weighted_blocks)


def _trim_shadow_pixels(pixels, lighting_params):
    pixel_block = pixels.reshape(-1, 1, 3).astype(np.uint8)
    hsv = cv2.cvtColor(pixel_block, cv2.COLOR_RGB2HSV).reshape(-1, 3)
    value = hsv[:, 2].astype(np.float32)
    low = np.percentile(value, lighting_params["low_percentile"])
    high = np.percentile(value, SKIN_PIXEL_HIGH_PERCENTILE)
    keep_mask = (value >= low) & (value <= high)
    filtered = pixels[keep_mask]

    if len(filtered) < MIN_REGION_PIXELS:
        return pixels

    return filtered


def _cluster_min_lightness(pixels, lighting_params):
    median_rgb = np.median(pixels, axis=0).astype(int).tolist()
    median_lightness = convert_rgb(median_rgb)["LAB"]["L"]
    return max(median_lightness - lighting_params["cluster_delta"], 0)


def _robust_skin_pixels(frame_bgr, landmarks, has_makeup=False):
    region_pixels, _ = extract_skin_region_pixels(frame_bgr, landmarks)
    region_profiles = []

    for name, pixels in region_pixels.items():
        profile = _region_profile(name, pixels)
        if profile is not None:
            region_profiles.append(profile)

    if not region_profiles:
        skin_pixels, _ = extract_skin_pixels(frame_bgr, landmarks)
        return skin_pixels, {
            "shadow_weight": 0.35,
            "low_percentile": 25,
            "cluster_delta": 5,
        }

    lighting_params = _lighting_params(region_profiles)
    region_profiles = _apply_lighting_weights(region_profiles, lighting_params)
    region_profiles = _apply_makeup_weights(region_profiles, has_makeup=has_makeup)
    return (
        _trim_shadow_pixels(_weighted_pixels(region_profiles), lighting_params),
        lighting_params,
    )


def analyze_skin_color(frame_bgr, landmarks, k=4, has_makeup=False):
    """
    Run the experimental skin color analysis pipeline.

    Input landmarks should come from the existing MediaPipe Face Mesh detector.
    """
    skin_pixels, lighting_params = _robust_skin_pixels(
        frame_bgr,
        landmarks,
        has_makeup=has_makeup,
    )
    dominant_rgb = dominant_skin_rgb(
        skin_pixels,
        k=k,
        min_lightness=_cluster_min_lightness(skin_pixels, lighting_params),
    )
    color_data = convert_rgb(dominant_rgb)
    lab = color_data["LAB"]
    hsv = color_data["HSV"]
    tone = _estimate_tone(lab, hsv)

    return {
        "skinAnalysis": {
            "dominantRGB": dominant_rgb,
            "hex": color_data["hex"],
            "LAB": lab,
            "HSV": hsv,
            "melanin": _estimate_melanin(lab["L"], lab["b"]),
            "redness": _estimate_redness(lab["a"]),
            "tone": tone,
            "metrics": _analysis_metrics(lab, hsv),
            "skinBaseColor": {
                "rgb": dominant_rgb,
                "hex": color_data["hex"],
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
                "compensationApplied": bool(has_makeup),
                "method": "color_makeup_region_weight_adjustment",
                "note": (
                    "Foundation/base makeup is included in skinBaseColor. "
                    "Only localized color makeup influence such as blush, "
                    "lip, and eye shadow is reduced or flagged."
                ),
            },
        },
        "personalColor": _classify_personal_color(tone),
    }

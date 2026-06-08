import numpy as np
from sklearn.cluster import KMeans

from modules.color_convert import rgb_to_lab


def _sample_pixels(pixels, max_samples=8000, random_state=42):
    if len(pixels) <= max_samples:
        return pixels

    rng = np.random.default_rng(random_state)
    indices = rng.choice(len(pixels), size=max_samples, replace=False)
    return pixels[indices]


def dominant_skin_rgb(
    skin_pixels,
    k=4,
    max_samples=8000,
    random_state=42,
    min_lightness=None,
):
    """
    Cluster skin pixels and return the largest cluster center as representative RGB.

    Clustering is used because skin masks can still contain shadows, highlights, or
    minor background noise. The largest cluster is usually closer to the true base tone
    than a raw average across every sampled pixel.
    """
    if skin_pixels.size == 0:
        raise ValueError("skin_pixels must not be empty.")

    sampled_pixels = _sample_pixels(
        skin_pixels.astype(np.float32),
        max_samples=max_samples,
        random_state=random_state,
    )
    cluster_count = min(max(int(k), 3), 5, len(sampled_pixels))

    model = KMeans(
        n_clusters=cluster_count,
        random_state=random_state,
        n_init="auto",
    )
    labels = model.fit_predict(sampled_pixels)
    counts = np.bincount(labels, minlength=cluster_count)
    candidate_indices = range(cluster_count)
    if min_lightness is not None:
        bright_enough_indices = []
        for index in candidate_indices:
            center_rgb = np.clip(model.cluster_centers_[index], 0, 255).astype(int).tolist()
            if rgb_to_lab(center_rgb)["L"] >= min_lightness:
                bright_enough_indices.append(index)

        if bright_enough_indices:
            candidate_indices = bright_enough_indices

    dominant_index = max(candidate_indices, key=lambda index: counts[index])

    rgb = np.clip(model.cluster_centers_[dominant_index], 0, 255)
    return rgb.astype(int).tolist()

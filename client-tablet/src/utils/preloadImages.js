const preloadedSrcs = new Set();

export function preloadImages(srcs) {
  for (const src of srcs) {
    if (!src || preloadedSrcs.has(src)) {
      continue;
    }

    preloadedSrcs.add(src);
    const image = new Image();
    image.decoding = "async";
    image.src = src;

    if (typeof image.decode === "function") {
      image.decode().catch(() => {
        // The browser cache request is still useful even if decode fails.
      });
    }
  }
}

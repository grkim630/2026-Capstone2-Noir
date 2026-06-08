export function createRepresentativePreview(frames) {
  if (!frames?.length) {
    return null;
  }

  const index = Math.floor(frames.length / 2);
  return URL.createObjectURL(frames[index]);
}

export function revokeCapturePreview(previewUrl) {
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

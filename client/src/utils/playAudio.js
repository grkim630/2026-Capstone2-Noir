let activeAudio = null;

export function trackAudio(audio) {
  stopActiveAudio();
  activeAudio = audio;
}

export function stopActiveAudio() {
  if (!activeAudio) {
    return;
  }

  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
}

/**
 * @param {string} src
 * @returns {Promise<number>} 재생 길이(ms)
 */
export function playAudio(src) {
  stopActiveAudio();

  return new Promise((resolve) => {
    const audio = new Audio(src);
    activeAudio = audio;

    const finish = (durationMs = 0) => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      resolve(durationMs);
    };

    const startPlayback = () => {
      const durationMs = Number.isFinite(audio.duration)
        ? Math.max(audio.duration * 1000, 0)
        : 0;

      audio
        .play()
        .then(() => {
          audio.onended = () => finish(durationMs);
        })
        .catch(() => finish(0));
    };

    audio.onerror = () => finish(0);

    if (audio.readyState >= 1) {
      startPlayback();
      return;
    }

    audio.addEventListener("loadedmetadata", startPlayback, { once: true });
    audio.load();
  });
}

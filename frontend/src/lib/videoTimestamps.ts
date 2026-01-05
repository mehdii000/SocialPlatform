// Video timestamp persistence for seamless navigation

const STORAGE_KEY = "video_timestamps";

interface VideoTimestamps {
  [postId: string]: number;
}

export const getVideoTimestamp = (postId: number): number => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;
    const timestamps: VideoTimestamps = JSON.parse(stored);
    return timestamps[postId.toString()] || 0;
  } catch {
    return 0;
  }
};

export const setVideoTimestamp = (postId: number, time: number): void => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    const timestamps: VideoTimestamps = stored ? JSON.parse(stored) : {};
    timestamps[postId.toString()] = time;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // Silently fail if storage is unavailable
  }
};

export const clearVideoTimestamp = (postId: number): void => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const timestamps: VideoTimestamps = JSON.parse(stored);
    delete timestamps[postId.toString()];
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(timestamps));
  } catch {
    // Silently fail
  }
};

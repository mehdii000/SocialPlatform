// Image and Video Compression Utilities

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

// Compress image using canvas
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions while maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not compress image"));
            return;
          }

          // If compressed is larger than original, use original
          const compressedFile = new File(
            [blob.size < file.size ? blob : file],
            file.name.replace(/\.[^.]+$/, ".jpg"),
            { type: "image/jpeg" }
          );

          resolve(compressedFile);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Could not load image"));
    img.src = URL.createObjectURL(file);
  });
};

// Compress video using MediaRecorder API
export const compressVideo = async (
  file: File,
  options: { maxSizeMB?: number; maxDuration?: number } = {}
): Promise<File> => {
  const { maxSizeMB = 50, maxDuration = 60 } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = async () => {
      const duration = Math.min(video.duration, maxDuration);
      const fileSizeMB = file.size / (1024 * 1024);

      // If video is small enough, return original
      if (fileSizeMB <= maxSizeMB && video.duration <= maxDuration) {
        resolve(file);
        return;
      }

      try {
        // Calculate target dimensions
        let width = video.videoWidth;
        let height = video.videoHeight;
        const maxDim = 1280;

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Ensure even dimensions for encoding
        width = Math.round(width / 2) * 2;
        height = Math.round(height / 2) * 2;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        // Calculate bitrate based on target size
        const targetBitrate = Math.floor((maxSizeMB * 8 * 1024 * 1024) / duration);
        const videoBitrate = Math.min(targetBitrate * 0.9, 2500000); // Cap at 2.5 Mbps

        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp9",
          videoBitsPerSecond: videoBitrate,
        });

        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, ".webm"),
            { type: "video/webm" }
          );
          resolve(compressedFile);
        };

        mediaRecorder.onerror = () => reject(new Error("Video compression failed"));

        video.currentTime = 0;
        video.play();
        mediaRecorder.start();

        const renderFrame = () => {
          if (video.currentTime < duration && !video.paused) {
            ctx.drawImage(video, 0, 0, width, height);
            requestAnimationFrame(renderFrame);
          } else {
            mediaRecorder.stop();
            video.pause();
          }
        };

        video.onplay = renderFrame;

        // Stop at max duration
        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            video.pause();
          }
        }, duration * 1000 + 500);
      } catch (error) {
        // Fallback: return original if compression fails
        console.warn("Video compression not supported, using original");
        resolve(file);
      }
    };

    video.onerror = () => reject(new Error("Could not load video"));
    video.src = URL.createObjectURL(file);
  });
};

// Quick compress that chooses the right method based on file type
export const compressMedia = async (
  file: File,
  type: "image" | "video"
): Promise<File> => {
  if (type === "image") {
    return compressImage(file);
  } else {
    return compressVideo(file);
  }
};

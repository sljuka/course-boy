import { useEffect, type RefObject } from "react";

// Printing a lesson: Chromium prints a <video> as an empty box with its
// controls, ignoring even a `poster`. So each video in the lesson gets its
// first frame captured once it has loaded: set as its `poster` (shown before it
// plays) and as an image next to it that only printing shows, while the player
// itself is hidden in print (typeset.css, `.video-print-frame`).
export function useVideoPrintFrames(containerRef: RefObject<HTMLElement | null>, contentKey: unknown) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cleanups: (() => void)[] = [];

    function capture(video: HTMLVideoElement) {
      if (video.dataset.printFrame === "done" || video.videoWidth === 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      try {
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const frame = canvas.toDataURL("image/jpeg", 0.85);
        video.poster = frame;
        const image = document.createElement("img");
        image.alt = "";
        image.className = "video-print-frame";
        image.src = frame;
        video.insertAdjacentElement("afterend", image);
        video.dataset.printFrame = "done";
      } catch {
        // A frame that can't be read: it prints as before.
      }
    }

    function watch(video: HTMLVideoElement) {
      if (video.dataset.printFrame) return;
      video.dataset.printFrame = "pending";
      // A `matko-asset://` video is another origin to the window, so its frame
      // can only be read into the canvas when it's loaded with CORS (the asset
      // handler in electron/main.ts allows it). Set before the listeners below,
      // then reloaded: the setting only applies to a new load.
      const needsCors = video.crossOrigin === null;
      if (needsCors) video.crossOrigin = "anonymous";
      // A loaded video hasn't necessarily drawn a frame yet (only metadata is
      // preloaded, and a frame read too early is black): seek to the start and
      // capture once a frame has really been presented.
      // A frame isn't always presented right after the seek (the player may
      // not be laid out yet), so capture a moment later anyway; whichever
      // comes first wins.
      const onFrame = () => capture(video);
      const onSeeked = () => {
        video.requestVideoFrameCallback?.(onFrame);
        const timer = setTimeout(onFrame, 500);
        cleanups.push(() => clearTimeout(timer));
      };
      const onMetadata = () => {
        video.currentTime = 0.001;
      };
      video.addEventListener("seeked", onSeeked, { once: true });
      video.addEventListener("loadedmetadata", onMetadata, { once: true });
      cleanups.push(() => {
        video.removeEventListener("seeked", onSeeked);
        video.removeEventListener("loadedmetadata", onMetadata);
      });
      if (needsCors) video.load();
      else if (video.readyState >= 1) onMetadata();
    }

    container.querySelectorAll("video").forEach(watch);
    // The editor renders its blocks after mount.
    const observer = new MutationObserver(() => container.querySelectorAll("video").forEach(watch));
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [containerRef, contentKey]);
}

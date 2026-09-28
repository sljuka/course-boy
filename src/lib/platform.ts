// Tags <html data-platform="mac|other"> so CSS can leave room for the OS
// window controls in the app-drawn title bar (see `--app-titlebar-inset-*` in
// src/index.css). Read from the renderer's own navigator rather than asking the
// main process, which would need an IPC method for one string.
export function tagDocumentPlatform(): void {
  const isMac = navigator.platform.toLowerCase().startsWith("mac");

  document.documentElement.dataset.platform = isMac ? "mac" : "other";
}

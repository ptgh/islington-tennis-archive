export interface GuideWindow { x: number; y: number; width: number; height: number }

/** Keep the guide and its controls reachable after dragging, resizing or zooming. */
export function boundGuideWindow(rect: GuideWindow, viewportWidth: number, viewportHeight: number): GuideWindow {
  const maxWidth = Math.max(0, viewportWidth - 24), maxHeight = Math.max(0, viewportHeight - 24);
  const width = Math.max(Math.min(420, maxWidth), Math.min(rect.width, maxWidth));
  const height = Math.max(Math.min(340, maxHeight), Math.min(rect.height, maxHeight));
  return { width, height, x: Math.max(12, Math.min(rect.x, viewportWidth - width - 12)), y: Math.max(12, Math.min(rect.y, viewportHeight - height - 12)) };
}

export function initialGuideWindow(width: number, height: number): GuideWindow {
  return boundGuideWindow({ x: width - 970, y: Math.max(72, (height - 640) / 2), width: 860, height: 640 }, width, height);
}

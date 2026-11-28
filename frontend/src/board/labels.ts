const COLORS = 8

/** Deterministic color class for a label (case-insensitive). */
export function labelColor(text: string): string {
  let h = 0
  for (const ch of text.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return `label-c${h % COLORS}`
}

/**
 * Float Points — shows "+N" text that floats up and fades out from an element.
 * Used for rep point feedback on likes, spots, reviews, etc.
 */
export function floatPoints(element: HTMLElement | null, text: string) {
  if (!element) return;

  const rect = element.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float-pts';
  el.textContent = text;
  el.style.left = `${rect.left + rect.width / 2 - 15}px`;
  el.style.top = `${rect.top - 5}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

/**
 * Trigger haptic feedback if available
 */
export function haptic(pattern: number | number[] = 25) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

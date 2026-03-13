/**
 * floatPoints — shows a floating "+N" animation from a DOM element
 * Uses the .fpt class from index.css
 */
export function floatPoints(el: HTMLElement | null, points: number) {
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const span = document.createElement('span');
  span.className = 'fpt';
  span.textContent = `+${points}`;
  span.style.left = `${rect.left + rect.width / 2 - 12}px`;
  span.style.top = `${rect.top - 4}px`;
  document.body.appendChild(span);

  setTimeout(() => span.remove(), 1300);
}

export function haptic(ms: number = 25) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

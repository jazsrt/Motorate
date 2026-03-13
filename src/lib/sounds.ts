const audioCtx = typeof window !== 'undefined'
  ? new (window.AudioContext || (window as any).webkitAudioContext)()
  : null;

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export const sounds = {
  /** Soft tick for points earned */
  points: () => playTone(880, 0.08, 'sine', 0.1),

  /** Metallic ascending chime for badge unlock */
  badge: () => {
    playTone(523, 0.15, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.12), 100);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.15), 200);
  },

  /** Four-note ascending tone for rank up */
  rankUp: () => {
    playTone(440, 0.12, 'triangle', 0.1);
    setTimeout(() => playTone(554, 0.12, 'triangle', 0.1), 80);
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.12), 160);
    setTimeout(() => playTone(880, 0.25, 'triangle', 0.15), 240);
  },

  /** Quick pop for sticker applied */
  pop: () => playTone(600, 0.06, 'square', 0.08),

  /** Deep thud for claim success */
  claim: () => playTone(120, 0.3, 'sine', 0.2),
};

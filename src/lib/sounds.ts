const audioCtx = typeof window !== 'undefined'
  ? new (window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext)()
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
  revEngine: () => {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o1 = audioCtx.createOscillator();
    const g1 = audioCtx.createGain();
    o1.type = 'sawtooth';
    o1.frequency.setValueAtTime(55, audioCtx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.25);
    o1.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.5);
    g1.gain.setValueAtTime(0.22, audioCtx.currentTime);
    g1.gain.linearRampToValueAtTime(0.28, audioCtx.currentTime + 0.15);
    g1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    o1.connect(g1); g1.connect(audioCtx.destination);
    o1.start(); o1.stop(audioCtx.currentTime + 0.5);
    const o2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(110, audioCtx.currentTime);
    o2.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.25);
    o2.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 0.5);
    g2.gain.setValueAtTime(0.1, audioCtx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    o2.connect(g2); g2.connect(audioCtx.destination);
    o2.start(); o2.stop(audioCtx.currentTime + 0.45);
  },

  horn: () => {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [0, 0.25].forEach(offset => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(220, audioCtx!.currentTime + offset);
      o.frequency.setValueAtTime(277, audioCtx!.currentTime + offset + 0.06);
      g.gain.setValueAtTime(0.15, audioCtx!.currentTime + offset);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx!.currentTime + offset + 0.2);
      o.connect(g); g.connect(audioCtx!.destination);
      o.start(audioCtx!.currentTime + offset);
      o.stop(audioCtx!.currentTime + offset + 0.2);
    });
  },

  points: () => playTone(880, 0.08, 'sine', 0.1),

  badge: () => {
    playTone(523, 0.15, 'sine', 0.18);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.18), 100);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.18), 200);
  },

  rankUp: () => { sounds.horn(); },

  pop: () => playTone(800, 0.06, 'square', 0.1),

  claim: () => playTone(120, 0.3, 'sine', 0.2),
};

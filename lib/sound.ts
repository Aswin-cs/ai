let sharedAudioCtx: AudioContext | null = null;

/**
 * Plays a loud, high-pitched three-note alert chime via the Web Audio API
 * when an AI backend route responds.
 * Safe no-op if audio playback is unavailable or blocked by browser autoplay policy.
 */
export function playAiResponseSound(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 1046.5, start: 0, duration: 0.14 },     // C6
      { freq: 1318.51, start: 0.09, duration: 0.14 }, // E6
      { freq: 1567.98, start: 0.18, duration: 0.28 }, // G6
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.freq, now + note.start);

      gain.gain.setValueAtTime(0.0001, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.38, now + note.start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration + 0.02);
    }
  } catch {
    // Ignore audio errors when autoplay or Web Audio is restricted
  }
}

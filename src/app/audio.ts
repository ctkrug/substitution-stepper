const MUTE_KEY = "substitution-stepper:muted";

function readMuted(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // Storage unavailable (private browsing, tests) — mute state just won't persist.
  }
}

/**
 * Synth-only SFX (WebAudio oscillators, no audio files) for step / error /
 * win feedback. The AudioContext is created lazily on first use so it's
 * opened during a user gesture, satisfying browser autoplay policy, and is
 * simply absent (a harmless no-op) in environments without WebAudio, e.g.
 * the test runner.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private muted = readMuted();

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    writeMuted(muted);
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!this.ctx) this.ctx = new Ctor();
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType, gainValue: number): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  /** A single chalk-tap tick for each forward/back step. */
  step(): void {
    this.tone(520, 0.08, "square", 0.05);
  }

  /** A low buzz for parse/runtime errors. */
  error(): void {
    this.tone(140, 0.18, "sawtooth", 0.07);
  }

  /** A two-note chime when the board reaches its final value. */
  win(): void {
    this.tone(660, 0.12, "triangle", 0.08);
    setTimeout(() => this.tone(880, 0.18, "triangle", 0.08), 90);
  }
}

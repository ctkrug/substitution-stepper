import { afterEach, describe, expect, it, vi } from "vitest";
import { Sfx } from "../src/app/audio";

class FakeAudioParam {
  value = 0;
  exponentialRampToValueAtTime = vi.fn();
}

class FakeOscillatorNode {
  type = "";
  frequency = new FakeAudioParam();
  connect = vi.fn(() => ({ connect: vi.fn() }));
  start = vi.fn();
  stop = vi.fn();
}

class FakeGainNode {
  gain = new FakeAudioParam();
  connect = vi.fn();
}

class FakeAudioContext {
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillatorNode[] = [];
  createOscillator = vi.fn(() => {
    const osc = new FakeOscillatorNode();
    this.oscillators.push(osc);
    return osc;
  });
  createGain = vi.fn(() => new FakeGainNode());
}

function withFakeAudioContext<T>(run: (ctx: FakeAudioContext) => T): T {
  const ctx = new FakeAudioContext();
  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: function (this: unknown) {
      return ctx;
    },
  };
  try {
    return run(ctx);
  } finally {
    delete (globalThis as unknown as { window?: unknown }).window;
  }
}

function withFakeLocalStorage<T>(run: () => T): T {
  const store = new Map<string, string>();
  const fake = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = fake;
  try {
    return run();
  } finally {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  }
}

describe("Sfx", () => {
  afterEach(() => {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  });

  it("defaults to unmuted when there is no persisted preference", () => {
    expect(new Sfx().isMuted()).toBe(false);
  });

  it("does not throw calling step/error/win in an environment without WebAudio", () => {
    const sfx = new Sfx();
    expect(() => sfx.step()).not.toThrow();
    expect(() => sfx.error()).not.toThrow();
    expect(() => sfx.win()).not.toThrow();
  });

  it("toggleMuted flips and returns the new state", () => {
    const sfx = new Sfx();
    expect(sfx.toggleMuted()).toBe(true);
    expect(sfx.isMuted()).toBe(true);
    expect(sfx.toggleMuted()).toBe(false);
    expect(sfx.isMuted()).toBe(false);
  });

  it("persists mute state across instances via localStorage", () => {
    withFakeLocalStorage(() => {
      const first = new Sfx();
      first.setMuted(true);
      const second = new Sfx();
      expect(second.isMuted()).toBe(true);
    });
  });

  it("silently no-ops when localStorage is unavailable", () => {
    const sfx = new Sfx();
    expect(() => sfx.setMuted(true)).not.toThrow();
  });

  it("treats a corrupt persisted value as unmuted, not a crash", () => {
    withFakeLocalStorage(() => {
      localStorage.setItem("substitution-stepper:muted", "yes-please");
      expect(new Sfx().isMuted()).toBe(false);
    });
  });

  it("survives a localStorage that throws on read", () => {
    const throwing = {
      getItem: () => {
        throw new Error("SecurityError: storage blocked");
      },
      setItem: () => {
        throw new Error("SecurityError: storage blocked");
      },
    };
    (globalThis as unknown as { localStorage: unknown }).localStorage =
      throwing;
    expect(() => new Sfx().isMuted()).not.toThrow();
    expect(new Sfx().isMuted()).toBe(false);
  });

  it("plays a real oscillator tone through a WebAudio context", () => {
    withFakeAudioContext((ctx) => {
      new Sfx().step();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      const osc = ctx.oscillators[0];
      expect(osc.type).toBe("square");
      expect(osc.frequency.value).toBeGreaterThan(0);
      expect(osc.start).toHaveBeenCalledTimes(1);
      expect(osc.stop).toHaveBeenCalledTimes(1);
    });
  });

  it("reuses the same AudioContext across multiple sounds", () => {
    withFakeAudioContext((ctx) => {
      const sfx = new Sfx();
      sfx.step();
      sfx.error();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });
  });

  it("does not play a tone while muted", () => {
    withFakeAudioContext((ctx) => {
      const sfx = new Sfx();
      sfx.setMuted(true);
      sfx.step();
      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });
  });

  it("win plays two chimes: one immediately, one after a short delay", () => {
    vi.useFakeTimers();
    withFakeAudioContext((ctx) => {
      new Sfx().win();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(90);
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
      expect(ctx.oscillators[0].frequency.value).not.toBe(
        ctx.oscillators[1].frequency.value,
      );
    });
    vi.useRealTimers();
  });
});

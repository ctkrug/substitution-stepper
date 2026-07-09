import { afterEach, describe, expect, it } from "vitest";
import { Sfx } from "../src/app/audio";

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
});

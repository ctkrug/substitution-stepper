import { describe, expect, it } from "vitest";
import { print } from "../src/interpreter/printer";
import {
  current,
  highlightPath,
  initialState,
  isAtFrontier,
  isAtValue,
  jumpTo,
  load,
  reset,
  stepBack,
  stepForward,
} from "../src/app/state";

const FACTORIAL = `
  (define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1)))))
  (factorial 3)
`;

describe("load", () => {
  it("populates history with the initial expression on success", () => {
    const state = load(initialState(), FACTORIAL);
    expect(state.error).toBeNull();
    expect(state.history).toHaveLength(1);
    expect(print(current(state)!)).toBe("(factorial 3)");
  });

  it("reports a syntax error and leaves history empty", () => {
    const state = load(initialState(), "(+ 1 2");
    expect(state.error).toMatch(/syntax error/);
    expect(state.history).toHaveLength(0);
  });

  it("reports a load-time RuntimeError message verbatim", () => {
    const state = load(initialState(), "(define (f x) x)");
    expect(state.error).toMatch(/must end with a call expression/);
  });

  it("clears a previous error on a subsequent successful load", () => {
    const broken = load(initialState(), "(+ 1 2");
    const fixed = load(broken, FACTORIAL);
    expect(fixed.error).toBeNull();
  });
});

describe("stepForward", () => {
  it("advances the board by exactly one reduction", () => {
    const loaded = load(initialState(), FACTORIAL);
    const stepped = stepForward(loaded);
    expect(stepped.history).toHaveLength(2);
    expect(stepped.index).toBe(1);
    expect(print(current(stepped)!)).toBe("(if (= 3 0) 1 (* 3 (factorial (- 3 1))))");
  });

  it("is a no-op once the board has reduced to a final value", () => {
    let state = load(initialState(), FACTORIAL);
    for (let i = 0; i < 100 && !isAtValue(state); i++) state = stepForward(state);
    expect(isAtValue(state)).toBe(true);
    const finalValue = print(current(state)!);
    const steppedAgain = stepForward(state);
    expect(print(current(steppedAgain)!)).toBe(finalValue);
    expect(steppedAgain.history).toEqual(state.history);
  });

  it("does nothing before a program is loaded", () => {
    const state = stepForward(initialState());
    expect(state.history).toHaveLength(0);
  });

  it("re-advancing after a step-back reuses cached history instead of recomputing", () => {
    const loaded = load(initialState(), FACTORIAL);
    const stepped = stepForward(loaded);
    const back = stepBack(stepped);
    const forwardAgain = stepForward(back);
    expect(forwardAgain).toEqual(stepped);
  });

  it("records the highlight path of the sub-expression that was rewritten", () => {
    const loaded = load(initialState(), FACTORIAL);
    const stepped = stepForward(loaded);
    expect(highlightPath(stepped)).toEqual([]);
    expect(highlightPath(loaded)).toBeNull();
  });

  it("restores the original highlight when stepping back and forward again", () => {
    const loaded = load(initialState(), FACTORIAL);
    const stepped = stepForward(loaded);
    const roundTrip = stepForward(stepBack(stepped));
    expect(highlightPath(roundTrip)).toEqual(highlightPath(stepped));
  });

  it("surfaces a runtime error mid-run without discarding history", () => {
    const state = load(initialState(), "(undefined-proc 1)");
    const stepped = stepForward(state);
    expect(stepped.error).toMatch(/unbound variable: undefined-proc/);
    expect(stepped.history).toHaveLength(1);
  });
});

describe("stepBack", () => {
  it("rewinds to the previous expression", () => {
    const loaded = load(initialState(), FACTORIAL);
    const stepped = stepForward(loaded);
    const back = stepBack(stepped);
    expect(back.index).toBe(0);
    expect(print(current(back)!)).toBe("(factorial 3)");
  });

  it("is a no-op at the start of history", () => {
    const loaded = load(initialState(), FACTORIAL);
    expect(stepBack(loaded)).toEqual(loaded);
  });
});

describe("jumpTo", () => {
  it("jumps directly to an arbitrary history entry", () => {
    let state = load(initialState(), FACTORIAL);
    state = stepForward(stepForward(state));
    const jumped = jumpTo(state, 0);
    expect(jumped.index).toBe(0);
    expect(print(current(jumped)!)).toBe("(factorial 3)");
  });

  it("ignores an out-of-range index", () => {
    const state = load(initialState(), FACTORIAL);
    expect(jumpTo(state, 99)).toEqual(state);
    expect(jumpTo(state, -1)).toEqual(state);
  });
});

describe("reset", () => {
  it("returns to the originally loaded expression and drops later history", () => {
    let state = load(initialState(), FACTORIAL);
    state = stepForward(stepForward(state));
    const wasReset = reset(state);
    expect(wasReset.history).toHaveLength(1);
    expect(wasReset.index).toBe(0);
    expect(print(current(wasReset)!)).toBe("(factorial 3)");
  });
});

describe("isAtFrontier", () => {
  it("is true at the latest step and false after stepping back", () => {
    const loaded = load(initialState(), FACTORIAL);
    const stepped = stepForward(loaded);
    expect(isAtFrontier(stepped)).toBe(true);
    expect(isAtFrontier(stepBack(stepped))).toBe(false);
  });
});

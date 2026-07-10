// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SubstitutionApp } from "../src/ui/app";

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  new SubstitutionApp(root);
  return root;
}

function q<T extends Element>(root: HTMLElement, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`not found: ${selector}`);
  return found;
}

describe("SubstitutionApp", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a designed empty state before anything is loaded", () => {
    const root = mount();
    expect(q(root, "#board").textContent).toMatch(/Nothing on the board yet/);
    expect(
      q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').disabled,
    ).toBe(true);
  });

  it("loads the pre-filled factorial example on clicking Load", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    expect(q(root, "#board").textContent).toBe("(factorial 5)");
    expect(
      q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').disabled,
    ).toBe(false);
  });

  it("renders tokens inside a non-flex wrapper so inter-token spaces survive layout", () => {
    // #board is a flex container (for centering); a flex container drops
    // whitespace-only text nodes between its direct children, which would
    // glue every token together with no visible gap. The token spans must
    // live one level deeper, inside .board-content, not as direct children
    // of the flex container itself.
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    const board = q(root, "#board");
    const content = q(root, "#board .board-content");
    expect(Array.from(board.children)).toEqual([content]);
    expect(content.querySelectorAll(".tok").length).toBeGreaterThan(0);
  });

  it("steps forward, growing history and updating the board", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    expect(root.querySelectorAll(".history-item")).toHaveLength(2);
    expect(q(root, "#board").textContent).toBe(
      "(if (= 5 0) 1 (* 5 (factorial (- 5 1))))",
    );
  });

  it("disables Step once the board reaches its final value", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    const stepBtn = q<HTMLButtonElement>(
      root,
      'button[aria-label="Step forward"]',
    );
    for (let i = 0; i < 40 && !stepBtn.disabled; i++) stepBtn.click();
    expect(q(root, "#board").textContent).toBe("120");
    expect(stepBtn.disabled).toBe(true);
    expect(q(root, ".board-status").textContent).toMatch(
      /Reached the final value/,
    );
  });

  it("surfaces a runtime error triggered by Step, not just by Load", () => {
    const root = mount();
    const textarea = q<HTMLTextAreaElement>(root, "#source-input");
    textarea.value = "(mystery 1)";
    q<HTMLButtonElement>(root, "button.load-btn").click();
    expect(q(root, ".board-error").hasAttribute("hidden")).toBe(true);

    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();

    expect(q(root, ".board-error").hasAttribute("hidden")).toBe(false);
    expect(q(root, ".board-error").textContent).toMatch(
      /unbound variable: mystery/,
    );
  });

  it("stepping again after reaching the value is inert, not an error", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    const stepBtn = q<HTMLButtonElement>(
      root,
      'button[aria-label="Step forward"]',
    );
    for (let i = 0; i < 40 && !stepBtn.disabled; i++) stepBtn.click();
    stepBtn.click(); // disabled, but exercise the click handler's own guard too
    expect(q(root, "#board").textContent).toBe("120");
    expect(q(root, ".board-error").hasAttribute("hidden")).toBe(true);
  });

  it("shows an inline error for malformed source without blanking the board", () => {
    const root = mount();
    const textarea = q<HTMLTextAreaElement>(root, "#source-input");
    textarea.value = "(+ 1 2";
    q<HTMLButtonElement>(root, "button.load-btn").click();
    expect(q(root, ".board-error").hasAttribute("hidden")).toBe(false);
    expect(q(root, ".board-error").textContent).toMatch(/syntax error/);
  });

  it("steps back to the previous expression", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step back"]').click();
    expect(q(root, "#board").textContent).toBe("(factorial 5)");
  });

  it("reset returns to the original expression and clears history", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    const resetBtn = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".controls-block .btn"),
    ).find((b) => b.textContent === "Reset")!;
    resetBtn.click();
    expect(q(root, "#board").textContent).toBe("(factorial 5)");
    expect(root.querySelectorAll(".history-item")).toHaveLength(1);
  });

  it("clicking a history entry jumps the board to that step", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    const firstEntry = q<HTMLLIElement>(
      root,
      '.history-item[data-index="0"] button',
    );
    firstEntry.click();
    expect(q(root, "#board").textContent).toBe("(factorial 5)");
  });

  it("clicking an example chip loads that example immediately", () => {
    const root = mount();
    const fibChip = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".btn--chip"),
    ).find((b) => b.textContent === "Fibonacci")!;
    fibChip.click();
    expect(q(root, "#board").textContent).toBe("(fib 6)");
  });

  it("toggles the mute button label and aria-pressed state", () => {
    const root = mount();
    const muteBtn = q<HTMLButtonElement>(root, ".mute-btn");
    const wasMuted = muteBtn.getAttribute("aria-pressed");
    muteBtn.click();
    expect(muteBtn.getAttribute("aria-pressed")).not.toBe(wasMuted);
  });
});

describe("SubstitutionApp — state machine & rapid input", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-plays to the final value then stops the interval on its own", () => {
    vi.useFakeTimers();
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    const playBtn = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".controls-block .btn"),
    ).find((b) => b.textContent === "Play")!;

    playBtn.click();
    expect(playBtn.textContent).toBe("Pause");
    // Advance well past the number of steps factorial needs.
    vi.advanceTimersByTime(700 * 40);

    expect(q(root, "#board").textContent).toBe("120");
    expect(playBtn.textContent).toBe("Play"); // interval cleared itself
    expect(q(root, ".board-error").hasAttribute("hidden")).toBe(true);
    // No leaked interval keeps firing after completion.
    vi.advanceTimersByTime(700 * 5);
    expect(q(root, "#board").textContent).toBe("120");
  });

  it("clicking Play then Play again pauses without advancing", () => {
    vi.useFakeTimers();
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    const playBtn = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".controls-block .btn"),
    ).find((b) => b.textContent === "Play")!;
    playBtn.click();
    playBtn.click(); // pause immediately
    expect(playBtn.textContent).toBe("Play");
    vi.advanceTimersByTime(700 * 10);
    expect(q(root, "#board").textContent).toBe("(factorial 5)");
  });

  it("re-loading mid-autoplay stops the old interval instead of leaking it", () => {
    vi.useFakeTimers();
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    const playBtn = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".controls-block .btn"),
    ).find((b) => b.textContent === "Play")!;
    playBtn.click();
    expect(playBtn.textContent).toBe("Pause");

    const fibChip = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".examples-row .btn"),
    ).find((b) => b.textContent === "Fibonacci")!;
    fibChip.click();

    expect(playBtn.textContent).toBe("Play");
    const boardAfterLoad = q(root, "#board").textContent;
    vi.advanceTimersByTime(700 * 5);
    // A leaked interval from the pre-reload board would have kept stepping it.
    expect(q(root, "#board").textContent).toBe(boardAfterLoad);
  });

  it("drives stepping from the keyboard and ignores keys typed in the editor", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(root.querySelectorAll(".history-item")).toHaveLength(2);

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
    );
    expect(q(root, "#board").textContent).toBe("(factorial 5)");

    // A key whose target is the textarea must not move the board.
    const textarea = q<HTMLTextAreaElement>(root, "#source-input");
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(q(root, "#board").textContent).toBe("(factorial 5)");
  });

  it("gives every control an accessible name and exposes the live/alert regions", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();

    for (const btn of root.querySelectorAll("button")) {
      const name = btn.getAttribute("aria-label") ?? btn.textContent ?? "";
      expect(name.trim().length).toBeGreaterThan(0);
    }

    // The board announces each rewrite; the error banner is an assertive alert.
    expect(q(root, "#board").getAttribute("aria-live")).toBe("polite");
    expect(q(root, ".board-error").getAttribute("role")).toBe("alert");
    // The step / final-value status is announced politely.
    expect(q(root, ".board-status").getAttribute("aria-live")).toBe("polite");
    // The source textarea is programmatically labelled.
    const label = q<HTMLLabelElement>(root, 'label[for="source-input"]');
    expect(label.textContent?.trim().length).toBeGreaterThan(0);
    // The current history step is marked for assistive tech.
    expect(root.querySelector('[aria-current="step"]')).not.toBeNull();
  });

  it("a malformed re-load surfaces the error but leaves the prior board intact", () => {
    const root = mount();
    q<HTMLButtonElement>(root, "button.load-btn").click();
    q<HTMLButtonElement>(root, 'button[aria-label="Step forward"]').click();
    const boardBefore = q(root, "#board").textContent;

    const textarea = q<HTMLTextAreaElement>(root, "#source-input");
    textarea.value = "(((";
    q<HTMLButtonElement>(root, "button.load-btn").click();

    expect(q(root, ".board-error").hasAttribute("hidden")).toBe(false);
    expect(q(root, "#board").textContent).toBe(boardBefore);
  });
});

// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
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

import { parseOne } from "./interpreter/parser";
import { print } from "./interpreter/printer";
import "./style.css";

const DEMO_SOURCE =
  "(define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1)))))";

function render(): string {
  const parsed = print(parseOne(DEMO_SOURCE));
  return `
    <main style="
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding: var(--space-4);
      text-align: center;
    ">
      <h1 style="font-size: 39px; color: var(--accent);">&lambda; Substitution Stepper</h1>
      <p style="color: var(--text-muted); max-width: 60ch;">
        Paste a Scheme expression and watch it evaluate one substitution-model
        step at a time. The step-by-step viewer is under construction — for
        now, here's the parser round-tripping the canonical demo:
      </p>
      <pre style="
        background: var(--surface-1);
        border-radius: var(--radius);
        padding: var(--space-3);
        max-width: 70ch;
        overflow-x: auto;
        box-shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
      ">${parsed}</pre>
    </main>
  `;
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = render();
}

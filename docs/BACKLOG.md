# Backlog

Epics and stories for v1. Every story lists concrete, checkable acceptance
criteria — no "works well" vibes. Story 1.1 is the wow moment and ships
first; nothing else is load-bearing before it works end to end.

## Epic 1 — Interpreter core & step engine

- [x] **1.1 Wow moment: define, call, and step factorial to completion**
  - Pasting `(define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1))))) (factorial 5)` and clicking "Load" shows the initial call expression on the board.
  - Clicking "Step" repeatedly rewrites the expression in place through every substitution until it reaches the literal value `120`, with no crash or stuck state.
  - Clicking "Step" after reaching the final value is a no-op (disabled or clearly inert), not an error.

- [x] **1.2 Environment model with lexical scoping**
  - Nested `lambda` bodies resolve free variables from enclosing environments, not just the global one.
  - Shadowing a parameter name in an inner scope does not mutate the outer binding.

- [x] **1.3 Step-capturing evaluator for core special forms**
  - Each of `define`, `lambda`, `if`, `cond`, and procedure application produces at least one discrete, capturable step, verified by a test asserting the step count for a fixed example.
  - Evaluating `(if #f 1 2)` steps to `2` without ever substituting the untaken `1` branch.

- [x] **1.4 Back/rewind and full history scrubbing**
  - "Step back" undoes the most recent step and re-renders the prior expression exactly.
  - A history list shows every intermediate expression in order, and clicking any entry jumps the board to that point.

- [x] **1.5 Design polish: chalkboard board rendering**
  - The expression board fills at least 60% of viewport height on desktop, per `docs/DESIGN.md`'s layout intent.
  - Stepping forward plays the chalk-circle-and-erase animation from `docs/DESIGN.md`, and the animation is skipped (state still updates) when `prefers-reduced-motion` is set.

## Epic 2 — Editor, parsing & error handling

- [x] **2.1 Code input with paste/load and example library**
  - A code input accepts pasted Scheme source, and a "Load" action parses it into a fresh environment.
  - A list of at least four SICP-classic examples (factorial, fibonacci, sum-to-n, ackermann) loads pre-filled source with one click.

- [x] **2.2 Inline error reporting for parse and runtime failures**
  - Pasting an expression with an unbalanced paren shows an inline error naming the problem (e.g. "unterminated list, expected ')'") instead of a blank board or console-only error.
  - Calling an undefined procedure or applying a non-procedure value shows a clear inline error instead of crashing the step loop.
  - The error clears automatically the next time valid source is loaded.

- [x] **2.3 Design polish: error and empty states**
  - The empty board (nothing loaded yet) shows a designed empty state per `docs/DESIGN.md`, not a blank rectangle.
  - Error text uses the chalk-scribble/danger token treatment specified in `docs/DESIGN.md`, not a browser-default alert.

## Epic 3 — Playback, controls & accessibility

- [x] **3.1 Step controls: forward, back, play/auto-step, reset**
  - "Play" auto-steps at a fixed interval and can be paused mid-run without losing state.
  - "Reset" returns the board to the originally loaded expression and clears history.

- [x] **3.2 Keyboard and touch control parity**
  - Arrow keys (or space/backspace) step forward/back when the board has focus.
  - All controls are reachable and operable via touch, with hit targets of at least 44px on a 390px-wide viewport.

- [x] **3.3 Synth SFX with persisted mute**
  - Step, error, and "reached final value" events each play a distinct WebAudio-synthesized sound (no audio files), per `docs/DESIGN.md`'s SFX list.
  - A mute toggle silences all SFX, and its state persists across a page reload via `localStorage`.

- [x] **3.4 Design polish: responsive composition at 390 / 768 / 1440**
  - No horizontal scroll and no overlapping controls at 390px, 768px, or 1440px widths.
  - The primary action (Step) reads as visually dominant at all three widths (squint test).

## Epic 4 — Ship readiness

- [x] **4.1 Static build & subpath deploy readiness**
  - `npm run build` produces a self-contained `dist/` referencing only relative asset paths (no leading `/`), checkable by grepping the built HTML/CSS/JS.
  - The built site opens and functions correctly when served from a non-root subpath (e.g. a local static server rooted one directory above `dist/`).

- [x] **4.2 Test coverage for the evaluator's core reduction rules**
  - Automated tests cover at least: arithmetic reduction, `if`/`cond` branching, recursive procedure calls, and environment shadowing.
  - `npm test` passes with zero failing tests in CI.

- [ ] **4.3 Landing polish for public release**
  - README includes clear "try it" instructions pointing at the deployed static build.
  - `docs/DESIGN.md`'s signature detail (the chalk-circle rewrite) is visibly present in the shipped build, not just planned.
  - Remaining: no live deployment exists yet to link from the README — the build is verified subpath-ready (see 4.1) but not yet published.

# Chalkstep

**▶ Live demo — [apps.charliekrug.com/substitution-stepper](https://apps.charliekrug.com/substitution-stepper/)**

_Watch Scheme recursion rewrite itself, step by step._

[![CI](https://github.com/ctkrug/substitution-stepper/actions/workflows/ci.yml/badge.svg)](https://github.com/ctkrug/substitution-stepper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-ffcf56.svg)](LICENSE)

Chalkstep is a browser tool for anyone working through **SICP** who wants to
_see_ the substitution model instead of trusting it. Paste a small Scheme
program, hit **Step**, and the call expression rewrites in place, one reduction
at a time, the way the lectures chalk it up on the board.

This isn't a REPL. A REPL gives you the answer. Chalkstep gives you the
_rewrite_: the expression redraws itself in place, one reduction per click, with
the sub-expression that just changed circled, so you can watch your recursion
unfold and collapse back down to a value.

## Why

_Structure and Interpretation of Computer Programs_ teaches the substitution
model as the tool for reading recursive procedures: an application rewrites to
its body with the arguments substituted in, sub-expressions reduce inside-out,
and eventually you're left with a value. Lecturers draw this by hand. Every
online Scheme REPL skips straight to the answer. Nothing lets you paste your own
code and watch _your_ recursion rewrite itself, step by step. That's the gap
Chalkstep fills.

## What it does

1. You paste a small Scheme program: definitions, then one calling expression.
2. It parses and loads your definitions into an environment.
3. You hit **Step**, and the call rewrites in place, one substitution or
   reduction per step, until it bottoms out at a value.
4. You can rewind, replay, or jump to any point, and read the full derivation as
   a scrollback of every intermediate form.

## Sample derivation

`(factorial 3)` stepping all the way down to its value, exactly what the board
renders:

```text
(factorial 3)
→ (if (= 3 0) 1 (* 3 (factorial (- 3 1))))
→ (if #f 1 (* 3 (factorial (- 3 1))))
→ (* 3 (factorial (- 3 1)))
→ (* 3 (factorial 2))
→ (* 3 (if (= 2 0) 1 (* 2 (factorial (- 2 1)))))
  ...
→ (* 3 (* 2 (* 1 1)))
→ (* 3 (* 2 1))
→ (* 3 2)
→ 6
```

## Features

- **A step-capturing evaluator.** `step(expr, env)` applies exactly one
  substitution-model reduction and hands back the result, so calling it in a
  loop _is_ the evaluator and calling it once per click _is_ the visualizer.
- **The changed term is highlighted.** After every step the sub-expression that
  was just rewritten is circled in chalk yellow, so you always see what moved.
- **Full history.** Forward/back controls, play/pause auto-stepping, and a
  history scrubber you can click into at any point.
- **A hand-written Scheme reader** (lexer + parser, no parsing-library
  dependency) for a practical teaching subset: `define`, `lambda`, `if`/`cond`,
  quoting, arithmetic and comparison primitives, and recursion.
- **Higher-order procedures and the SICP closure pattern.**
  `(define add5 (make-adder 5))` then `(add5 10)` reduces step by step, closure
  and all.
- **Designed error states.** Unbalanced parens, an unbound variable, or applying
  a non-procedure show as an inline message instead of a blank board or a
  console-only crash.
- **Synth sound.** WebAudio oscillators (no audio files) tick on each step,
  buzz on an error, and chime when the board reaches a final value, with a mute
  toggle that persists across reloads.

## Try it locally

```sh
npm install
npm run dev
```

Open the local URL Vite prints. The factorial demo is pre-filled: click
**Load**, then **Step** (or press the right arrow / space) to watch
`(factorial 5)` rewrite itself down to `120`.

## Stack

TypeScript throughout: a hand-written Scheme interpreter (lexer, parser,
environment model, step-capturing evaluator) and a static, self-contained front
end that renders the step sequence. Built and tested with Vite and Vitest. No
backend, no accounts. It's a fully client-side static site with relative asset
paths, so it serves cleanly from a subpath.

## Development

```sh
npm install
npm run dev         # local dev server
npm test            # run the test suite
npm run coverage    # test suite with a v8 coverage report
npm run typecheck   # tsc --noEmit
npm run build       # production build to dist/
```

The suite runs 195 tests with the interpreter core at over 99% line coverage.
See [`docs/VISION.md`](docs/VISION.md) for the design rationale,
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the code is organized,
and [`docs/BACKLOG.md`](docs/BACKLOG.md) for what's done vs. left.

## License

MIT. See [`LICENSE`](LICENSE).

---

More of Charlie's projects → [apps.charliekrug.com](https://apps.charliekrug.com)

# Substitution Stepper

Paste a small Scheme expression, call a procedure, and watch it evaluate one
**substitution-model step at a time** — exactly like the SICP lectures draw it
on the whiteboard.

This isn't a REPL. A REPL gives you the answer. Substitution Stepper gives you
the _rewrite_: the expression literally redraws itself in place, one reduction
per click, so you can see the recursive process unfold the way Abelson chalks
it up on the board.

## Why

Structure and Interpretation of Computer Programs teaches the substitution
model as the mental tool for reading recursive procedures: an application
rewrites to its body with parameters substituted, sub-expressions reduce
inside-out, and eventually you're left with a value. Lecturers draw this by
hand. Every online Scheme REPL skips straight to the answer. Nothing lets you
paste your own code and watch _your_ recursion rewrite itself, step by step.

## What it does

1. You paste a small Scheme program (definitions + one calling expression).
2. It parses and loads your definitions into an environment.
3. You hit **Step**, and the call expression rewrites in place — one
   substitution or reduction per step — until it bottoms out at a value.
4. You can rewind, replay, or jump to the end, and see the full derivation as
   a scrollback of every intermediate form.

The canonical demo: define `factorial` recursively, call `(factorial 5)`, and
step through the entire unwinding — the same walkthrough as the lectures, but
interactive and yours.

## Features

- A hand-written Scheme reader (lexer + parser) for a practical subset of the
  language: `define`, `lambda`, `if`/`cond`, arithmetic and comparison
  primitives, and recursion.
- A step-capturing evaluator: `step(expr, env)` applies exactly one
  substitution-model reduction and hands back the result, so calling it in a
  loop _is_ the evaluator and calling it once per click _is_ the visualizer.
- A step-by-step board: forward/back controls, play/pause auto-stepping, a
  full history scrubber you can jump into at any point, and the rewritten
  sub-expression highlighted in place after every step.
- A library of four classic SICP examples (factorial, fibonacci, sum-to-n,
  ackermann) that load with one click.
- Designed, inline error states for parse and runtime failures (unbalanced
  parens, unbound variables, applying a non-procedure) instead of a blank
  board or a console-only crash.
- Synth SFX (WebAudio oscillators, no audio files) for step / error / reaching
  a final value, with a mute toggle that persists across reloads.

## Try it

```sh
npm install
npm run dev
```

Open the local URL Vite prints. The factorial demo is pre-filled — click
**Load**, then **Step** (or press the right arrow / space) repeatedly to watch
`(factorial 5)` rewrite itself down to `120`.

## Stack

TypeScript throughout: a hand-written Scheme interpreter (lexer, parser,
environment model, step-capturing evaluator) with no parsing-library
dependency, and a static, self-contained front end that renders the step
sequence. Built and tested with Vite and Vitest. No backend — it's a fully
client-side static site, built with relative asset paths so it can be served
from a subpath.

## Status

The core substitution-model stepper, editor, controls, and design system are
built and tested. See [`docs/VISION.md`](docs/VISION.md) for the full design,
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the code is organized,
and [`docs/BACKLOG.md`](docs/BACKLOG.md) for what's done vs. left.

## Development

```sh
npm install
npm run dev         # local dev server
npm test            # run the test suite
npm run typecheck   # tsc --noEmit
npm run build       # production build to dist/
```

## License

MIT — see [`LICENSE`](LICENSE).

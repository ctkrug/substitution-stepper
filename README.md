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

## Planned features

- Hand-written Scheme reader (lexer + parser) for a practical subset of the
  language: `define`, `lambda`, `if`/`cond`, arithmetic, pairs/lists, and
  recursion.
- An evaluator instrumented to expose every intermediate reduction as a
  discrete, replayable step rather than just a final value.
- A step-by-step visualizer: forward/back controls, a full history scrubber,
  and a rendering of the expression tree that highlights exactly what's being
  substituted at each step.
- A small library of classic SICP examples (factorial, fibonacci, sum-to-n,
  ackermann) to load with one click.
- Clear, designed error states for invalid or unsupported syntax — the goal is
  a teaching tool, so failures should explain themselves.

## Stack

TypeScript throughout: a hand-written Scheme interpreter (lexer, parser,
environment model, step-capturing evaluator) with no parsing-library
dependency, and a static, self-contained front end that renders the step
sequence. Built and tested with Vite and Vitest. No backend — it's a fully
client-side static site.

## Status

Early scaffold. See [`docs/VISION.md`](docs/VISION.md) for the full design
and [`docs/BACKLOG.md`](docs/BACKLOG.md) for the build plan.

## Development

```sh
npm install
npm run dev       # local dev server
npm test          # run the test suite
npm run build     # production build to dist/
```

## License

MIT — see [`LICENSE`](LICENSE).

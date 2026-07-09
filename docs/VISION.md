# Vision

## The problem

The substitution model is the core mental tool SICP uses to teach recursion:
an application rewrites to its body with arguments substituted in, then
sub-expressions reduce inside-out until a value falls out. Lecturers draw
this by hand on a chalkboard, one rewrite at a time. Every online Scheme
environment — REPLs, playgrounds, notebook kernels — skips straight from
input to final value. There is no tool where you paste your _own_ recursive
definition and watch the substitution unfold, step by step, the way it was
taught.

## Who it's for

Anyone learning (or re-learning, or teaching) recursion and the substitution
model: SICP readers, CS1/CS2 students, TAs building lecture demos, and
self-taught programmers who understand recursion by output but not by
process. It's a teaching visualizer, not a production REPL — correctness and
legibility of the _steps_ matter more than performance or language coverage.

## The core idea

A hand-written Scheme interpreter, but instrumented differently than a normal
one: instead of `evaluate(expr) -> value`, the core primitive is
`step(expr) -> expr'` — one substitution or reduction applied, returning the
next intermediate expression. Calling `step` repeatedly on the trace is
exactly the evaluator; calling it once and rendering the result is the
teaching tool. The interpreter and the visualizer are the same engine viewed
at two zoom levels.

## Key design decisions

- **Hand-written interpreter, no parser library.** The whole point is
  instrumenting the reduction process ourselves; a black-box eval() would
  hide exactly what we're trying to show.
- **Steps operate on the AST, not the source text.** Nodes are printed back
  to text after each step (`printer.ts`) so the UI always shows valid
  Scheme, never a half-rewritten string.
- **One reduction per step, not one `eval()` call per step.** A single
  procedure call might take many steps to fully reduce (substitute
  arguments, then reduce the `if`, then reduce the recursive call, ...) —
  granularity is what makes the rewrite legible, matching the whiteboard.
- **Small, deliberate language subset.** `define`, `lambda`, `if`/`cond`,
  arithmetic and comparison primitives, pairs/lists, recursion. No
  `call/cc`, no macros, no tail-call-specific semantics beyond what the
  substitution model itself implies — breadth would dilute the one thing
  this tool does well.
- **Static, client-only site.** No backend, no persistence beyond
  `localStorage` for preferences (e.g. mute state). Everything runs in the
  browser so it can be hosted as a plain static bundle.
- **Errors are part of the teaching surface.** Parse and evaluation errors
  render inline, in the chalkboard idiom (see `docs/DESIGN.md`), not as
  console noise or a crash — a student pasting broken code should learn
  something from the failure too.

## What "v1 done" looks like

- Paste a small program (definitions + one calling expression), load it, and
  step forward/back through every intermediate reduction until a final
  value is reached.
- The canonical demo — define `factorial`, call `(factorial 5)`, step through
  the full unwinding — works end to end and is the first thing a visitor can
  try (a one-click "load example" list covers a handful of SICP classics).
- A full step history is visible and scrubbable, not just forward-only.
- The page is a finished, designed artifact per `docs/DESIGN.md`: it looks
  intentional at phone and desktop widths, not a functional-but-bare debug
  view.
- Invalid input produces a clear, in-place error rather than a crash or a
  silent no-op.

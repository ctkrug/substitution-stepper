---
title: "Chalkstep: watching the SICP substitution model rewrite itself"
published: false
tags: scheme, typescript, sicp, interpreters
---

When you read the recursion chapter of SICP, the substitution model looks
obvious on the page. `(factorial 5)` becomes `(* 5 (factorial 4))` becomes
`(* 5 (* 4 (factorial 3)))`, and so on down to a value. Abelson draws it by
hand, one rewrite at a time, and it makes sense while you watch it happen.

Then you open a Scheme REPL to try it yourself and it prints `120`. The whole
middle, the part that actually taught you anything, is gone.

I built [Chalkstep](https://apps.charliekrug.com/substitution-stepper/) to keep
the middle. You paste a small program, press Step, and the call expression
rewrites in place, one reduction per click, with the term that just changed
circled. Here are the two decisions that shaped the whole thing.

## One function is both the evaluator and the visualizer

The core is a single function:

```ts
step(expr: SchemeNode, env: Env): StepResult | null;
```

It applies exactly one leftmost-innermost reduction and returns the new
expression, or `null` when the expression is already a value. That's it. Call it
in a loop and you have an interpreter. Call it once per button click and you
have the visualizer. There is no separate "evaluation engine" that the UI has to
peek inside; the reduction _is_ the frame.

The nice consequence is that the interpreter never has to explain itself to the
UI. Every intermediate form the UI shows is a real state the evaluator passed
through, because the UI only ever holds outputs of `step`. Testing is the same
story: the entire evaluator is exercised by asserting on the sequence of strings
`step` produces, no DOM required.

`StepResult` also carries a `path`: the list of child indices from the root down
to the node that was rewritten. The renderer walks the expression tree with the
same path and wraps that one node in a `<mark>`, which is how the "circle the
term you're about to rewrite" highlight stays exactly in sync with what actually
reduced.

## Substitution really means substitution

The tempting shortcut is to evaluate with an environment: bind the parameters in
a new frame and look them up. That produces the right answer, but it is not the
substitution model, and it would show the wrong thing. The model in SICP is
textual: applying a procedure replaces its parameters in the body with the
argument values, verbatim, and _that rewritten body_ is what you see next.

So Chalkstep does the literal rewrite. Applying `(lambda (x) (+ x x))` to `5`
walks the body and swaps every free `x` for `5`, giving `(+ 5 5)` as the next
on-screen form. Two cases need care: `quote`d data is never substituted into,
and a nested `lambda` that reuses a name shadows the outer binding, so the
substitution stops at its boundary. Getting the shadowing right was the one spot
that needed real test coverage; it's easy to leak an outer value into an inner
body that rebinds the same parameter.

A related detail: a bare `(define add5 (make-adder 5))` stores its value
_unevaluated_. When you later call `(add5 10)`, the operator resolves to
`(make-adder 5)`, which is not a procedure yet, so the step rewrites the operator
and lets the next step reduce it, one hop at a time. That's how the closure
pattern from the book shows every stage instead of jumping to the answer.

## What I'd do differently

The supported language is a deliberate teaching subset (`define`, `lambda`,
`if`/`cond`, numeric and comparison primitives). I'd add `let` next, since it is
sugar over a lambda application and would visualize well. I kept the node types
as a plain tagged union rather than a class hierarchy, which made the parser and
printer trivial but means a few `switch` statements repeat the same shape; a
small visitor would tidy that without much ceremony.

Source and tests are on [GitHub](https://github.com/ctkrug/substitution-stepper).
It's a static TypeScript site, no backend, built with Vite and tested with
Vitest. If you teach or are learning from SICP, paste your own procedure in and
watch it come apart.

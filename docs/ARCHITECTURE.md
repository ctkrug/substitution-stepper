# Architecture

A concise map of the codebase for anyone (including a future session)
picking this up cold. See `docs/VISION.md` for _why_, `docs/DESIGN.md`
for the visual direction, and `docs/BACKLOG.md` for what's built vs. left.

## Layout

```
src/
  interpreter/          # the Scheme core — no DOM knowledge, fully unit-tested
    ast.ts              # SchemeNode union (symbol/number/boolean/string/list) + constructors
    lexer.ts            # source text -> Token[]
    parser.ts           # Token[] -> SchemeNode (parseOne, parseProgram)
    printer.ts          # SchemeNode -> source text (round-trips the parser)
    environment.ts      # Env: parent-chained frames (define/lookup/has/extend)
    substitute.ts       # substitute(node, bindings): the textual parameter rewrite
    primitives.ts       # + - * / = < > <= >= as SchemeNode -> SchemeNode functions
    stepper.ts          # step(expr, env): one substitution-model reduction
    loader.ts           # loadProgram(source): folds defines into an Env, returns the initial call
    errors.ts           # RuntimeError (evaluation-time; distinct from Lex/ParseError)
  app/                  # framework-agnostic state layer — no DOM knowledge, fully unit-tested
    state.ts            # AppState + load/stepForward/stepBack/jumpTo/reset (pure functions)
    examples.ts         # the four SICP-classic example sources
    audio.ts            # Sfx: WebAudio-synthesized step/error/win SFX + persisted mute
  ui/                   # DOM layer — renders app/ state, wires events
    board.ts            # renderBoardHtml(node, highlightPath): SchemeNode -> highlighted HTML
    app.ts              # SubstitutionApp: builds the page shell, binds events, re-renders on state change
  main.ts               # entry point: mounts SubstitutionApp into #app
  style.css             # design tokens (docs/DESIGN.md) + all component styles
test/                   # one file per module above, plus app.test.ts (jsdom DOM
                        #   smoke tests) and properties.test.ts (fast-check
                        #   property tests over the pure interpreter)
```

## Data flow

1. **Parse.** `lexer.tokenize` → `parser.parseProgram` turns pasted source into
   `SchemeNode[]`, one per top-level form.
2. **Load.** `loader.loadProgram` walks those forms: every `define` folds into
   a fresh global `Env` (procedure defines become `(lambda (params) body)`
   values); the final non-define form becomes `initial`, the board's starting
   expression.
3. **Step.** `stepper.step(expr, env)` finds the leftmost-innermost reducible
   sub-expression and applies exactly one reduction:
   - `if`/`cond` with a literal test collapse to the taken branch.
   - An application with all-literal operands and a primitive operator computes
     the primitive's result (`primitives.ts`).
   - An application with all-literal operands and a user-defined operator
     substitutes the procedure's parameters for the arguments throughout its
     body (`substitute.ts`) and splices that in place of the call.
   - Anything else recurses into the first not-yet-reduced sub-expression.
   - Returns `null` once `expr` is a value (atom, quoted data, or a bare
     `lambda`) — nothing left to step.

   Each call also returns the **path** (list indices) to the sub-expression it
   rewrote, so the UI can highlight exactly that node.

4. **State.** `app/state.ts` wraps `step`/`loadProgram` in a plain-data reducer:
   `AppState` holds `history` (every expression seen) and `index` (where the
   board is currently looking), so stepping back and re-stepping forward reuse
   cached history instead of re-deriving it. Errors (`LexError`/`ParseError`/
   `RuntimeError`) are caught here and turned into a user-facing string,
   without discarding the last valid board state.
5. **Render.** `ui/app.ts`'s `SubstitutionApp` builds the page shell once,
   then re-renders on every state transition: `ui/board.ts` turns the current
   `SchemeNode` into highlighted HTML, the history list/controls/error banner
   reflect `AppState` directly, and `app/audio.ts`'s `Sfx` plays step/error/win
   feedback (muted state persisted to `localStorage`).

## Design notes / non-obvious decisions

- **Why textual substitution instead of a runtime environment for closures:**
  the whole point of the project is to _show_ the SICP substitution model
  happening, so `substitute()` literally rewrites parameter names to argument
  values in the AST — that rewritten tree is what's printed to the board.
  `Env` still exists and is real (parent-chained frames, tested independently
  in `environment.test.ts`) but is only used for the global `define` table;
  nested-lambda shadowing is handled by `substitute()` not re-binding into a
  lambda that shadows one of the names being substituted.
- **Why `step()` special-cases symbols in operator position:** a symbol like
  `+` or `factorial` isn't itself "a value" (see `isValue`), but it must not be
  treated as a free-standing reducible expression either — otherwise a
  primitive name would look like an unbound variable lookup. It's resolved
  once, at the point of application, against `PRIMITIVES` first and `Env`
  second.
- **Why highlight paths are cached per history entry** (`AppState.highlights`,
  parallel to `history`) rather than a single "last highlight" field:
  stepping back and then forward again needs to replay the _same_ rewrite
  highlight, not lose it.
- **Why `step()` rejects an expression once it exceeds ~2000 nodes:** a
  recursive definition with no reachable base case (a missing or wrong
  terminating condition — an easy real mistake) never returns `null`; the
  substituted tree just grows every step, each step slower than the last,
  with no way to recover short of closing the tab. The cap sits far above
  any built-in example's peak (ackermann(3,3) tops out under 250 nodes) but
  well below where per-step cost turns pathological, so it fails fast with a
  clear message instead of hanging.
- **Static, subpath-safe build:** `vite.config.ts` sets `base: "./"`; every
  asset reference in `index.html`/`style.css` is relative. Verified by
  building and serving `dist/` from a nested directory (see BACKLOG 4.1).
- **Why the board's markup renders into `.board-content`, not `#board`
  itself:** `#board` is `display: flex` (to center its content). A flex
  container drops whitespace-only text nodes between its children entirely —
  since `board.ts` joins sibling token `<span>`s with plain space characters,
  rendering straight into a flex container glued every token together with
  no visible gap (e.g. `(factorial5)`). jsdom has no CSS layout engine, so
  the DOM test suite never caught this; only screenshotting the real built
  app surfaced it. The tokens now render into a plain, non-flex
  `.board-content` block one level down; `#board` keeps `display: flex`
  only to center that single wrapper.

## Running things

```sh
npm install
npm run dev         # local dev server
npm test            # vitest run (all suites)
npm run coverage    # vitest run --coverage (v8, scoped to src/)
npm run typecheck   # tsc --noEmit
npm run format      # prettier --write .
npm run build       # tsc --noEmit && vite build -> dist/
```

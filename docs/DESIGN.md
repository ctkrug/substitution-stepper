# Design direction

## 1. Aesthetic direction

**Chalkboard lecture hall.** Chalkstep looks like a well-worn
university chalkboard mid-lecture: deep chalkboard green-black, warm chalk-white
prose, and a chalk-yellow accent used exactly the way a lecturer's hand
circles the term they're about to rewrite. The whole premise of this project
is "watch the expression get chalked-up and rewritten in place" — the visual
language should earn that literally, not just say it in copy.

This is deliberately not another dark-glass SaaS panel: no blue accent, no
flat single-hue cards, no drop-shadow-on-white-card look. It's warm, a little
dusty, textured, and unapologetically about the board, not chrome around it.

## 2. Tokens

| Token              | Value                                                                                                        | Use                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `--bg`             | `#161f1a`                                                                                                    | page background (chalkboard base)                         |
| `--surface-1`      | `#1e2b23`                                                                                                    | panel / card surface                                      |
| `--surface-2`      | `#28382e`                                                                                                    | raised surface (active step card, modals)                 |
| `--text`           | `#f3efe2`                                                                                                    | primary chalk-white text                                  |
| `--text-muted`     | `#aebbaf`                                                                                                    | secondary / caption text (dusty sage)                     |
| `--accent`         | `#ffcf56`                                                                                                    | chalk yellow — the "circle this term" color, primary CTA  |
| `--accent-support` | `#ff8a3d`                                                                                                    | chalk orange — secondary emphasis, hover glow             |
| `--success`        | `#7ed9a4`                                                                                                    | mint chalk — final value reached                          |
| `--danger`         | `#ff6b6b`                                                                                                    | chalk red — parse/eval errors                             |
| Display font       | **Fraunces** (Google Fonts), fallback `Georgia, serif`                                                       | wordmark, headings — warm, slightly quirky academic serif |
| UI/code font       | **JetBrains Mono** (Google Fonts), fallback `ui-monospace, monospace`                                        | expression rendering, buttons, labels, body copy          |
| Spacing unit       | 8px scale (8/16/24/32/48/64)                                                                                 | all layout spacing                                        |
| Corner radius      | 10px standard, 6px for small controls                                                                        | soft chalk-drawn rectangles, not sharp, not pill          |
| Shadow             | layered soft shadow, `0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35)` + 2% opacity grain overlay       | depth without looking like glass                          |
| Motion             | UI transitions 160ms ease-out; step-rewrite highlight pulse 90ms ease-out; respects `prefers-reduced-motion` |                                                           |

Type scale: 1.25 ratio from a 16px base (16 / 20 / 25 / 31 / 39 / 49px).

## 3. Layout intent

The hero **is the expression board**: a large chalkboard panel holding the
current expression, rendered large and centered, with the step controls
(back / step / play / reset) docked directly beneath it as a chalk-drawn
button row. On desktop (1440×900) the board takes the top ~65% of the
viewport with a slim sidebar/drawer for loaded definitions and the step
history scrubber below; on phone (390×844) the board stacks full-width at
the top, controls immediately below, history collapses into a swipeable
strip. No board ever sits as a small fixed box in open space — it always
sizes to fill its column.

## 4. Signature detail

A subtle chalk-dust grain texture (SVG turbulence noise, ~3% opacity) over
the chalkboard background, and — the real signature move — every
substitution step animates as a hand-wobbly chalk circle/underline (SVG
stroke-dasharray draw-on, 90ms) around the sub-expression about to be
rewritten, then a chalk-dust "erase" wipe before the replacement text draws
in. This is the literal visual of a lecturer circling a term and rewriting it.

## 5. Juice plan (interaction feedback)

Chalkstep is a teaching toy, not a game, but stepping should still
feel tactile:

- **Step forward/back**: 90ms chalk-circle draw-on around the reducing
  sub-expression, then a ~120ms chalk-dust erase/redraw swap to the result.
- **Reaching a final value**: the board briefly glows `--success` mint and the
  value gets a chalk double-underline.
- **Parse/eval error**: the offending text gets a `--danger` wavy underline
  (chalk scribble), non-modal, inline.
- **Synth SFX (WebAudio, generated, no files)**, subtle and rate-throttled:
  - `step`: short chalk-tap tick (filtered noise burst, ~40ms)
  - `error`: soft low double-tick
  - `done`: two-note ascending chime (triangle oscillator)
  - Mute toggle persisted to `localStorage`; `AudioContext` created lazily on
    first user gesture.
- All motion respects `prefers-reduced-motion` (drop the circle/erase
  animation and particles, keep the state change instant).

Every later build/QA pass follows this file. Changes to direction or tokens
happen deliberately, in their own commit, with the reason stated here.

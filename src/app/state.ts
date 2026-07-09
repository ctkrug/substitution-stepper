import { SchemeNode } from "../interpreter/ast";
import { Env } from "../interpreter/environment";
import { RuntimeError } from "../interpreter/errors";
import { loadProgram } from "../interpreter/loader";
import { LexError } from "../interpreter/lexer";
import { ParseError } from "../interpreter/parser";
import { isValue, step } from "../interpreter/stepper";

/**
 * Everything the board needs to render, decoupled from the DOM so it can be
 * unit-tested as plain data transitions. `history` holds every expression
 * seen so far, in order — `index` is where the board is currently looking,
 * which lets "step back" and history-scrubbing reuse cached forms instead of
 * re-deriving them.
 */
export interface AppState {
  source: string;
  env: Env | null;
  history: SchemeNode[];
  index: number;
  /** Path to the sub-expression the most recent forward step rewrote, for highlighting. */
  highlightPath: number[] | null;
  error: string | null;
}

export function initialState(source = ""): AppState {
  return { source, env: null, history: [], index: 0, highlightPath: null, error: null };
}

/** Parses `source`, replacing the board with the freshly loaded program. On failure, keeps `source` but reports the error and leaves any prior run in place. */
export function load(state: AppState, source: string): AppState {
  try {
    const { env, initial } = loadProgram(source);
    return { source, env, history: [initial], index: 0, highlightPath: null, error: null };
  } catch (err) {
    return { ...state, source, error: describeError(err) };
  }
}

/** Advances one substitution step, or (if the board was rewound) simply moves forward through cached history. A no-op once the current expression is a value. */
export function stepForward(state: AppState): AppState {
  if (!state.env || state.history.length === 0) return state;

  if (state.index < state.history.length - 1) {
    return { ...state, index: state.index + 1, highlightPath: null, error: null };
  }

  try {
    const result = step(state.history[state.index], state.env);
    if (!result) return state;
    return {
      ...state,
      history: [...state.history, result.expr],
      index: state.index + 1,
      highlightPath: result.path,
      error: null,
    };
  } catch (err) {
    return { ...state, error: describeError(err) };
  }
}

/** Rewinds to the previous history entry. A no-op at the start of history. */
export function stepBack(state: AppState): AppState {
  if (state.index === 0) return state;
  return { ...state, index: state.index - 1, highlightPath: null };
}

/** Jumps directly to a history entry, e.g. from clicking the scrubber. */
export function jumpTo(state: AppState, index: number): AppState {
  if (index < 0 || index >= state.history.length) return state;
  return { ...state, index, highlightPath: null };
}

/** Returns to the originally loaded expression and discards subsequent history. */
export function reset(state: AppState): AppState {
  if (state.history.length === 0) return state;
  return { ...state, history: [state.history[0]], index: 0, highlightPath: null, error: null };
}

export function current(state: AppState): SchemeNode | null {
  return state.history[state.index] ?? null;
}

export function isAtValue(state: AppState): boolean {
  const node = current(state);
  return node !== null && isValue(node);
}

export function isAtFrontier(state: AppState): boolean {
  return state.index === state.history.length - 1;
}

function describeError(err: unknown): string {
  if (err instanceof LexError) return `syntax error: ${err.message}`;
  if (err instanceof ParseError) return `syntax error: ${err.message}`;
  if (err instanceof RuntimeError) return err.message;
  return err instanceof Error ? err.message : String(err);
}

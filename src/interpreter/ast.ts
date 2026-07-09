/**
 * S-expressions, both as parsed data and as the shape the evaluator will
 * later substitute and rewrite. Pairs are represented as a spine of Node
 * arrays rather than a boxed cons cell — simpler to render as text for the
 * step viewer, which is the whole point of this project.
 */
export type SchemeNode =
  | { kind: "symbol"; name: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "string"; value: string }
  | { kind: "list"; items: SchemeNode[] };

export function symbol(name: string): SchemeNode {
  return { kind: "symbol", name };
}

export function number(value: number): SchemeNode {
  return { kind: "number", value };
}

export function bool(value: boolean): SchemeNode {
  return { kind: "boolean", value };
}

export function str(value: string): SchemeNode {
  return { kind: "string", value };
}

export function list(items: SchemeNode[]): SchemeNode {
  return { kind: "list", items };
}

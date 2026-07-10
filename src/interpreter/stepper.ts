import { SchemeNode, list, symbol } from "./ast";
import { Env } from "./environment";
import { RuntimeError } from "./errors";
import { PRIMITIVES } from "./primitives";
import { print } from "./printer";
import { substitute } from "./substitute";

export interface StepResult {
  /** The expression after applying exactly one reduction. */
  expr: SchemeNode;
  /** Path (list indices, root-relative) to the sub-expression that changed, for highlighting. */
  path: number[];
}

// Generous headroom over any legitimate teaching example (the built-in
// examples peak under 250 nodes, even ackermann(3,3)) while still catching
// unbounded recursion — e.g. a missing base case — before the ever-larger
// substituted tree makes each subsequent step perceptibly slower.
const MAX_NODE_COUNT = 2000;

function countNodes(node: SchemeNode): number {
  if (node.kind !== "list") return 1;
  let total = 1;
  for (const item of node.items) total += countNodes(item);
  return total;
}

/**
 * True when `node` cannot be reduced further: self-evaluating atoms, quoted
 * data, and `lambda` expressions (procedure values) are all already values.
 */
export function isValue(node: SchemeNode): boolean {
  switch (node.kind) {
    case "number":
    case "boolean":
    case "string":
      return true;
    case "symbol":
      return false;
    case "list": {
      if (node.items.length === 0) return true;
      const head = node.items[0];
      return (
        head.kind === "symbol" &&
        (head.name === "quote" || head.name === "lambda")
      );
    }
  }
}

/**
 * Applies the single leftmost-innermost reduction available in `expr`, or
 * returns `null` if `expr` is already a value. This is the whole engine:
 * calling it repeatedly on its own output reproduces the substitution model
 * one legible rewrite at a time.
 */
export function step(expr: SchemeNode, env: Env): StepResult | null {
  // Check isValue() first: the cap guards against runaway *reduction*, not
  // against legitimately large static data (e.g. a big quoted literal),
  // which must still return null like any other already-reduced value.
  if (isValue(expr)) return null;
  if (countNodes(expr) > MAX_NODE_COUNT) {
    throw new RuntimeError(
      "expression grew too large to continue — this usually means unbounded " +
        "recursion (check for a missing or unreachable base case)",
    );
  }
  return stepExpr(expr, [], env);
}

function stepExpr(
  node: SchemeNode,
  path: number[],
  env: Env,
): StepResult | null {
  if (isValue(node)) return null;

  if (node.kind === "symbol") {
    return { expr: env.lookup(node.name), path };
  }
  if (node.kind !== "list") {
    // Unreachable: isValue() is true for every non-list, non-symbol kind.
    return null;
  }

  const head = node.items[0];
  if (head.kind === "symbol") {
    switch (head.name) {
      case "if":
        return reduceIf(node.items, path, env);
      case "cond":
        return reduceCond(node.items, path, env);
    }
  }

  return reduceApplication(node.items, path, env);
}

function reduceIf(
  items: SchemeNode[],
  path: number[],
  env: Env,
): StepResult | null {
  if (items.length !== 4) {
    throw new RuntimeError("if: expected (if test consequent alternative)");
  }
  const [, test, consequent, alternative] = items;

  if (!isValue(test)) {
    const reduced = stepExpr(test, [...path, 1], env);
    if (!reduced) return null;
    return {
      expr: list([symbol("if"), reduced.expr, consequent, alternative]),
      path: reduced.path,
    };
  }

  if (test.kind !== "boolean") {
    throw new RuntimeError(`if: test must be a boolean, got ${print(test)}`);
  }
  return { expr: test.value ? consequent : alternative, path };
}

function reduceCond(
  items: SchemeNode[],
  path: number[],
  env: Env,
): StepResult | null {
  const clauses = items.slice(1);
  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    if (clause.kind !== "list" || clause.items.length !== 2) {
      throw new RuntimeError("cond: each clause must be (test result)");
    }
    const [test, result] = clause.items;

    if (test.kind === "symbol" && test.name === "else") {
      return { expr: result, path };
    }

    if (!isValue(test)) {
      const reduced = stepExpr(test, [...path, i + 1, 0], env);
      if (!reduced) return null;
      const newClauses = clauses.slice();
      newClauses[i] = list([reduced.expr, result]);
      return {
        expr: list([symbol("cond"), ...newClauses]),
        path: reduced.path,
      };
    }

    if (test.kind !== "boolean") {
      throw new RuntimeError(
        `cond: test must be a boolean, got ${print(test)}`,
      );
    }
    if (test.value) {
      return { expr: result, path };
    }
  }
  throw new RuntimeError("cond: no clause matched and no else was given");
}

function reduceApplication(
  items: SchemeNode[],
  path: number[],
  env: Env,
): StepResult | null {
  const [operator, ...operands] = items;

  // A symbol in operator position is resolved at apply time below (against
  // both PRIMITIVES and env), not stepped on its own — otherwise a primitive
  // name like "+" would look like an unbound variable reference.
  const operatorReady = operator.kind === "symbol" || isValue(operator);
  if (!operatorReady) {
    const reduced = stepExpr(operator, [...path, 0], env);
    if (!reduced) return null;
    return { expr: list([reduced.expr, ...operands]), path: reduced.path };
  }

  for (let i = 0; i < operands.length; i++) {
    if (!isValue(operands[i])) {
      const reduced = stepExpr(operands[i], [...path, i + 1], env);
      if (!reduced) return null;
      const newItems = items.slice();
      newItems[i + 1] = reduced.expr;
      return { expr: list(newItems), path: reduced.path };
    }
  }

  // A user `define` takes precedence over a same-named primitive — matching
  // ordinary Scheme scoping — so it must be checked before PRIMITIVES.
  if (
    operator.kind === "symbol" &&
    !env.has(operator.name) &&
    operator.name in PRIMITIVES
  ) {
    return { expr: PRIMITIVES[operator.name](operands), path };
  }

  const proc =
    operator.kind === "symbol" ? env.lookup(operator.name) : operator;

  // A bare `define` stores its value unevaluated (see loader.ts). That value
  // might be a plain alias — (define f g) binds f to the symbol g itself —
  // or a whole unreduced expression that will itself produce a procedure,
  // e.g. the SICP closure pattern (define add5 (make-adder 5)). Either way,
  // if it isn't a procedure *yet*, rewrite the operator to what it resolved
  // to and let the next step reduce that in turn, exactly like any other
  // not-yet-a-value sub-expression, instead of demanding a lambda in one hop.
  if (!isValue(proc)) {
    return { expr: list([proc, ...operands]), path };
  }

  if (!(
    proc.kind === "list" &&
    proc.items[0]?.kind === "symbol" &&
    proc.items[0].name === "lambda"
  )) {
    throw new RuntimeError(`cannot apply ${print(operator)}: not a procedure`);
  }
  if (proc.items.length !== 3 || proc.items[1].kind !== "list") {
    throw new RuntimeError(
      "malformed lambda: expected (lambda (params...) body)",
    );
  }

  const params = proc.items[1].items.map((p) => {
    if (p.kind !== "symbol")
      throw new RuntimeError("malformed lambda: parameter must be a symbol");
    return p.name;
  });
  const firstDuplicate = params.find((name, i) => params.indexOf(name) !== i);
  if (firstDuplicate) {
    throw new RuntimeError(
      `malformed lambda: duplicate parameter name '${firstDuplicate}'`,
    );
  }
  if (params.length !== operands.length) {
    throw new RuntimeError(
      `${operator.kind === "symbol" ? operator.name : "procedure"}: expected ${params.length} argument(s), got ${operands.length}`,
    );
  }

  const bindings = new Map(params.map((name, i) => [name, operands[i]]));
  return { expr: substitute(proc.items[2], bindings), path };
}

import { SchemeNode, list, symbol } from "./ast";
import { Env } from "./environment";
import { RuntimeError } from "./errors";
import { parseProgram } from "./parser";

export interface LoadedProgram {
  env: Env;
  /** The final top-level expression: the board's starting point. */
  initial: SchemeNode;
}

/**
 * Parses a full program, folding every `define` into a fresh global
 * environment and treating the last top-level form as the expression the
 * board steps through. Mirrors the wow-moment shape: definitions first,
 * one calling expression last.
 */
export function loadProgram(source: string): LoadedProgram {
  const forms = parseProgram(source);
  if (forms.length === 0) {
    throw new RuntimeError(
      "nothing to load — paste a definition and a call expression",
    );
  }

  const env = new Env();
  let initial: SchemeNode | null = null;

  forms.forEach((form, i) => {
    const isLast = i === forms.length - 1;
    if (isDefine(form)) {
      applyDefine(form, env);
      return;
    }
    if (!isLast) {
      throw new RuntimeError(
        "only definitions may appear before the final call expression",
      );
    }
    initial = form;
  });

  if (!initial) {
    throw new RuntimeError(
      "the program must end with a call expression to step through",
    );
  }
  return { env, initial };
}

function isDefine(node: SchemeNode): boolean {
  return (
    node.kind === "list" &&
    node.items[0]?.kind === "symbol" &&
    node.items[0].name === "define"
  );
}

function applyDefine(node: SchemeNode, env: Env): void {
  if (node.kind !== "list" || node.items.length < 2) {
    throw new RuntimeError("malformed define");
  }
  const target = node.items[1];

  if (target.kind === "list") {
    // (define (name params...) body)
    const nameNode = target.items[0];
    if (!nameNode || nameNode.kind !== "symbol") {
      throw new RuntimeError(
        "malformed define: procedure name must be a symbol",
      );
    }
    if (node.items.length !== 3) {
      throw new RuntimeError(
        `define ${nameNode.name}: procedure body must be a single expression`,
      );
    }
    const params = list(target.items.slice(1));
    env.define(nameNode.name, list([symbol("lambda"), params, node.items[2]]));
    return;
  }

  if (target.kind === "symbol") {
    if (node.items.length !== 3) {
      throw new RuntimeError(
        `malformed define: ${target.name} expects exactly one value expression`,
      );
    }
    env.define(target.name, node.items[2]);
    return;
  }

  throw new RuntimeError(
    "malformed define: target must be a symbol or a procedure header",
  );
}

import { SchemeNode } from "./ast";
import { RuntimeError } from "./errors";

/**
 * A chain of lexical frames. Only the global frame is populated by this
 * project's `define`s and primitives — the step-capturing evaluator resolves
 * everything else (including nested `lambda` free variables) by textual
 * substitution rather than by extending this chain at call time. `extend` is
 * still exposed so the environment model itself (frame creation, shadowing,
 * parent lookup) is directly testable independent of the stepper.
 */
export class Env {
  private readonly frame = new Map<string, SchemeNode>();

  constructor(private readonly parent: Env | null = null) {}

  define(name: string, value: SchemeNode): void {
    this.frame.set(name, value);
  }

  has(name: string): boolean {
    if (this.frame.has(name)) return true;
    return this.parent ? this.parent.has(name) : false;
  }

  lookup(name: string): SchemeNode {
    if (this.frame.has(name)) return this.frame.get(name)!;
    if (this.parent) return this.parent.lookup(name);
    throw new RuntimeError(`unbound variable: ${name}`);
  }

  /** Creates a child frame pre-populated with `bindings`, parented to this one. */
  extend(bindings: ReadonlyArray<readonly [string, SchemeNode]>): Env {
    const child = new Env(this);
    for (const [name, value] of bindings) child.define(name, value);
    return child;
  }
}

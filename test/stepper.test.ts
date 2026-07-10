import { describe, expect, it } from "vitest";
import { Env } from "../src/interpreter/environment";
import { RuntimeError } from "../src/interpreter/errors";
import { loadProgram } from "../src/interpreter/loader";
import { parseOne } from "../src/interpreter/parser";
import { print } from "../src/interpreter/printer";
import { isValue, step } from "../src/interpreter/stepper";

/** Steps `expr` to completion, returning every intermediate form including the start and the final value. */
function runToCompletion(source: string, env: Env) {
  let current = parseOne(source);
  const history = [current];
  for (let i = 0; i < 10_000; i++) {
    const result = step(current, env);
    if (!result) return history;
    current = result.expr;
    history.push(current);
  }
  throw new Error(
    "runToCompletion: exceeded 10,000 steps — likely an infinite loop",
  );
}

describe("isValue", () => {
  it("treats atoms as values", () => {
    expect(isValue(parseOne("5"))).toBe(true);
    expect(isValue(parseOne("#t"))).toBe(true);
    expect(isValue(parseOne('"hi"'))).toBe(true);
  });
  it("treats a bare symbol as not-yet-a-value", () => {
    expect(isValue(parseOne("x"))).toBe(false);
  });
  it("treats quoted data and lambda expressions as values", () => {
    expect(isValue(parseOne("'(1 2)"))).toBe(true);
    expect(isValue(parseOne("(lambda (x) x)"))).toBe(true);
  });
  it("treats an unevaluated application as not-yet-a-value", () => {
    expect(isValue(parseOne("(+ 1 2)"))).toBe(false);
  });
});

describe("step: if", () => {
  it("collapses directly to the alternative without touching the consequent", () => {
    const env = new Env();
    const result = step(parseOne("(if #f 1 2)"), env);
    expect(result).not.toBeNull();
    expect(print(result!.expr)).toBe("2");
  });

  it("collapses to the consequent when the test is true", () => {
    const env = new Env();
    const result = step(parseOne("(if #t 1 2)"), env);
    expect(print(result!.expr)).toBe("1");
  });

  it("reduces the test before branching when it isn't yet a value", () => {
    const env = new Env();
    const result = step(parseOne("(if (= 1 1) 1 2)"), env);
    expect(print(result!.expr)).toBe("(if #t 1 2)");
  });

  it("throws when the test reduces to a non-boolean", () => {
    const env = new Env();
    expect(() => step(parseOne("(if 5 1 2)"), env)).toThrow(RuntimeError);
  });
});

describe("step: cond", () => {
  it("collapses to the first clause whose test is true", () => {
    const env = new Env();
    const result = step(parseOne("(cond (#f 1) (#t 2) (else 3))"), env);
    expect(print(result!.expr)).toBe("2");
  });

  it("collapses to the else clause when no earlier test matches", () => {
    const env = new Env();
    const result = step(parseOne("(cond (#f 1) (else 2))"), env);
    expect(print(result!.expr)).toBe("2");
  });

  it("throws when no clause matches and there is no else", () => {
    const env = new Env();
    expect(() => step(parseOne("(cond (#f 1))"), env)).toThrow(
      /no clause matched/,
    );
  });
});

describe("step: application", () => {
  it("applies a primitive once all operands are values", () => {
    const env = new Env();
    const result = step(parseOne("(+ 1 2)"), env);
    expect(print(result!.expr)).toBe("3");
  });

  it("reduces the leftmost non-value operand before applying", () => {
    const env = new Env();
    const result = step(parseOne("(+ (* 2 3) 1)"), env);
    expect(print(result!.expr)).toBe("(+ 6 1)");
  });

  it("substitutes a user-defined procedure's body for the call", () => {
    const env = new Env();
    env.define("square", parseOne("(lambda (x) (* x x))"));
    const result = step(parseOne("(square 5)"), env);
    expect(print(result!.expr)).toBe("(* 5 5)");
  });

  it("prefers a user define over a same-named primitive", () => {
    const env = new Env();
    env.define("+", parseOne("(lambda (a b) (- a b))"));
    const result = step(parseOne("(+ 5 2)"), env);
    expect(print(result!.expr)).toBe("(- 5 2)");
  });

  it("throws calling an undefined procedure", () => {
    const env = new Env();
    expect(() => step(parseOne("(mystery 1)"), env)).toThrow(RuntimeError);
  });

  it("calls a procedure aliased with a bare define, one step at a time", () => {
    // (define f g) stores the raw symbol g as f's value (defines are never
    // eagerly evaluated here — see loader.ts) — operator resolution must
    // keep stepping through that alias instead of demanding f resolve to a
    // lambda in a single lookup.
    const { env, initial } = loadProgram(
      "(define (g x) (* x 2)) (define f g) (f 3)",
    );
    const first = step(initial, env);
    expect(print(first!.expr)).toBe("(g 3)");
    const second = step(first!.expr, env);
    expect(print(second!.expr)).toBe("(* 3 2)");
  });

  it("calls a primitive aliased with a bare define", () => {
    const { env, initial } = loadProgram("(define f +) (f 1 2)");
    const first = step(initial, env);
    expect(print(first!.expr)).toBe("(+ 1 2)");
    const second = step(first!.expr, env);
    expect(print(second!.expr)).toBe("3");
  });

  it("resolves a multi-hop alias chain, one hop per step", () => {
    const { env, initial } = loadProgram(
      "(define (double x) (* x 2)) (define a double) (define b a) (b 5)",
    );
    const steps = runToCompletion(print(initial), env).map(print);
    expect(steps).toEqual(["(b 5)", "(a 5)", "(double 5)", "(* 5 2)", "10"]);
  });

  it("throws applying a non-procedure value", () => {
    const env = new Env();
    env.define("x", parseOne("5"));
    expect(() => step(parseOne("(x 1)"), env)).toThrow(/not a procedure/);
  });

  it("throws on an arity mismatch", () => {
    const env = new Env();
    env.define("f", parseOne("(lambda (a b) (+ a b))"));
    expect(() => step(parseOne("(f 1)"), env)).toThrow(/expected 2 argument/);
  });
});

describe("step returns null once the expression is fully reduced", () => {
  it("a bare literal has nothing left to step", () => {
    const env = new Env();
    expect(step(parseOne("42"), env)).toBeNull();
  });

  it("is a no-op on an already-reduced value even past the node-count cap", () => {
    // The cap exists to catch runaway *reduction* (a missing base case), not
    // to reject legitimately large static data. A big quoted literal is
    // already a value — quote(d) data is never evaluated — so it must
    // return null like any other value, not throw the recursion error.
    const bigList = Array(2500).fill("1").join(" ");
    const env = new Env();
    expect(step(parseOne(`'(${bigList})`), env)).toBeNull();
  });
});

describe("the wow moment: recursive factorial to completion", () => {
  const source = `
    (define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1)))))
    (factorial 5)
  `;

  it("steps from (factorial 5) to the literal value 120", () => {
    const { env, initial } = loadProgram(source);
    const history = runToCompletion(print(initial), env);
    expect(print(history[0])).toBe("(factorial 5)");
    expect(print(history[history.length - 1])).toBe("120");
  });

  it("stepping again once the value is reached is a no-op", () => {
    const { env, initial } = loadProgram(source);
    const history = runToCompletion(print(initial), env);
    const finalValue = history[history.length - 1];
    expect(step(finalValue, env)).toBeNull();
  });

  it("takes a fixed, non-trivial number of discrete steps", () => {
    const { env, initial } = loadProgram(source);
    const history = runToCompletion(print(initial), env);
    // Exercises define (via loadProgram), procedure application, if, and
    // arithmetic primitives across every recursive call — asserting an exact
    // count pins the granularity so a regression that collapses steps (or
    // stalls) is caught immediately.
    expect(history.length).toBe(29);
  });
});

describe("adversarial input: unicode and emoji identifiers", () => {
  it("defines and calls a procedure named with accented and emoji characters", () => {
    const { env, initial } = loadProgram(
      "(define (café-😀 x) (* x 2)) (café-😀 21)",
    );
    const history = runToCompletion(print(initial), env);
    expect(print(history[history.length - 1])).toBe("42");
  });
});

describe("environment model exercised through the stepper", () => {
  it("recursive calls resolve the procedure from the global environment each time", () => {
    const { env, initial } = loadProgram(`
      (define (countdown n) (if (= n 0) 0 (countdown (- n 1))))
      (countdown 3)
    `);
    const history = runToCompletion(print(initial), env);
    expect(print(history[history.length - 1])).toBe("0");
  });

  it("shadowing a parameter name inside a nested lambda does not corrupt the outer substitution", () => {
    const env = new Env();
    env.define(
      "apply-twice",
      parseOne("(lambda (n) ((lambda (n) (+ n 1)) n))"),
    );
    const result = step(parseOne("(apply-twice 10)"), env);
    expect(print(result!.expr)).toBe("((lambda (n) (+ n 1)) 10)");
  });

  it("returns a closure that captures the substituted free variable (higher-order)", () => {
    const { env, initial } = loadProgram(`
      (define (make-adder x) (lambda (y) (+ x y)))
      ((make-adder 3) 4)
    `);
    const history = runToCompletion(print(initial), env);
    // (make-adder 3) must chalk-in 3 for x, producing (lambda (y) (+ 3 y)),
    // which then applies to 4 — the whole point of the substitution model.
    expect(history.some((n) => print(n) === "((lambda (y) (+ 3 y)) 4)")).toBe(
      true,
    );
    expect(print(history[history.length - 1])).toBe("7");
  });
});

describe("step: malformed special forms surface a clear RuntimeError", () => {
  const env = new Env();

  it("rejects an if without all three of test/consequent/alternative", () => {
    expect(() => step(parseOne("(if #t 1)"), env)).toThrow(
      /expected \(if test consequent alternative\)/,
    );
  });

  it("rejects a cond clause that is not (test result)", () => {
    expect(() => step(parseOne("(cond (#t))"), env)).toThrow(
      /each clause must be \(test result\)/,
    );
  });

  it("rejects applying a lambda whose body is more than one expression", () => {
    expect(() => step(parseOne("((lambda (x) x x) 1)"), env)).toThrow(
      /malformed lambda/,
    );
  });

  it("rejects applying a lambda with a non-symbol parameter", () => {
    expect(() => step(parseOne("((lambda (5) 1) 2)"), env)).toThrow(
      /parameter must be a symbol/,
    );
  });

  it("rejects a lambda with a duplicate parameter name instead of silently dropping an argument", () => {
    // bindings was built with `new Map(params.map(...))`, which keeps only
    // the *last* entry for a repeated key — without this check, applying
    // (lambda (x x) (+ x x)) to (1 2) would silently discard the 1.
    expect(() => step(parseOne("((lambda (x x) (+ x x)) 1 2)"), env)).toThrow(
      /duplicate parameter/,
    );
  });

  it("rejects a cond whose reached test is a non-boolean value", () => {
    expect(() => step(parseOne("(cond (5 1))"), env)).toThrow(
      /test must be a boolean/,
    );
  });
});

describe("step: a bare symbol reduces by an environment lookup", () => {
  it("rewrites a standalone variable to its bound value", () => {
    const env = new Env();
    env.define("answer", parseOne("42"));
    const result = step(parseOne("answer"), env);
    expect(print(result!.expr)).toBe("42");
    expect(result!.path).toEqual([]);
  });
});

describe("step: unbounded recursion is caught before it grows without limit", () => {
  it("throws a clear error once the substituted expression grows too large", () => {
    // No base case ever reduces to a value: each application doubles the
    // pending work, so the tree size explodes fast — this must be caught
    // long before it would exhaust memory or hang the tab.
    const { env, initial } = loadProgram(
      "(define (bad n) (+ (bad n) (bad n))) (bad 1)",
    );
    let expr = initial;
    let error: unknown = null;
    for (let i = 0; i < 2000 && !error; i++) {
      try {
        const result = step(expr, env);
        if (!result) break;
        expr = result.expr;
      } catch (err) {
        error = err;
      }
    }
    expect(error).toBeInstanceOf(RuntimeError);
    expect((error as RuntimeError).message).toMatch(/too large|unbounded recursion/);
  });

  it("also catches a realistic user mistake: a negative input that just never hits n = 0", () => {
    // Unlike the doubling example above, this doesn't explode — n counts
    // down forever (-1, -2, -3, ...) instead of ever equaling 0. Same cap,
    // same friendly message, different (much more common) shape of bug.
    const { env, initial } = loadProgram(
      "(define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1))))) (factorial -1)",
    );
    let expr = initial;
    let error: unknown = null;
    for (let i = 0; i < 3000 && !error; i++) {
      try {
        const result = step(expr, env);
        if (!result) break;
        expr = result.expr;
      } catch (err) {
        error = err;
      }
    }
    expect(error).toBeInstanceOf(RuntimeError);
    expect((error as RuntimeError).message).toMatch(/too large|unbounded recursion/);
  });

  it("does not interfere with a legitimately larger example (ackermann(3,3))", () => {
    const { env, initial } = loadProgram(
      "(define (ackermann m n) (cond ((= m 0) (+ n 1)) ((= n 0) (ackermann (- m 1) 1)) (else (ackermann (- m 1) (ackermann m (- n 1)))))) (ackermann 3 3)",
    );
    let expr = initial;
    for (let i = 0; i < 15_000; i++) {
      const result = step(expr, env);
      if (!result) break;
      expr = result.expr;
    }
    expect(print(expr)).toBe("61");
  });
});

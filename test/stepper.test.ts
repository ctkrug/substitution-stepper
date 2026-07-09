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

  it("throws calling an undefined procedure", () => {
    const env = new Env();
    expect(() => step(parseOne("(mystery 1)"), env)).toThrow(RuntimeError);
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

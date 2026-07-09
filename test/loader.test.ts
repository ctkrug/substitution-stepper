import { describe, expect, it } from "vitest";
import { loadProgram } from "../src/interpreter/loader";
import { print } from "../src/interpreter/printer";
import { RuntimeError } from "../src/interpreter/errors";
import { ParseError } from "../src/interpreter/parser";

describe("loadProgram", () => {
  it("folds a procedure define into env and returns the trailing call as initial", () => {
    const { env, initial } = loadProgram(
      "(define (square x) (* x x)) (square 5)",
    );
    expect(print(initial)).toBe("(square 5)");
    expect(print(env.lookup("square"))).toBe("(lambda (x) (* x x))");
  });

  it("folds a value define (define name expr)", () => {
    const { env, initial } = loadProgram("(define pi 3) (+ pi 1)");
    expect(print(initial)).toBe("(+ pi 1)");
    expect(print(env.lookup("pi"))).toBe("3");
  });

  it("supports several defines before the final call", () => {
    const { initial } = loadProgram(
      "(define (a x) x) (define (b x) x) (a (b 1))",
    );
    expect(print(initial)).toBe("(a (b 1))");
  });

  it("a program with only a call expression and no defines still loads", () => {
    const { initial } = loadProgram("(+ 1 2)");
    expect(print(initial)).toBe("(+ 1 2)");
  });

  it("throws on an empty program", () => {
    expect(() => loadProgram("   ")).toThrow(RuntimeError);
  });

  it("throws when the program is only definitions with no call to step", () => {
    expect(() => loadProgram("(define (square x) (* x x))")).toThrow(
      /must end with a call expression/,
    );
  });

  it("throws when a non-define expression appears before the final form", () => {
    expect(() => loadProgram("(+ 1 2) (define x 1) (+ x 1)")).toThrow(
      /only definitions may appear/,
    );
  });

  it("propagates a parse error from malformed source", () => {
    expect(() => loadProgram("(+ 1 2")).toThrow(ParseError);
  });
});

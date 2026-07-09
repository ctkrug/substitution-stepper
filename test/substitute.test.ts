import { describe, expect, it } from "vitest";
import { bool, list, number, symbol } from "../src/interpreter/ast";
import { parseOne } from "../src/interpreter/parser";
import { print } from "../src/interpreter/printer";
import { substitute } from "../src/interpreter/substitute";

function rewrite(source: string, bindings: [string, string][]): string {
  const map = new Map(bindings.map(([name, expr]) => [name, parseOne(expr)]));
  return print(substitute(parseOne(source), map));
}

describe("substitute", () => {
  it("replaces a bound symbol with its value", () => {
    expect(substitute(symbol("n"), new Map([["n", number(5)]]))).toEqual(
      number(5),
    );
  });

  it("leaves an unbound symbol untouched", () => {
    expect(substitute(symbol("n"), new Map([["m", number(5)]]))).toEqual(
      symbol("n"),
    );
  });

  it("leaves atoms other than symbols untouched", () => {
    expect(substitute(number(1), new Map([["n", number(5)]]))).toEqual(
      number(1),
    );
    expect(substitute(bool(true), new Map([["n", number(5)]]))).toEqual(
      bool(true),
    );
  });

  it("substitutes throughout a nested application", () => {
    expect(rewrite("(* n (factorial (- n 1)))", [["n", "5"]])).toBe(
      "(* 5 (factorial (- 5 1)))",
    );
  });

  it("substitutes into every branch of an if", () => {
    expect(rewrite("(if (= n 0) 1 (* n 2))", [["n", "0"]])).toBe(
      "(if (= 0 0) 1 (* 0 2))",
    );
  });

  it("does not substitute inside a quoted form", () => {
    expect(rewrite("'(n n)", [["n", "5"]])).toBe("'(n n)");
  });

  it("does not substitute into a nested lambda that shadows the same name", () => {
    expect(rewrite("(lambda (n) (+ n 1))", [["n", "99"]])).toBe(
      "(lambda (n) (+ n 1))",
    );
  });

  it("still substitutes free variables inside a nested lambda that does not shadow them", () => {
    expect(rewrite("(lambda (x) (+ x n))", [["n", "99"]])).toBe(
      "(lambda (x) (+ x 99))",
    );
  });

  it("substitutes multiple distinct bindings independently", () => {
    const map = new Map([
      ["a", parseOne("1")],
      ["b", parseOne("2")],
    ]);
    expect(print(substitute(parseOne("(+ a b)"), map))).toBe("(+ 1 2)");
  });

  it("returns an unrelated empty list unchanged", () => {
    expect(substitute(list([]), new Map([["n", number(5)]]))).toEqual(list([]));
  });
});

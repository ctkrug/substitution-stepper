import { describe, expect, it } from "vitest";
import { bool, list, number, str, symbol } from "../src/interpreter/ast";
import { ParseError, parseOne, parseProgram } from "../src/interpreter/parser";

describe("parseOne", () => {
  it("parses a flat application", () => {
    expect(parseOne("(+ 1 2)")).toEqual(
      list([symbol("+"), number(1), number(2)]),
    );
  });

  it("parses nested lists", () => {
    expect(parseOne("(f (g 1) 2)")).toEqual(
      list([symbol("f"), list([symbol("g"), number(1)]), number(2)]),
    );
  });

  it("parses atoms", () => {
    expect(parseOne("42")).toEqual(number(42));
    expect(parseOne("#t")).toEqual(bool(true));
    expect(parseOne('"hi"')).toEqual(str("hi"));
    expect(parseOne("x")).toEqual(symbol("x"));
  });

  it("desugars quote shorthand", () => {
    expect(parseOne("'(1 2)")).toEqual(
      list([symbol("quote"), list([number(1), number(2)])]),
    );
  });

  it("rejects a stray closing paren", () => {
    expect(() => parseOne(")")).toThrow(ParseError);
  });

  it("rejects an unterminated list", () => {
    expect(() => parseOne("(+ 1 2")).toThrow(ParseError);
  });

  it("rejects trailing input after a complete expression", () => {
    expect(() => parseOne("1 2")).toThrow(ParseError);
  });

  it("rejects empty input as an unexpected end of input", () => {
    expect(() => parseOne("")).toThrow(/unexpected end of input/);
  });

  it("rejects a dangling quote with nothing to quote", () => {
    expect(() => parseOne("'")).toThrow(ParseError);
  });
});

describe("parseProgram", () => {
  it("parses multiple top-level forms", () => {
    const program = parseProgram("(define x 1) (define y 2) (+ x y)");
    expect(program).toHaveLength(3);
    expect(program[2]).toEqual(list([symbol("+"), symbol("x"), symbol("y")]));
  });

  it("parses an empty program", () => {
    expect(parseProgram("   ")).toEqual([]);
  });
});

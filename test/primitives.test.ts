import { describe, expect, it } from "vitest";
import { bool, number, str } from "../src/interpreter/ast";
import { RuntimeError } from "../src/interpreter/errors";
import { PRIMITIVES } from "../src/interpreter/primitives";

describe("+", () => {
  it("sums its arguments", () => {
    expect(PRIMITIVES["+"]([number(1), number(2), number(3)])).toEqual(
      number(6),
    );
  });
  it("returns 0 for no arguments", () => {
    expect(PRIMITIVES["+"]([])).toEqual(number(0));
  });
  it("rejects a non-number argument", () => {
    expect(() => PRIMITIVES["+"]([number(1), str("x")])).toThrow(RuntimeError);
  });
});

describe("-", () => {
  it("subtracts left to right", () => {
    expect(PRIMITIVES["-"]([number(10), number(3), number(2)])).toEqual(
      number(5),
    );
  });
  it("negates a single argument", () => {
    expect(PRIMITIVES["-"]([number(5)])).toEqual(number(-5));
  });
  it("rejects zero arguments", () => {
    expect(() => PRIMITIVES["-"]([])).toThrow(RuntimeError);
  });
});

describe("*", () => {
  it("multiplies its arguments", () => {
    expect(PRIMITIVES["*"]([number(2), number(3), number(4)])).toEqual(
      number(24),
    );
  });
  it("returns 1 for no arguments", () => {
    expect(PRIMITIVES["*"]([])).toEqual(number(1));
  });
});

describe("/", () => {
  it("divides left to right", () => {
    expect(PRIMITIVES["/"]([number(12), number(2), number(3)])).toEqual(
      number(2),
    );
  });
  it("takes the reciprocal of a single argument", () => {
    expect(PRIMITIVES["/"]([number(4)])).toEqual(number(0.25));
  });
  it("throws on division by zero", () => {
    expect(() => PRIMITIVES["/"]([number(1), number(0)])).toThrow(
      /division by zero/,
    );
  });
});

describe("comparisons", () => {
  it("= is true for equal chains and false otherwise", () => {
    expect(PRIMITIVES["="]([number(2), number(2), number(2)])).toEqual(
      bool(true),
    );
    expect(PRIMITIVES["="]([number(2), number(3)])).toEqual(bool(false));
  });

  it("< holds for a strictly increasing chain", () => {
    expect(PRIMITIVES["<"]([number(1), number(2), number(3)])).toEqual(
      bool(true),
    );
    expect(PRIMITIVES["<"]([number(1), number(3), number(2)])).toEqual(
      bool(false),
    );
  });

  it(">, <=, >= behave pairwise", () => {
    expect(PRIMITIVES[">"]([number(3), number(1)])).toEqual(bool(true));
    expect(PRIMITIVES["<="]([number(2), number(2)])).toEqual(bool(true));
    expect(PRIMITIVES[">="]([number(1), number(2)])).toEqual(bool(false));
  });

  it("rejects comparing zero arguments", () => {
    expect(() => PRIMITIVES["="]([])).toThrow(RuntimeError);
  });
});

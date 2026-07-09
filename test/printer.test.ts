import { describe, expect, it } from "vitest";
import { parseOne } from "../src/interpreter/parser";
import { print } from "../src/interpreter/printer";

function roundTrip(source: string): string {
  return print(parseOne(source));
}

describe("print", () => {
  it("round-trips a flat application", () => {
    expect(roundTrip("(+ 1 2)")).toBe("(+ 1 2)");
  });

  it("round-trips nested lists", () => {
    expect(roundTrip("(f (g 1) 2)")).toBe("(f (g 1) 2)");
  });

  it("round-trips atoms", () => {
    expect(roundTrip("42")).toBe("42");
    expect(roundTrip("#t")).toBe("#t");
    expect(roundTrip("#f")).toBe("#f");
    expect(roundTrip('"hi"')).toBe('"hi"');
    expect(roundTrip("x")).toBe("x");
  });

  it("re-sugars quote back to shorthand", () => {
    expect(roundTrip("'(1 2)")).toBe("'(1 2)");
  });

  it("renders a recursive definition legibly", () => {
    const source =
      "(define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1)))))";
    expect(roundTrip(source)).toBe(source);
  });
});

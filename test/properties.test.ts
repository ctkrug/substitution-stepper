import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  SchemeNode,
  bool,
  list,
  number,
  str,
  symbol,
} from "../src/interpreter/ast";
import { parseOne, parseProgram } from "../src/interpreter/parser";
import { print } from "../src/interpreter/printer";
import { PRIMITIVES } from "../src/interpreter/primitives";
import { substitute } from "../src/interpreter/substitute";

/**
 * A generator for SchemeNodes that always round-trip through
 * `print` → `parseOne`. Numbers are integers (their `String()` re-lexes as a
 * NUMBER), symbol names start with a letter (never colliding with the number
 * or boolean lexemes), and string bodies exclude the `"` the lexer would treat
 * as a terminator — matching the subset the interpreter actually accepts.
 */
const nodeArb: fc.Arbitrary<SchemeNode> = fc.letrec<{ node: SchemeNode }>(
  (tie) => ({
    node: fc.oneof(
      { depthSize: "small", withCrossShrink: true },
      fc.integer({ min: -100000, max: 100000 }).map(number),
      fc.boolean().map(bool),
      fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9!?*/<>=+-]*$/).map(symbol),
      fc.stringMatching(/^[a-zA-Z0-9 .,:]*$/).map(str),
      fc.array(tie("node"), { maxLength: 4 }).map(list),
    ),
  }),
).node;

describe("printer/parser round-trip (property)", () => {
  it("parseOne(print(node)) deep-equals node", () => {
    fc.assert(
      fc.property(nodeArb, (node) => {
        expect(parseOne(print(node))).toEqual(node);
      }),
      { numRuns: 500 },
    );
  });

  it("a printed program re-parses to the same forms", () => {
    fc.assert(
      fc.property(
        fc.array(nodeArb, { minLength: 1, maxLength: 5 }),
        (nodes) => {
          const source = nodes.map(print).join("\n");
          expect(parseProgram(source)).toEqual(nodes);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("arithmetic primitives match reference semantics (property)", () => {
  const ints = fc.array(fc.integer({ min: -1000, max: 1000 }), {
    minLength: 0,
    maxLength: 6,
  });

  it("+ sums like JS reduce", () => {
    fc.assert(
      fc.property(ints, (xs) => {
        const result = PRIMITIVES["+"](xs.map(number));
        expect(result).toEqual(number(xs.reduce((a, b) => a + b, 0)));
      }),
    );
  });

  it("* multiplies like JS reduce", () => {
    fc.assert(
      fc.property(ints, (xs) => {
        const result = PRIMITIVES["*"](xs.map(number));
        expect(result).toEqual(number(xs.reduce((a, b) => a * b, 1)));
      }),
    );
  });

  it("- subtracts left-to-right for one or more args", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -1000, max: 1000 }), {
          minLength: 1,
          maxLength: 6,
        }),
        (xs) => {
          const expected =
            xs.length === 1
              ? -xs[0]
              : xs.slice(1).reduce((a, b) => a - b, xs[0]);
          expect(PRIMITIVES["-"](xs.map(number))).toEqual(number(expected));
        },
      ),
    );
  });

  it("< agrees with a strictly-increasing check", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -50, max: 50 }), {
          minLength: 1,
          maxLength: 6,
        }),
        (xs) => {
          const expected = xs.every((v, i) => i === 0 || xs[i - 1] < v);
          expect(PRIMITIVES["<"](xs.map(number))).toEqual(bool(expected));
        },
      ),
    );
  });

  it("= agrees with an all-equal check", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -5, max: 5 }), {
          minLength: 1,
          maxLength: 6,
        }),
        (xs) => {
          const expected = xs.every((v) => v === xs[0]);
          expect(PRIMITIVES["="](xs.map(number))).toEqual(bool(expected));
        },
      ),
    );
  });
});

describe("substitute (property)", () => {
  it("substituting a name absent from the bindings leaves the tree unchanged", () => {
    fc.assert(
      fc.property(nodeArb, (node) => {
        expect(substitute(node, new Map())).toEqual(node);
      }),
      { numRuns: 300 },
    );
  });

  it("a lone bound symbol is replaced by exactly its value", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9]*$/),
        fc.integer(),
        (name, value) => {
          const bindings = new Map([[name, number(value)]]);
          expect(substitute(symbol(name), bindings)).toEqual(number(value));
        },
      ),
    );
  });
});

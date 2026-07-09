import { describe, expect, it } from "vitest";
import { EXAMPLES } from "../src/app/examples";
import { loadProgram } from "../src/interpreter/loader";
import { print } from "../src/interpreter/printer";
import { step } from "../src/interpreter/stepper";

function runToValue(source: string): string {
  const { env, initial } = loadProgram(source);
  let node = initial;
  for (let i = 0; i < 20_000; i++) {
    const result = step(node, env);
    if (!result) return print(node);
    node = result.expr;
  }
  throw new Error("exceeded 20,000 steps");
}

describe("EXAMPLES", () => {
  it("has at least four entries with a name and source", () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(4);
    for (const example of EXAMPLES) {
      expect(example.name.length).toBeGreaterThan(0);
      expect(example.source.length).toBeGreaterThan(0);
    }
  });

  it("leads with the factorial wow-moment demo", () => {
    expect(EXAMPLES[0].name).toBe("Factorial");
  });

  it("every example loads without error and steps to a final numeric value", () => {
    const expected: Record<string, string> = {
      Factorial: "120",
      Fibonacci: "8",
      "Sum to n": "15",
      Ackermann: "9",
    };
    for (const example of EXAMPLES) {
      expect(runToValue(example.source)).toBe(expected[example.name]);
    }
  });
});

import { parseOne } from "./interpreter/parser";
import { print } from "./interpreter/printer";

/**
 * Parses a Scheme expression and renders it back to text. Placeholder for
 * the real pipeline: once the evaluator lands, this becomes the entry point
 * that produces a step sequence instead of just echoing the input.
 */
export function readAndPrint(source: string): string {
  return print(parseOne(source));
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  const demo =
    "(define (factorial n) (if (= n 0) 1 (* n (factorial (- n 1)))))";
  console.log("Substitution Stepper — parser/printer smoke test");
  console.log(`in:  ${demo}`);
  console.log(`out: ${readAndPrint(demo)}`);
}

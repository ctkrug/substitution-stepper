import { SchemeNode } from "./ast";

/**
 * Renders a SchemeNode back to source text. This is the counterpart to the
 * parser and is what the step viewer will call after every substitution to
 * redraw the expression in place.
 */
export function print(node: SchemeNode): string {
  switch (node.kind) {
    case "number":
      return String(node.value);
    case "boolean":
      return node.value ? "#t" : "#f";
    case "string":
      return `"${node.value}"`;
    case "symbol":
      return node.name;
    case "list": {
      if (
        node.items.length === 2 &&
        node.items[0].kind === "symbol" &&
        node.items[0].name === "quote"
      ) {
        return `'${print(node.items[1])}`;
      }
      return `(${node.items.map(print).join(" ")})`;
    }
  }
}

import { SchemeNode, list } from "./ast";

/**
 * Replaces every free occurrence of a bound name in `node` with its value.
 * This is the textual rewrite the whole project visualizes: applying a
 * procedure substitutes its parameters into its body verbatim, exactly as
 * the SICP substitution model describes it.
 *
 * Two forms are left alone rather than substituted into:
 * - `quote`d data, which is never evaluated.
 * - A nested `lambda` that re-binds one of the names being substituted —
 *   that inner parameter shadows the outer one, so the outer value must not
 *   leak into the inner body.
 */
export function substitute(
  node: SchemeNode,
  bindings: ReadonlyMap<string, SchemeNode>,
): SchemeNode {
  switch (node.kind) {
    case "number":
    case "boolean":
    case "string":
      return node;
    case "symbol":
      return bindings.has(node.name) ? bindings.get(node.name)! : node;
    case "list": {
      if (node.items.length === 0) return node;
      const head = node.items[0];

      if (head.kind === "symbol" && head.name === "quote") {
        return node;
      }

      if (
        head.kind === "symbol" &&
        head.name === "lambda" &&
        node.items.length >= 2 &&
        node.items[1].kind === "list"
      ) {
        const params = node.items[1];
        const shadowed = new Set(
          params.items
            .filter((p): p is Extract<SchemeNode, { kind: "symbol" }> => p.kind === "symbol")
            .map((p) => p.name),
        );
        const inner =
          shadowed.size === 0
            ? bindings
            : new Map([...bindings].filter(([name]) => !shadowed.has(name)));
        const body = node.items.slice(2).map((part) => substitute(part, inner));
        return list([head, params, ...body]);
      }

      return list(node.items.map((item) => substitute(item, bindings)));
    }
  }
}

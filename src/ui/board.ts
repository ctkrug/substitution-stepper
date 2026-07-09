import { SchemeNode } from "../interpreter/ast";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pathsEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Renders `node` to HTML, wrapping the sub-expression at `highlight` (as
 * returned by `step()`) in a `<mark>` so the UI can pulse-highlight exactly
 * what was just rewritten — the chalk-circle moment the whole project is
 * built around.
 */
export function renderBoardHtml(
  node: SchemeNode,
  highlight: number[] | null,
): string {
  return renderNode(node, [], highlight);
}

function renderNode(
  node: SchemeNode,
  path: number[],
  highlight: number[] | null,
): string {
  const inner = renderInner(node, path, highlight);
  if (highlight && pathsEqual(path, highlight)) {
    return `<mark class="board__rewrite">${inner}</mark>`;
  }
  return inner;
}

function renderInner(
  node: SchemeNode,
  path: number[],
  highlight: number[] | null,
): string {
  switch (node.kind) {
    case "number":
      return `<span class="tok tok--number">${node.value}</span>`;
    case "boolean":
      return `<span class="tok tok--boolean">${node.value ? "#t" : "#f"}</span>`;
    case "string":
      return `<span class="tok tok--string">"${escapeHtml(node.value)}"</span>`;
    case "symbol":
      return `<span class="tok tok--symbol">${escapeHtml(node.name)}</span>`;
    case "list": {
      if (
        node.items.length === 2 &&
        node.items[0].kind === "symbol" &&
        node.items[0].name === "quote"
      ) {
        return `<span class="tok tok--quote">'</span>${renderNode(node.items[1], [...path, 1], highlight)}`;
      }
      const parts = node.items.map((item, i) =>
        renderNode(item, [...path, i], highlight),
      );
      return `<span class="tok tok--paren">(</span>${parts.join(" ")}<span class="tok tok--paren">)</span>`;
    }
  }
}

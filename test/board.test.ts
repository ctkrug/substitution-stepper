import { describe, expect, it } from "vitest";
import { parseOne } from "../src/interpreter/parser";
import { renderBoardHtml } from "../src/ui/board";

describe("renderBoardHtml", () => {
  it("renders a flat application with no highlight", () => {
    const html = renderBoardHtml(parseOne("(+ 1 2)"), null);
    expect(html).toContain('<span class="tok tok--number">1</span>');
    expect(html).toContain('<span class="tok tok--symbol">+</span>');
    expect(html).not.toContain("board__rewrite");
  });

  it("wraps the whole expression in <mark> when the highlight path is []", () => {
    const html = renderBoardHtml(parseOne("120"), []);
    expect(html).toBe(
      '<mark class="board__rewrite"><span class="tok tok--number">120</span></mark>',
    );
  });

  it("wraps only the sub-expression at the given path", () => {
    const html = renderBoardHtml(parseOne("(+ (* 2 3) 1)"), [1]);
    expect(html).toContain('<mark class="board__rewrite">');
    // The highlighted operand's own tokens are inside the mark...
    const markStart = html.indexOf("<mark");
    const markEnd = html.indexOf("</mark>") + "</mark>".length;
    const marked = html.slice(markStart, markEnd);
    expect(marked).toContain('tok--symbol">*');
    // ...but the outer "+" and the trailing "1" are not.
    expect(html.slice(0, markStart)).toContain('tok--symbol">+');
    expect(html.slice(markEnd)).toContain('tok--number">1');
  });

  it("escapes HTML-sensitive characters in string literals", () => {
    const html = renderBoardHtml(parseOne('"<b>&hi"'), null);
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;&amp;hi");
  });

  it("re-sugars a quoted list with the quote token rendered separately", () => {
    const html = renderBoardHtml(parseOne("'(1 2)"), null);
    expect(html).toContain('<span class="tok tok--quote">\'</span>');
    expect(html).toContain('<span class="tok tok--number">1</span>');
  });

  it("produces no <mark> at all when nothing matches the highlight path", () => {
    const html = renderBoardHtml(parseOne("(+ 1 2)"), [5, 5]);
    expect(html).not.toContain("board__rewrite");
  });
});

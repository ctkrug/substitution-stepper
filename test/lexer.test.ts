import { describe, expect, it } from "vitest";
import { LexError, tokenize } from "../src/interpreter/lexer";

describe("tokenize", () => {
  it("tokenizes a simple application", () => {
    expect(tokenize("(+ 1 2)")).toEqual([
      { type: "LPAREN", text: "(", position: 0 },
      { type: "SYMBOL", text: "+", position: 1 },
      { type: "NUMBER", text: "1", position: 3 },
      { type: "NUMBER", text: "2", position: 5 },
      { type: "RPAREN", text: ")", position: 6 },
    ]);
  });

  it("tokenizes nested lists and negative numbers", () => {
    const tokens = tokenize("(f (- 3 -4))");
    expect(tokens.map((t) => t.type)).toEqual([
      "LPAREN",
      "SYMBOL",
      "LPAREN",
      "SYMBOL",
      "NUMBER",
      "NUMBER",
      "RPAREN",
      "RPAREN",
    ]);
  });

  it("skips comments", () => {
    const tokens = tokenize("(+ 1 2) ; the answer is not here\n");
    expect(tokens).toHaveLength(5);
  });

  it("recognizes booleans and strings", () => {
    const tokens = tokenize('(#t #f "hi")');
    expect(tokens.map((t) => t.type)).toEqual([
      "LPAREN",
      "BOOLEAN",
      "BOOLEAN",
      "STRING",
      "RPAREN",
    ]);
    expect(tokens[3].text).toBe("hi");
  });

  it("recognizes quote shorthand", () => {
    const tokens = tokenize("'(1 2)");
    expect(tokens[0]).toEqual({ type: "QUOTE", text: "'", position: 0 });
  });

  it("throws on an unterminated string", () => {
    expect(() => tokenize('"unterminated')).toThrow(LexError);
  });

  it("treats square brackets as parentheses (SICP/Racket cond style)", () => {
    const tokens = tokenize("[cond [else 1]]");
    expect(tokens.map((t) => `${t.type}:${t.text}`)).toEqual([
      "LPAREN:(",
      "SYMBOL:cond",
      "LPAREN:(",
      "SYMBOL:else",
      "NUMBER:1",
      "RPAREN:)",
      "RPAREN:)",
    ]);
  });

  it("lexes decimal number forms", () => {
    for (const text of ["3.14", ".5", "1.", "-0.25"]) {
      const [tok] = tokenize(text);
      expect(tok.type).toBe("NUMBER");
      expect(tok.text).toBe(text);
    }
  });

  it("treats a lone + or - as a symbol, not a number", () => {
    expect(tokenize("+")[0].type).toBe("SYMBOL");
    expect(tokenize("-")[0].type).toBe("SYMBOL");
  });
});

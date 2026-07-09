import { SchemeNode, bool, list, number, str, symbol } from "./ast";
import { Token, tokenize } from "./lexer";

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

class TokenCursor {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.index];
  }

  next(): Token {
    const token = this.tokens[this.index];
    if (!token) {
      throw new ParseError("unexpected end of input", this.endPosition());
    }
    this.index++;
    return token;
  }

  atEnd(): boolean {
    return this.index >= this.tokens.length;
  }

  private endPosition(): number {
    const last = this.tokens[this.tokens.length - 1];
    return last ? last.position + last.text.length : 0;
  }
}

function parseExpr(cursor: TokenCursor): SchemeNode {
  const token = cursor.next();

  switch (token.type) {
    case "NUMBER":
      return number(Number(token.text));
    case "BOOLEAN":
      return bool(token.text === "#t");
    case "STRING":
      return str(token.text);
    case "SYMBOL":
      return symbol(token.text);
    case "QUOTE":
      return list([symbol("quote"), parseExpr(cursor)]);
    case "LPAREN":
      return parseListTail(cursor);
    case "RPAREN":
      throw new ParseError("unexpected ')'", token.position);
    default:
      throw new ParseError(`unexpected token '${token.text}'`, token.position);
  }
}

function parseListTail(cursor: TokenCursor): SchemeNode {
  const items: SchemeNode[] = [];
  while (true) {
    const next = cursor.peek();
    if (!next) {
      throw new ParseError("unterminated list, expected ')'", -1);
    }
    if (next.type === "RPAREN") {
      cursor.next();
      return list(items);
    }
    items.push(parseExpr(cursor));
  }
}

/** Parses a single top-level expression from Scheme source text. */
export function parseOne(source: string): SchemeNode {
  const cursor = new TokenCursor(tokenize(source));
  const expr = parseExpr(cursor);
  if (!cursor.atEnd()) {
    const trailing = cursor.next();
    throw new ParseError(
      `unexpected trailing input '${trailing.text}'`,
      trailing.position,
    );
  }
  return expr;
}

/** Parses a full program: zero or more top-level expressions. */
export function parseProgram(source: string): SchemeNode[] {
  const cursor = new TokenCursor(tokenize(source));
  const exprs: SchemeNode[] = [];
  while (!cursor.atEnd()) {
    exprs.push(parseExpr(cursor));
  }
  return exprs;
}

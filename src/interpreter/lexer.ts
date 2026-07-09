export type TokenType =
  "LPAREN" | "RPAREN" | "QUOTE" | "SYMBOL" | "NUMBER" | "BOOLEAN" | "STRING";

export interface Token {
  type: TokenType;
  text: string;
  position: number;
}

export class LexError extends Error {
  constructor(
    message: string,
    public readonly position: number,
  ) {
    super(message);
    this.name = "LexError";
  }
}

// Brackets alias to parens (SICP/Racket cond style), so they must also break an
// atom — otherwise "1]" scans as a single symbol token instead of NUMBER + ).
const DELIMITER = /[\s()[\]'"]/;

function isDelimiter(ch: string): boolean {
  return DELIMITER.test(ch);
}

/**
 * Turns raw Scheme source into a flat token stream. Deliberately small: just
 * enough syntax to support the subset the interpreter evaluates (atoms,
 * lists, quote shorthand, string literals).
 */
export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === ";") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (ch === "(" || ch === "[") {
      tokens.push({ type: "LPAREN", text: "(", position: i });
      i++;
      continue;
    }

    if (ch === ")" || ch === "]") {
      tokens.push({ type: "RPAREN", text: ")", position: i });
      i++;
      continue;
    }

    if (ch === "'") {
      tokens.push({ type: "QUOTE", text: "'", position: i });
      i++;
      continue;
    }

    if (ch === '"') {
      const start = i;
      i++;
      let value = "";
      while (i < source.length && source[i] !== '"') {
        value += source[i];
        i++;
      }
      if (i >= source.length) {
        throw new LexError("unterminated string literal", start);
      }
      i++; // closing quote
      tokens.push({ type: "STRING", text: value, position: start });
      continue;
    }

    const start = i;
    let text = "";
    while (i < source.length && !isDelimiter(source[i])) {
      text += source[i];
      i++;
    }

    if (text === "#t" || text === "#f") {
      tokens.push({ type: "BOOLEAN", text, position: start });
      continue;
    }

    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text) && text !== "+" && text !== "-") {
      tokens.push({ type: "NUMBER", text, position: start });
      continue;
    }

    tokens.push({ type: "SYMBOL", text, position: start });
  }

  return tokens;
}

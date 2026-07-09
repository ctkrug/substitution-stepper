/**
 * Runtime-level failures: unbound variables, malformed special forms, and
 * type errors raised while stepping or applying primitives. Distinct from
 * LexError/ParseError, which are read-time failures.
 */
export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuntimeError";
  }
}

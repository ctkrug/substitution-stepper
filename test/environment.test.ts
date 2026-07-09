import { describe, expect, it } from "vitest";
import { number, symbol } from "../src/interpreter/ast";
import { Env } from "../src/interpreter/environment";
import { RuntimeError } from "../src/interpreter/errors";

describe("Env", () => {
  it("defines and looks up a binding in the same frame", () => {
    const env = new Env();
    env.define("x", number(5));
    expect(env.lookup("x")).toEqual(number(5));
  });

  it("throws a RuntimeError for an unbound variable", () => {
    const env = new Env();
    expect(() => env.lookup("missing")).toThrow(RuntimeError);
    expect(() => env.lookup("missing")).toThrow(/unbound variable: missing/);
  });

  it("resolves free variables from an enclosing (parent) frame", () => {
    const outer = new Env();
    outer.define("x", number(1));
    const inner = outer.extend([["y", number(2)]]);
    expect(inner.lookup("x")).toEqual(number(1));
    expect(inner.lookup("y")).toEqual(number(2));
  });

  it("shadowing a name in a child frame does not mutate the parent binding", () => {
    const outer = new Env();
    outer.define("x", number(1));
    const inner = outer.extend([["x", number(99)]]);
    expect(inner.lookup("x")).toEqual(number(99));
    expect(outer.lookup("x")).toEqual(number(1));
  });

  it("has() reports bindings visible through the parent chain", () => {
    const outer = new Env();
    outer.define("x", symbol("unused"));
    const inner = outer.extend([]);
    expect(inner.has("x")).toBe(true);
    expect(inner.has("nope")).toBe(false);
  });

  it("a redefinition in the same frame overwrites the previous value", () => {
    const env = new Env();
    env.define("x", number(1));
    env.define("x", number(2));
    expect(env.lookup("x")).toEqual(number(2));
  });
});

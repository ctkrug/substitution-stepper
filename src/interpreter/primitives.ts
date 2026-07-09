import { SchemeNode, bool, number } from "./ast";
import { RuntimeError } from "./errors";
import { print } from "./printer";

export type Primitive = (args: SchemeNode[]) => SchemeNode;

function asNumber(node: SchemeNode, name: string): number {
  if (node.kind !== "number") {
    throw new RuntimeError(`${name}: expected a number, got ${print(node)}`);
  }
  return node.value;
}

function add(args: SchemeNode[]): SchemeNode {
  return number(args.reduce((sum, a) => sum + asNumber(a, "+"), 0));
}

function sub(args: SchemeNode[]): SchemeNode {
  if (args.length === 0) throw new RuntimeError("-: requires at least 1 argument");
  const nums = args.map((a) => asNumber(a, "-"));
  if (nums.length === 1) return number(-nums[0]);
  return number(nums.slice(1).reduce((acc, n) => acc - n, nums[0]));
}

function mul(args: SchemeNode[]): SchemeNode {
  return number(args.reduce((prod, a) => prod * asNumber(a, "*"), 1));
}

function div(args: SchemeNode[]): SchemeNode {
  if (args.length === 0) throw new RuntimeError("/: requires at least 1 argument");
  const nums = args.map((a) => asNumber(a, "/"));
  const [first, ...rest] = nums.length === 1 ? [1, nums[0]] : nums;
  return number(
    rest.reduce((acc, n) => {
      if (n === 0) throw new RuntimeError("/: division by zero");
      return acc / n;
    }, first),
  );
}

function chainCompare(name: string, cmp: (a: number, b: number) => boolean): Primitive {
  return (args) => {
    const nums = args.map((a) => asNumber(a, name));
    if (nums.length === 0) throw new RuntimeError(`${name}: requires at least 1 argument`);
    for (let i = 0; i < nums.length - 1; i++) {
      if (!cmp(nums[i], nums[i + 1])) return bool(false);
    }
    return bool(true);
  };
}

/** Built-in procedures available without a `define` — the small numeric core the demos need. */
export const PRIMITIVES: Record<string, Primitive> = {
  "+": add,
  "-": sub,
  "*": mul,
  "/": div,
  "=": chainCompare("=", (a, b) => a === b),
  "<": chainCompare("<", (a, b) => a < b),
  ">": chainCompare(">", (a, b) => a > b),
  "<=": chainCompare("<=", (a, b) => a <= b),
  ">=": chainCompare(">=", (a, b) => a >= b),
};

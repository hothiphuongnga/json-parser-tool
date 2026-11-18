import { describe, expect, it } from "vitest";
import { diffText, MAX_LCS_CELLS } from "./diff";

describe("diffText", () => {
  it("does not mark every following line as changed after an insertion", () => {
    const { rows, stats } = diffText("a\nb\nc", "a\nnew\nb\nc");
    expect(stats).toEqual({ same: 3, added: 1, removed: 0, modified: 0 });
    expect(rows[1]).toMatchObject({ kind: "added", right: "new", rightNumber: 2 });
    expect(rows[3]).toMatchObject({ kind: "same", leftNumber: 3, rightNumber: 4 });
  });

  it("pairs replaced lines as modified", () => {
    const { stats } = diffText("a\nb\nc", "a\nB\nc");
    expect(stats).toEqual({ same: 2, added: 0, removed: 0, modified: 1 });
  });

  it("falls back to positional pairing for huge inputs instead of allocating a giant table", () => {
    const size = Math.ceil(Math.sqrt(MAX_LCS_CELLS)) + 10;
    const left = Array.from({ length: size }, (_, i) => `l${i}`).join("\n");
    const right = Array.from({ length: size }, (_, i) => `r${i}`).join("\n");
    const result = diffText(left, right);
    expect(result.approximate).toBe(true);
    expect(result.rows).toHaveLength(size);
  });
});

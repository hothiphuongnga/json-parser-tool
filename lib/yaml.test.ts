import { describe, expect, it } from "vitest";
import { parseYaml, toYaml } from "./yaml";

describe("toYaml", () => {
  it("quotes strings that YAML 1.1 or 1.2 parsers could misread", () => {
    const yaml = toYaml({ a: "yes", b: "0123", c: "x: y", d: "~", e: "2026-01-01", n: "" });
    expect(yaml).toContain('a: "yes"');
    expect(yaml).toContain('b: "0123"');
    expect(yaml).toContain('c: "x: y"');
    expect(yaml).toContain('d: "~"');
    expect(yaml).toContain('e: "2026-01-01"');
  });

  it("round-trips through parseYaml", () => {
    const value = { name: "GoingTool", tags: ["json", "yaml"], nested: { ok: true, count: 3, none: null }, text: "line 1\nline 2" };
    const parsed = parseYaml(toYaml(value, 4));
    expect(parsed.valid && parsed.value).toEqual(value);
  });
});

describe("parseYaml", () => {
  it("parses a mapping into JSON", () => {
    expect(parseYaml("a: 1\nb:\n  - x\n  - y\n")).toMatchObject({ valid: true, value: { a: 1, b: ["x", "y"] }, documents: 1 });
  });

  it("resolves anchors and aliases", () => {
    const parsed = parseYaml("base: &b\n  x: 1\ncopy: *b\n");
    expect(parsed.valid && parsed.value).toEqual({ base: { x: 1 }, copy: { x: 1 } });
  });

  it("applies << merge keys", () => {
    const parsed = parseYaml("defaults: &d\n  timeout: 30\n  retries: 2\nprod:\n  <<: *d\n  retries: 5\n");
    expect(parsed.valid && parsed.value).toEqual({ defaults: { timeout: 30, retries: 2 }, prod: { timeout: 30, retries: 5 } });
  });

  it("turns multiple documents into an array", () => {
    expect(parseYaml("a: 1\n---\nb: 2\n")).toMatchObject({ valid: true, value: [{ a: 1 }, { b: 2 }], documents: 2 });
  });

  it("reports the line and column of a syntax error", () => {
    const parsed = parseYaml("a: 1\nb: [1, 2\nc: 3\n");
    expect(parsed.valid).toBe(false);
    expect(parsed.location?.line).toBeGreaterThanOrEqual(2);
  });

  it("refuses alias bombs instead of hanging", () => {
    const bomb = ["a: &a [x, x, x, x, x, x, x, x, x, x]", ...Array.from({ length: 8 }, (_, i) => {
      const prev = String.fromCharCode(97 + i);
      const next = String.fromCharCode(98 + i);
      return `${next}: &${next} [*${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}, *${prev}]`;
    })].join("\n");
    expect(parseYaml(bomb).valid).toBe(false);
  });

  it("treats blank input as empty, not as an error", () => {
    expect(parseYaml("  \n")).toMatchObject({ valid: false, error: "" });
  });
});

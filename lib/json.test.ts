import { describe, expect, it } from "vitest";
import { childPath, locateOffset, parseJson, sanitizeInput } from "./json";

describe("sanitizeInput", () => {
  it("strips a BOM and a wrapping code fence", () => {
    expect(sanitizeInput('\uFEFF```json\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("never touches string contents", () => {
    const input = '{"text": "it’s ```code``` “quoted”"}';
    expect(sanitizeInput(input)).toBe(input);
  });
});

describe("parseJson", () => {
  it("keeps typographic quotes inside valid strings", () => {
    const result = parseJson('{"text": "it’s “fine”"}');
    expect(result.valid && result.value).toEqual({ text: "it’s “fine”" });
    expect(result.repaired).toBe(false);
  });

  it("repairs curly quotes used as delimiters", () => {
    const result = parseJson("{“a”: 1}");
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
  });

  it("reports line and column of a syntax error", () => {
    const result = parseJson('{\n  "a": 1,\n  "b" 2\n}');
    expect(result.valid).toBe(false);
    expect(result.location?.line).toBe(3);
  });

  it("treats blank input as empty, not as an error", () => {
    expect(parseJson("   ")).toMatchObject({ valid: false, error: "" });
  });
});

describe("helpers", () => {
  it("locates offsets", () => {
    expect(locateOffset("ab\ncd", 4)).toEqual({ offset: 4, line: 2, column: 2 });
  });

  it("builds unambiguous paths", () => {
    expect(childPath("$", "name")).toBe("$.name");
    expect(childPath("$", "first name")).toBe('$["first name"]');
    expect(childPath("$", 2)).toBe("$[2]");
  });
});

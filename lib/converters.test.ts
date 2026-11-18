import { describe, expect, it } from "vitest";
import { flattenJson, toCode, toMarkdownTable, toXml, xmlName } from "./converters";

const tricky = { 'say "hi"': 'line1\nline2 \\ $var \'q\'', "valid_key": null, empty: {}, list: [] };

describe("toCode", () => {
  it("emits valid JavaScript", () => {
    const code = toCode(tricky, "js");
    expect(new Function(`return ${code};`)()).toEqual(tricky);
  });

  it("escapes PHP strings with single quotes so $ is not interpolated", () => {
    const code = toCode({ a: "it's $x \\ y" }, "php");
    expect(code).toContain(`'a' => 'it\\'s $x \\\\ y'`);
  });

  it("uses Python literals", () => {
    expect(toCode({ a: true, b: null, c: [] }, "python")).toBe('{\n  "a": True,\n  "b": None,\n  "c": []\n}');
  });
});

describe("toXml", () => {
  it("produces a single well-formed root with escaped text", () => {
    const xml = toXml({ "first name": "<b>&", "1st": 1 });
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <first_name>&lt;b&gt;&amp;</first_name>\n  <_1st>1</_1st>\n</root>',
    );
  });

  it("sanitises element names", () => {
    expect(xmlName("xmlData")).toBe("_xmlData");
    expect(xmlName("a b")).toBe("a_b");
  });
});

describe("toMarkdownTable", () => {
  it("escapes pipes and newlines in cells", () => {
    const table = toMarkdownTable([{ a: "x|y\nz" }]);
    expect(table).toContain("| 0 | x\\|y z |");
  });
});

describe("flattenJson", () => {
  it("lists leaves with paths", () => {
    expect(flattenJson({ a: [1, { "b c": true }], d: {} })).toEqual([
      { path: "$.a[0]", value: "1" },
      { path: '$.a[1]["b c"]', value: "true" },
      { path: "$.d", value: "{}" },
    ]);
  });
});

import { parseAllDocuments, stringify } from "yaml";
import { locateOffset, type ErrorLocation, type JsonValue } from "./json";

export type YamlIndent = 2 | 4;

/**
 * JSON value -> YAML text.
 *
 * Emitted with YAML 1.1 rules so every string that some parser could misread is quoted
 * (`yes`, `on`, `0123`, `1e3`, `~`, dates…). The result reads back identically with
 * YAML 1.1 parsers (PyYAML, many CI tools) and YAML 1.2 parsers alike.
 */
export function toYaml(value: JsonValue, indent: YamlIndent = 2): string {
  return stringify(value, { indent, lineWidth: 0, version: "1.1" });
}

export type YamlParseResult =
  | { valid: true; value: JsonValue; documents: number; error: ""; location: null }
  | { valid: false; value: null; documents: 0; error: string; location: ErrorLocation | null };

/**
 * YAML text -> JSON value (YAML 1.2 core schema; anchors, aliases and `<<` merge keys are resolved).
 * Several documents (`---`) become a JSON array, one item per document.
 * Values JSON cannot represent (.inf, .nan) become null, as JSON.stringify would do.
 */
export function parseYaml(text: string): YamlParseResult {
  const source = text.replace(/^\uFEFF/, "");
  if (!source.trim()) {
    return { valid: false, value: null, documents: 0, error: "", location: null };
  }

  // merge: `<<: *anchor` keys are not in YAML 1.2 but are used everywhere (docker-compose, GitLab CI…).
  const documents = parseAllDocuments(source, { prettyErrors: true, merge: true });
  const list = Array.isArray(documents) ? documents : [documents];

  for (const document of list) {
    const [error] = document.errors;
    if (error) {
      const position = error.linePos?.[0];
      const location = position
        ? { offset: error.pos[0], line: position.line, column: position.col }
        : locateOffset(source, error.pos[0]);
      return { valid: false, value: null, documents: 0, error: error.message.split("\n")[0], location };
    }
  }

  try {
    // Round-trip through JSON so the value is plain JSON (no Map, Date, undefined, Infinity).
    const values = list.map((document) => JSON.parse(JSON.stringify(document.toJS({ maxAliasCount: 100 }) ?? null)));
    const value = (values.length === 1 ? values[0] : values) as JsonValue;
    return { valid: true, value, documents: values.length, error: "", location: null };
  } catch (error) {
    return {
      valid: false,
      value: null,
      documents: 0,
      error: error instanceof Error ? error.message : "Invalid YAML",
      location: null,
    };
  }
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ErrorLocation = {
  offset: number;
  line: number;
  column: number;
};

export type ParseResult =
  | {
      valid: true;
      value: JsonValue;
      error: "";
      location: null;
      normalized: string;
      /** True when typographic double quotes had to be replaced to make the input parse. */
      repaired: boolean;
    }
  | {
      valid: false;
      value: null;
      error: string;
      location: ErrorLocation | null;
      normalized: string;
      repaired: false;
    };

/**
 * Removes things that are never part of the JSON itself: a BOM and a markdown
 * code fence wrapped around the whole input. Content inside strings is never touched.
 */
export function sanitizeInput(input: string) {
  const trimmed = input.replace(/^\uFEFF/, "").trim();
  const fence = trimmed.match(/^```[\w-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```$/);
  return fence ? fence[1].trim() : trimmed;
}

export function locateOffset(text: string, offset: number): ErrorLocation {
  const safeOffset = Math.max(0, Math.min(offset, text.length));
  const before = text.slice(0, safeOffset);
  const lines = before.split("\n");
  return {
    offset: safeOffset,
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function errorLocation(message: string, text: string): ErrorLocation | null {
  const lineColumn = message.match(/line (\d+) column (\d+)/);
  if (lineColumn) {
    const line = Number(lineColumn[1]);
    const column = Number(lineColumn[2]);
    const offset =
      text.split("\n").slice(0, line - 1).reduce((total, current) => total + current.length + 1, 0) + column - 1;
    return { offset, line, column };
  }

  const position = message.match(/position (\d+)/);
  if (position) {
    return locateOffset(text, Number(position[1]));
  }

  if (/end of (JSON|data)/i.test(message)) {
    return locateOffset(text, text.length);
  }

  return null;
}

export function parseJson(input: string): ParseResult {
  const cleaned = sanitizeInput(input);
  if (!cleaned) {
    return { valid: false, value: null, error: "", location: null, normalized: "", repaired: false };
  }

  try {
    return { valid: true, value: JSON.parse(cleaned) as JsonValue, error: "", location: null, normalized: cleaned, repaired: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";

    // JSON copied from chat apps or word processors often has curly quotes as
    // delimiters. Only fall back to replacing them when the raw input fails to parse,
    // so curly quotes inside valid string values are preserved.
    if (/[“”]/.test(cleaned)) {
      const repaired = cleaned.replace(/[“”]/g, '"');
      try {
        return { valid: true, value: JSON.parse(repaired) as JsonValue, error: "", location: null, normalized: repaired, repaired: true };
      } catch {
        // Report the error of the original input below.
      }
    }

    return { valid: false, value: null, error: message, location: errorLocation(message, cleaned), normalized: cleaned, repaired: false };
  }
}

export function isPlainObject(value: JsonValue | undefined): value is { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** Builds a JSONPath-style child path that stays unambiguous for any key. */
export function childPath(parent: string, key: string | number) {
  if (typeof key === "number") return `${parent}[${key}]`;
  return IDENTIFIER.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

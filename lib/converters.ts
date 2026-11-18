import { childPath, isPlainObject, type JsonValue } from "./json";

type CodeMode = "js" | "php" | "python";

const JS_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function phpString(value: string) {
  // Single-quoted PHP strings do not interpolate `$`; only `\` and `'` need escaping.
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function codeString(value: string, mode: CodeMode) {
  // JSON string literals are valid JavaScript and Python string literals.
  return mode === "php" ? phpString(value) : JSON.stringify(value);
}

function codeKey(key: string, mode: CodeMode) {
  if (mode === "js" && JS_IDENTIFIER.test(key)) return key;
  return codeString(key, mode);
}

export function toCode(value: JsonValue, mode: CodeMode, indent = 0): string {
  const pad = "  ".repeat(indent);
  const nextPad = "  ".repeat(indent + 1);

  if (value === null) return mode === "python" ? "None" : "null";
  if (typeof value === "string") return codeString(value, mode);
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") {
    if (mode === "python") return value ? "True" : "False";
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item) => `${nextPad}${toCode(item, mode, indent + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  const entries = Object.entries(value);
  const [open, close] = mode === "php" ? ["[", "]"] : ["{", "}"];
  if (entries.length === 0) return `${open}${close}`;

  const separator = mode === "php" ? " => " : ": ";
  const body = entries
    .map(([key, item]) => `${nextPad}${codeKey(key, mode)}${separator}${toCode(item, mode, indent + 1)}`)
    .join(",\n");
  return `${open}\n${body}\n${pad}${close}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Turns an arbitrary JSON key into a valid XML element name. */
export function xmlName(key: string) {
  let name = key.replace(/[^A-Za-z0-9_.\-À-￿]/g, "_");
  if (!/^[A-Za-z_À-￿]/.test(name) || /^xml/i.test(name)) {
    name = `_${name}`;
  }
  return name;
}

function xmlNode(value: JsonValue, name: string, indent: number): string {
  const pad = "  ".repeat(indent);
  const tag = xmlName(name);

  if (value === null) return `${pad}<${tag} />`;
  if (typeof value !== "object") return `${pad}<${tag}>${escapeXml(String(value))}</${tag}>`;

  const children = Array.isArray(value)
    ? value.map((item) => xmlNode(item, "item", indent + 1))
    : Object.entries(value).map(([key, item]) => xmlNode(item, key, indent + 1));

  if (children.length === 0) return `${pad}<${tag} />`;
  return `${pad}<${tag}>\n${children.join("\n")}\n${pad}</${tag}>`;
}

export function toXml(value: JsonValue) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlNode(value, "root", 0)}`;
}

/** Escapes characters that markdown would otherwise interpret in plain text. */
function escapeMarkdown(value: string) {
  return value.replace(/([\\`*_[\]<>#|~])/g, "\\$1").replace(/\r?\n/g, " ");
}

function escapeTableCell(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/** Wraps text in a code span whose fence is longer than any backtick run inside it. */
function inlineCode(value: string) {
  const text = value.replace(/\r?\n/g, " ");
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestRun + 1);
  const padding = text.startsWith("`") || text.endsWith("`") ? " " : "";
  return `${fence}${padding}${text}${padding}${fence}`;
}

function displayValue(value: JsonValue) {
  return typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

export function toMarkdownTable(value: JsonValue, emptyMessage = "No tabular data.") {
  if (!Array.isArray(value) || value.length === 0) {
    if (isPlainObject(value)) {
      const body = Object.entries(value)
        .map(([key, item]) => `- **${escapeMarkdown(key)}**: ${inlineCode(displayValue(item))}`)
        .join("\n");
      return `# JSON Data\n\n${body}`;
    }
    return emptyMessage;
  }

  if (!value.every(isPlainObject)) {
    return value.map((item, index) => `- Row ${index + 1}: ${inlineCode(JSON.stringify(item))}`).join("\n");
  }

  const rows = value as Array<{ [key: string]: JsonValue }>;
  const headers = Array.from(new Set(rows.flatMap((item) => Object.keys(item))));
  const head = `| ${["#", ...headers].map(escapeTableCell).join(" | ")} |`;
  const divider = `| ${["#", ...headers].map(() => "---").join(" | ")} |`;
  const body = rows.map((item, index) => {
    const cells = headers.map((header) => {
      const cell = item[header];
      return cell === null || cell === undefined ? "" : escapeTableCell(displayValue(cell));
    });
    return `| ${[String(index), ...cells].join(" | ")} |`;
  });

  return ["# JSON Data", "", head, divider, ...body].join("\n");
}

export function toMarkdownOutline(value: JsonValue, heading = "JSON Data"): string {
  const lines: string[] = [`# ${heading}`, ""];
  const headingPrefix = (depth: number) => "#".repeat(Math.min(depth, 6));

  function walk(node: JsonValue, label: string | null, depth: number) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        const itemLabel = `${label ?? "item"}.${index}`;
        if (item !== null && typeof item === "object") {
          lines.push(`${headingPrefix(depth)} ${escapeMarkdown(itemLabel)}`, "");
          walk(item, itemLabel, depth + 1);
        } else {
          lines.push(`- ${escapeMarkdown(String(item))}`);
        }
      });
      lines.push("");
      return;
    }

    if (isPlainObject(node)) {
      if (label !== null) lines.push(`${headingPrefix(depth)} ${escapeMarkdown(label)}`, "");
      for (const [key, item] of Object.entries(node)) {
        if (item !== null && typeof item === "object") {
          walk(item, key, depth + 1);
        } else {
          lines.push(`- **${escapeMarkdown(key)}:** ${escapeMarkdown(String(item))}`);
        }
      }
      lines.push("");
      return;
    }

    lines.push(`- ${escapeMarkdown(String(node))}`, "");
  }

  walk(value, null, 2);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export type FlatEntry = { path: string; value: string };

export function flattenJson(value: JsonValue, path = "$"): FlatEntry[] {
  const entries: FlatEntry[] = [];

  function walk(node: JsonValue, currentPath: string) {
    if (node === null || typeof node !== "object") {
      entries.push({ path: currentPath, value: String(node) });
      return;
    }

    if (Array.isArray(node)) {
      if (node.length === 0) entries.push({ path: currentPath, value: "[]" });
      node.forEach((item, index) => walk(item, childPath(currentPath, index)));
      return;
    }

    const children = Object.entries(node);
    if (children.length === 0) entries.push({ path: currentPath, value: "{}" });
    children.forEach(([key, item]) => walk(item, childPath(currentPath, key)));
  }

  walk(value, path);
  return entries;
}

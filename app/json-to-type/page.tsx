"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import "./json-to-type.css";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type OutputMode = "interface" | "type";
type TargetLanguage = "typescript" | "go" | "kotlin" | "swift" | "csharp" | "java" | "python";
type ThemeTone = "blue" | "green" | "violet" | "dark";

type TypeShape = {
  expression: string;
  declarations: string[];
};

const THEME_KEY = "json-parser-theme";

const THEMES: Array<{ id: ThemeTone; label: string }> = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "violet", label: "Violet" },
  { id: "dark", label: "Dark" },
];

const LANGUAGES: Array<{ id: TargetLanguage; label: string }> = [
  { id: "typescript", label: "TypeScript" },
  { id: "go", label: "Go" },
  { id: "kotlin", label: "Kotlin" },
  { id: "swift", label: "Swift" },
  { id: "csharp", label: "C#" },
  { id: "java", label: "Java" },
  { id: "python", label: "Python" },
];

const SAMPLE_JSON = `{
  "id": 1024,
  "name": "ToolHub",
  "active": true,
  "tags": ["json", "type", "converter"],
  "owner": {
    "name": "Nga",
    "email": "nga@example.com"
  },
  "projects": [
    {
      "title": "JSON Parser Online",
      "stars": 5,
      "released": true
    }
  ]
}`;

function readTheme() {
  if (typeof window === "undefined") {
    return "blue" as ThemeTone;
  }

  const saved = window.localStorage.getItem(THEME_KEY);
  return THEMES.some((theme) => theme.id === saved) ? (saved as ThemeTone) : "blue";
}

function sanitizeInput(input: string) {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function parseInput(input: string) {
  const cleaned = sanitizeInput(input).trim();
  if (!cleaned) {
    return {
      value: null as JsonValue | null,
      error: "",
      valid: false,
    };
  }

  try {
    return {
      value: JSON.parse(cleaned) as JsonValue,
      error: "",
      valid: true,
    };
  } catch (error) {
    return {
      value: null as JsonValue | null,
      error: error instanceof Error ? error.message : "Invalid JSON",
      valid: false,
    };
  }
}

function toPascalCase(value: string) {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim();

  const next = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

  return next || "GeneratedType";
}

function toCamelCase(value: string) {
  const pascal = toPascalCase(value);
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}`;
}

function toSnakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "field";
}

function makeIdentifier(value: string) {
  const cleaned = value.replace(/[^A-Za-z0-9_$]/g, "_");
  if (/^[A-Za-z_$]/.test(cleaned)) {
    return cleaned;
  }
  return `_${cleaned}`;
}

function propertyName(key: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function kotlinPropertyName(key: string) {
  const next = toCamelCase(key);
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(next) ? next : `\`${key.replace(/`/g, "")}\``;
}

function javaPropertyName(key: string) {
  const next = toCamelCase(key);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(next) ? next : "field";
}

function uniqueTypes(types: string[]) {
  return Array.from(new Set(types)).sort((left, right) => left.localeCompare(right));
}

function arrayExpression(itemType: string, language: TargetLanguage) {
  switch (language) {
    case "go":
      return `[]${itemType}`;
    case "kotlin":
      return `List<${itemType}>`;
    case "swift":
      return `[${itemType}]`;
    case "csharp":
      return `List<${itemType}>`;
    case "java":
      return `List<${itemType}>`;
    case "python":
      return `list[${itemType}]`;
    case "typescript":
    default:
      return `${itemType}[]`;
  }
}

function fallbackType(language: TargetLanguage) {
  switch (language) {
    case "go":
      return "any";
    case "kotlin":
    case "swift":
      return "Any?";
    case "csharp":
      return "object?";
    case "java":
      return "Object";
    case "python":
      return "Any";
    case "typescript":
    default:
      return "unknown";
  }
}

function primitiveType(value: string | number | boolean | null, language: TargetLanguage) {
  if (value === null) {
    return language === "typescript" ? "null" : fallbackType(language);
  }

  if (typeof value === "string") {
    switch (language) {
      case "go":
      case "csharp":
        return "string";
      case "kotlin":
      case "swift":
      case "java":
        return "String";
      case "python":
        return "str";
      case "typescript":
      default:
        return "string";
    }
  }

  if (typeof value === "number") {
    if (language === "go") {
      return Number.isInteger(value) ? "int" : "float64";
    }
    if (language === "typescript") {
      return "number";
    }
    if (language === "python") {
      return Number.isInteger(value) ? "int" : "float";
    }
    if (language === "csharp") {
      return Number.isInteger(value) ? "int" : "double";
    }
    if (language === "java") {
      return Number.isInteger(value) ? "int" : "double";
    }
    return Number.isInteger(value) ? "Int" : "Double";
  }

  if (language === "go") {
    return "bool";
  }
  if (language === "csharp") {
    return "bool";
  }
  if (language === "python") {
    return "bool";
  }
  if (language === "swift") {
    return "Bool";
  }
  if (language === "typescript") {
    return "boolean";
  }
  return "Boolean";
}

function mergeArrayTypes(value: JsonValue[], parentName: string, mode: OutputMode, language: TargetLanguage): TypeShape {
  if (value.length === 0) {
    return { expression: arrayExpression(fallbackType(language), language), declarations: [] };
  }

  const childShapes = value.map((item) => inferType(item, parentName, mode, language));
  const declarations = childShapes.flatMap((shape) => shape.declarations);
  const expressions = uniqueTypes(childShapes.map((shape) => shape.expression));
  const itemType =
    expressions.length === 1
      ? expressions[0]
      : language === "typescript" || language === "python"
        ? expressions.join(" | ")
        : fallbackType(language);

  return {
    expression: arrayExpression(language === "typescript" && expressions.length > 1 ? `(${itemType})` : itemType, language),
    declarations,
  };
}

function objectEntries(value: JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [] as Array<[string, JsonValue]>;
  }

  return Object.entries(value);
}

function renderObjectDeclaration(
  typeName: string,
  entries: ReadonlyArray<readonly [string, TypeShape]>,
  mode: OutputMode,
  language: TargetLanguage,
) {
  switch (language) {
    case "go":
      return `type ${typeName} struct {\n${entries
        .map(([key, shape]) => `  ${toPascalCase(key)} ${shape.expression} \`json:"${key}"\``)
        .join("\n")}\n}`;
    case "kotlin":
      return `data class ${typeName}(\n${entries
        .map(([key, shape]) => `  val ${kotlinPropertyName(key)}: ${shape.expression},`)
        .join("\n")}\n)`;
    case "swift":
      return `struct ${typeName}: Codable {\n${entries
        .map(([key, shape]) => `  let ${toCamelCase(key)}: ${shape.expression}`)
        .join("\n")}\n}`;
    case "csharp":
      return `public class ${typeName}\n{\n${entries
        .map(([key, shape]) => `    public ${shape.expression} ${toPascalCase(key)} { get; set; }`)
        .join("\n")}\n}`;
    case "java":
      return `public record ${typeName}(\n${entries
        .map(([key, shape], index) => `    ${shape.expression} ${javaPropertyName(key)}${index === entries.length - 1 ? "" : ","}`)
        .join("\n")}\n) {}`;
    case "python":
      return `@dataclass\nclass ${typeName}:\n${entries
        .map(([key, shape]) => `    ${toSnakeCase(key)}: ${shape.expression}`)
        .join("\n") || "    pass"}`;
    case "typescript":
    default: {
      const props = entries.map(([key, shape]) => `  ${propertyName(key)}: ${shape.expression};`);
      return mode === "interface"
        ? `export interface ${typeName} {\n${props.join("\n")}\n}`
        : `export type ${typeName} = {\n${props.join("\n")}\n};`;
    }
  }
}

function inferType(value: JsonValue, name: string, mode: OutputMode, language: TargetLanguage): TypeShape {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return { expression: primitiveType(value, language), declarations: [] };
  }

  if (Array.isArray(value)) {
    return mergeArrayTypes(value, name, mode, language);
  }

  const typeName = toPascalCase(name);
  const entries = objectEntries(value);
  const childDeclarations: string[] = [];
  const typedEntries = entries.map(([key, item]) => {
    const childName = `${typeName}${toPascalCase(key)}`;
    const shape = inferType(item, childName, mode, language);
    childDeclarations.push(...shape.declarations);
    return [key, shape] as const;
  });

  const declaration = renderObjectDeclaration(typeName, typedEntries, mode, language);

  return {
    expression: typeName,
    declarations: [...childDeclarations, declaration],
  };
}

function renderRootAlias(rootName: string, expression: string, language: TargetLanguage) {
  switch (language) {
    case "go":
      return `type ${rootName} ${expression}`;
    case "kotlin":
      return `typealias ${rootName} = ${expression}`;
    case "swift":
      return `typealias ${rootName} = ${expression}`;
    case "csharp":
      return `// ${rootName}: ${expression}`;
    case "java":
      return `// ${rootName}: ${expression}`;
    case "python":
      return `${rootName} = ${expression}`;
    case "typescript":
    default:
      return `export type ${rootName} = ${expression};`;
  }
}

function addLanguagePrelude(output: string, language: TargetLanguage) {
  if (language === "python") {
    const imports = ["from dataclasses import dataclass"];
    if (output.includes("Any")) {
      imports.push("from typing import Any");
    }
    return `${imports.join("\n")}\n\n${output}`;
  }

  if ((language === "csharp" || language === "java") && output.includes("List<")) {
    return language === "csharp" ? `using System.Collections.Generic;\n\n${output}` : `import java.util.List;\n\n${output}`;
  }

  return output;
}

function buildTypes(value: JsonValue, rootName: string, mode: OutputMode, language: TargetLanguage) {
  const safeRootName = toPascalCase(makeIdentifier(rootName));

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const root = inferType(value, safeRootName, mode, language);
    return addLanguagePrelude(uniqueTypes(root.declarations).join("\n\n"), language);
  }

  const root = inferType(value, `${safeRootName}Item`, mode, language);
  const declaration = renderRootAlias(safeRootName, root.expression, language);

  return addLanguagePrelude(uniqueTypes([...root.declarations, declaration]).join("\n\n"), language);
}

export default function JsonToTypePage() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [rootName, setRootName] = useState("Root");
  const [language, setLanguage] = useState<TargetLanguage>("typescript");
  const [mode, setMode] = useState<OutputMode>("interface");
  const [theme, setTheme] = useState<ThemeTone>(readTheme);
  const [statusMessage, setStatusMessage] = useState("");
  const [workspaceSplit, setWorkspaceSplit] = useState(48);
  const [isResizing, setIsResizing] = useState(false);
  const [canResizeWorkspace, setCanResizeWorkspace] = useState(false);
  const workspaceRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function syncResizeAvailability() {
      setCanResizeWorkspace(window.innerWidth > 1100);
    }

    syncResizeAvailability();
    window.addEventListener("resize", syncResizeAvailability);

    return () => window.removeEventListener("resize", syncResizeAvailability);
  }, []);

  useEffect(() => {
    if (!isResizing || !canResizeWorkspace) {
      return;
    }

    function handlePointerMove(event: MouseEvent) {
      const container = workspaceRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      setWorkspaceSplit(Math.min(72, Math.max(28, percent)));
    }

    function handlePointerUp() {
      setIsResizing(false);
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [canResizeWorkspace, isResizing]);

  const parsed = useMemo(() => parseInput(input), [input]);
  const output = useMemo(() => {
    if (!parsed.valid || parsed.value === null) {
      return "";
    }

    return buildTypes(parsed.value, rootName || "Root", mode, language);
  }, [language, mode, parsed.valid, parsed.value, rootName]);

  const status = useMemo(() => {
    if (statusMessage) {
      return statusMessage;
    }
    if (!input.trim()) {
      return "Ready";
    }
    const activeLanguage = LANGUAGES.find((item) => item.id === language)?.label ?? "TypeScript";
    return parsed.valid ? `${activeLanguage} types generated` : parsed.error;
  }, [input, language, parsed.error, parsed.valid, statusMessage]);

  async function copyOutput() {
    if (!output) {
      setStatusMessage("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      setStatusMessage("Type output copied");
    } catch {
      setStatusMessage("Clipboard permission was denied");
    }
  }

  function formatInput() {
    if (!parsed.valid || parsed.value === null) {
      setStatusMessage(parsed.error || "Cannot format invalid JSON");
      return;
    }

    setInput(JSON.stringify(parsed.value, null, 2));
    setStatusMessage("Formatted JSON");
  }

  return (
    <main className="parser-shell type-tool-shell" data-theme={theme}>
      <section className="topbar">
        <div className="brand">JSON to Type</div>
        <div className="toolbar">
          <label className="theme-picker">
            <span className="sr-only">Theme</span>
            <select
              aria-label="Change theme"
              onChange={(event) => setTheme(event.target.value as ThemeTone)}
              value={theme}
            >
              {THEMES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <Link className="btn btn-muted tool-link" href="/">
            JSON Parser
          </Link>
          <Link className="btn btn-muted tool-link" href="/lunar-calendar">
            Lịch âm
          </Link>
          <button className="btn btn-primary" onClick={formatInput} type="button">
            Format JSON
          </button>
          <button className="btn btn-success" onClick={copyOutput} type="button">
            Copy Type
          </button>
          <button
            className="btn btn-muted"
            onClick={() => {
              setInput(SAMPLE_JSON);
              setStatusMessage("Sample loaded");
            }}
            type="button"
          >
            Sample
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setInput("");
              setStatusMessage("Cleared");
            }}
            type="button"
          >
            Clear
          </button>
        </div>
      </section>

      <section
        className={`type-tool-workspace ${isResizing ? "is-resizing" : ""}`}
        ref={workspaceRef}
        style={
          canResizeWorkspace
            ? { gridTemplateColumns: `${workspaceSplit}% 10px minmax(0, ${100 - workspaceSplit}%)` }
            : undefined
        }
      >
        <div className="panel type-input-panel">
          <div className="panel-header">
            <span>Input JSON</span>
            <div className="panel-tools">
              <span>{input.length} chars</span>
            </div>
          </div>
          <div className="editor-wrap">
            <div className="line-gutter">1</div>
            <textarea
              className="editor"
              onChange={(event) => {
                setInput(event.target.value);
                setStatusMessage("");
              }}
              placeholder="Paste JSON to generate TypeScript types..."
              spellCheck={false}
              value={input}
            />
          </div>
        </div>

        <button
          aria-label="Resize JSON to type panels"
          className="resize-handle resize-handle-workspace type-resize-handle"
          onMouseDown={() => {
            if (canResizeWorkspace) {
              setIsResizing(true);
            }
          }}
          type="button"
        >
          <span />
        </button>

        <div className="panel type-output-panel">
          <div className="type-controls">
            <label className="type-field">
              <span>Root name</span>
              <input
                onChange={(event) => setRootName(event.target.value)}
                placeholder="Root"
                value={rootName}
              />
            </label>

            {language === "typescript" ? (
              <div className="type-mode" role="group" aria-label="Output mode">
                <button
                  className={`type-mode-btn ${mode === "interface" ? "active" : ""}`}
                  onClick={() => setMode("interface")}
                  type="button"
                >
                  Interface
                </button>
                <button
                  className={`type-mode-btn ${mode === "type" ? "active" : ""}`}
                  onClick={() => setMode("type")}
                  type="button"
                >
                  Type Alias
                </button>
              </div>
            ) : null}

            <label className="type-field">
              <span>Language</span>
              <select
                aria-label="Target language"
                onChange={(event) => setLanguage(event.target.value as TargetLanguage)}
                value={language}
              >
                {LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="output-body">
            {!input.trim() ? (
              <div className="empty-state">Generated types will appear here.</div>
            ) : !parsed.valid ? (
              <div className="error-box">
                <h2>Invalid JSON</h2>
                <p>{parsed.error}</p>
              </div>
            ) : (
              <pre className="code-view type-code-view">{output}</pre>
            )}
          </div>
        </div>
      </section>

      <footer className="statusbar">
        <span>{status}</span>
        <span>ToolHub Co.,Ltd. Copyright © 2026 | toolhub@gmail.com</span>
      </footer>
    </main>
  );
}

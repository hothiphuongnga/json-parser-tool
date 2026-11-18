"use client";

import { useMemo, useState } from "react";
import CodeEditor from "@/app/components/CodeEditor";
import GoogleAd from "@/app/components/GoogleAd";
import { useI18n } from "@/app/components/I18nProvider";
import JsonError from "@/app/components/JsonError";
import SiteHeader from "@/app/components/SiteHeader";
import { useMediaQuery, useSplitResize } from "@/lib/hooks";
import { isPlainObject, parseJson, type JsonValue } from "@/lib/json";
import { copyToClipboard } from "@/lib/storage";
import "./json-to-type.css";

type OutputMode = "interface" | "type";
type TargetLanguage = "typescript" | "go" | "kotlin" | "swift" | "csharp" | "java" | "python";

type TypeShape = {
  expression: string;
  declarations: string[];
};

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
  "name": "Tools",
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
    if (language === "typescript") return "null";
    if (language === "python") return "None";
    return fallbackType(language);
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

type FieldShape = { shape: TypeShape; optional: boolean };

/** Infers one type for a set of values (array items, or one key across several objects). */
function inferUnion(values: JsonValue[], name: string, mode: OutputMode, language: TargetLanguage): TypeShape {
  if (values.length === 0) {
    return { expression: fallbackType(language), declarations: [] };
  }

  const objects = values.filter(isPlainObject);
  const shapes = values
    .filter((item) => !isPlainObject(item))
    .map((item) => inferType(item, name, mode, language));
  // All objects at the same position are merged into a single declaration, so
  // `[{ "a": 1 }, { "b": 2 }]` yields one type with two optional fields instead
  // of two conflicting declarations with the same name.
  if (objects.length > 0) shapes.push(inferObject(objects, name, mode, language));

  const declarations = shapes.flatMap((shape) => shape.declarations);
  const expressions = uniqueTypes(shapes.map((shape) => shape.expression));
  const expression =
    expressions.length === 1
      ? expressions[0]
      : language === "typescript" || language === "python"
        ? expressions.join(" | ")
        : fallbackType(language);

  return { expression, declarations };
}

function mergeArrayTypes(value: JsonValue[], parentName: string, mode: OutputMode, language: TargetLanguage): TypeShape {
  const item = inferUnion(value, parentName, mode, language);
  const needsParens = language === "typescript" && item.expression.includes(" | ");
  return {
    expression: arrayExpression(needsParens ? `(${item.expression})` : item.expression, language),
    declarations: item.declarations,
  };
}

function inferObject(objects: Array<{ [key: string]: JsonValue }>, name: string, mode: OutputMode, language: TargetLanguage): TypeShape {
  const typeName = toPascalCase(name);
  const keys = Array.from(new Set(objects.flatMap((item) => Object.keys(item))));
  const childDeclarations: string[] = [];
  const fields = keys.map((key) => {
    const values = objects.filter((item) => Object.hasOwn(item, key)).map((item) => item[key]);
    const shape = inferUnion(values, `${typeName}${toPascalCase(key)}`, mode, language);
    childDeclarations.push(...shape.declarations);
    return [key, { shape, optional: values.length < objects.length }] as const;
  });

  return {
    expression: typeName,
    declarations: [...childDeclarations, renderObjectDeclaration(typeName, fields, mode, language)],
  };
}

function renderObjectDeclaration(
  typeName: string,
  entries: ReadonlyArray<readonly [string, FieldShape]>,
  mode: OutputMode,
  language: TargetLanguage,
) {
  const nullable = (expression: string, optional: boolean) =>
    optional && !expression.endsWith("?") ? `${expression}?` : expression;

  switch (language) {
    case "go":
      return `type ${typeName} struct {\n${entries
        .map(([key, { shape, optional }]) => `  ${toPascalCase(key)} ${shape.expression} \`json:"${key}${optional ? ",omitempty" : ""}"\``)
        .join("\n")}\n}`;
    case "kotlin":
      return `data class ${typeName}(\n${entries
        .map(([key, { shape, optional }]) => `  val ${kotlinPropertyName(key)}: ${nullable(shape.expression, optional)}${optional ? " = null" : ""},`)
        .join("\n")}\n)`;
    case "swift":
      return `struct ${typeName}: Codable {\n${entries
        .map(([key, { shape, optional }]) => `  let ${toCamelCase(key)}: ${nullable(shape.expression, optional)}`)
        .join("\n")}\n}`;
    case "csharp":
      return `public class ${typeName}\n{\n${entries
        .map(([key, { shape, optional }]) => `    public ${nullable(shape.expression, optional)} ${toPascalCase(key)} { get; set; }`)
        .join("\n")}\n}`;
    case "java":
      return `public record ${typeName}(\n${entries
        .map(([key, { shape }], index) => `    ${shape.expression} ${javaPropertyName(key)}${index === entries.length - 1 ? "" : ","}`)
        .join("\n")}\n) {}`;
    case "python":
      // Dataclass fields with a default must come after fields without one.
      return `@dataclass\nclass ${typeName}:\n${[...entries]
        .sort(([, left], [, right]) => Number(left.optional) - Number(right.optional))
        .map(([key, { shape, optional }]) => `    ${toSnakeCase(key)}: ${optional ? `${shape.expression} | None = None` : shape.expression}`)
        .join("\n") || "    pass"}`;
    case "typescript":
    default: {
      const props = entries.map(([key, { shape, optional }]) => `  ${propertyName(key)}${optional ? "?" : ""}: ${shape.expression};`);
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

  return inferObject([value], name, mode, language);
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
    // Postponed annotations let classes reference types declared further down.
    const imports = ["from __future__ import annotations", "", "from dataclasses import dataclass"];
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

export default function JsonToTypeTool() {
  const { t, n } = useI18n();
  const tt = t.jsonToType;
  const [input, setInput] = useState(SAMPLE_JSON);
  const [rootName, setRootName] = useState("Root");
  const [language, setLanguage] = useState<TargetLanguage>("typescript");
  const [mode, setMode] = useState<OutputMode>("interface");
  const [statusMessage, setStatusMessage] = useState("");
  const isWide = useMediaQuery("(min-width: 1101px)");
  const {
    setContainer: setWorkspace,
    isResizing,
    handleProps,
    gridStyle,
  } = useSplitResize<HTMLElement>({ enabled: isWide, initial: 48, min: 28, max: 72 });

  const parsed = useMemo(() => parseJson(input), [input]);
  const output = useMemo(
    () => (parsed.valid ? buildTypes(parsed.value, rootName || "Root", mode, language) : ""),
    [language, mode, parsed, rootName],
  );

  const activeLanguage = LANGUAGES.find((item) => item.id === language)?.label ?? "TypeScript";
  const status = statusMessage
    ? statusMessage
    : !input.trim()
      ? t.common.ready
      : parsed.valid
        ? tt.generated(activeLanguage)
        : parsed.location
          ? tt.errorAt(parsed.location.line, parsed.location.column)
          : parsed.error;

  async function copyOutput() {
    if (!output) {
      setStatusMessage(t.common.nothingToCopy);
      return;
    }
    setStatusMessage((await copyToClipboard(output)) ? tt.typeCopied : t.common.clipboardDenied);
  }

  function formatInput() {
    if (!parsed.valid) {
      setStatusMessage(parsed.error || tt.cannotFormat);
      return;
    }
    setInput(JSON.stringify(parsed.value, null, 2));
    setStatusMessage(tt.formattedJson);
  }

  return (
    <main className="parser-shell type-tool-shell">
      <SiteHeader tool="jsonToType" workspace />

      <GoogleAd />

      <section
        className={`type-tool-workspace ${isResizing ? "is-resizing" : ""}`}
        ref={setWorkspace}
        style={gridStyle}
      >
        <div className="panel type-input-panel">
          <div className="panel-header">
            <span>{tt.input} · {t.common.chars(n(input.length))}</span>
            <div className="panel-tools panel-actions">
              <button className="mini-btn mini-btn-primary" onClick={formatInput} type="button">
                {t.common.format}
              </button>
              <button
                className="mini-btn"
                onClick={() => {
                  setInput(SAMPLE_JSON);
                  setStatusMessage(t.common.sampleLoaded);
                }}
                type="button"
              >
                {t.common.sample}
              </button>
              <button
                className="mini-btn mini-btn-danger"
                onClick={() => {
                  setInput("");
                  setStatusMessage(t.common.cleared);
                }}
                type="button"
              >
                {t.common.clear}
              </button>
            </div>
          </div>
          <CodeEditor
            ariaLabel={tt.input}
            errorLine={parsed.valid ? null : parsed.location?.line}
            onChange={(next) => {
              setInput(next);
              setStatusMessage("");
            }}
            placeholder={tt.placeholder}
            value={input}
          />
        </div>

        <div
          aria-label={t.common.resizePanels}
          className="resize-handle resize-handle-workspace type-resize-handle"
          {...handleProps}
        >
          <span />
        </div>

        <div className="panel type-output-panel">
          <div className="type-controls">
            <label className="type-field">
              <span>{tt.rootName}</span>
              <input onChange={(event) => setRootName(event.target.value)} placeholder="Root" value={rootName} />
            </label>

            {language === "typescript" ? (
              <div aria-label={tt.declarationKind} className="type-mode" role="group">
                <button
                  aria-pressed={mode === "interface"}
                  className={`type-mode-btn ${mode === "interface" ? "active" : ""}`}
                  onClick={() => setMode("interface")}
                  type="button"
                >
                  Interface
                </button>
                <button
                  aria-pressed={mode === "type"}
                  className={`type-mode-btn ${mode === "type" ? "active" : ""}`}
                  onClick={() => setMode("type")}
                  type="button"
                >
                  Type Alias
                </button>
              </div>
            ) : null}

            <label className="type-field">
              <span>{tt.language}</span>
              <select onChange={(event) => setLanguage(event.target.value as TargetLanguage)} value={language}>
                {LANGUAGES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <button className="mini-btn mini-btn-primary type-copy-btn" onClick={copyOutput} type="button">
              {tt.copyType}
            </button>
          </div>

          <div className="output-body">
            {!input.trim() ? (
              <div className="empty-state">{tt.emptyOutput}</div>
            ) : !parsed.valid ? (
              <JsonError location={parsed.location} message={parsed.error} source={parsed.normalized} />
            ) : (
              <pre className="code-view type-code-view">{output}</pre>
            )}
          </div>
        </div>
      </section>

      <footer className="statusbar">
        <span aria-live="polite" role="status">
          {status}
        </span>
        <span>{t.site.copyright}</span>
      </footer>
    </main>
  );
}

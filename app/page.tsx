"use client";

import { useEffect, useId, useMemo, useState } from "react";

type ParsedValue =
  | string
  | number
  | boolean
  | null
  | ParsedValue[]
  | { [key: string]: ParsedValue };

type ViewTab =
  | "formatted"
  | "tree"
  | "text"
  | "diff"
  | "php"
  | "js"
  | "python"
  | "xml"
  | "markdown";

type HistoryEntry = {
  id: string;
  createdAt: string;
  preview: string;
  input: string;
};

type TreeNodeProps = {
  label: string;
  value: ParsedValue;
  path: string;
  depth?: number;
  onSelectPath: (path: string) => void;
};

type TextViewEntry = {
  path: string;
  value: string;
};

const SAMPLE_JSON = `{
  "name": "John",
  "age": 30,
  "active": true,
  "skills": ["JSON", "TypeScript", "Next.js"],
  "address": {
    "city": "Ho Chi Minh City",
    "country": "Vietnam"
  }
}`;

const HISTORY_KEY = "json-parser-history";

const TABS: Array<{ id: ViewTab; label: string }> = [
  { id: "formatted", label: "Formatted" },
  { id: "tree", label: "Tree View" },
  { id: "text", label: "Text View" },
  { id: "diff", label: "Diff View" },
  { id: "php", label: "PHP Array" },
  { id: "js", label: "JS Object" },
  { id: "python", label: "Python Dict" },
  { id: "xml", label: "XML" },
  { id: "markdown", label: "Markdown" },
];

function readHistory() {
  if (typeof window === "undefined") {
    return [] as HistoryEntry[];
  }

  const saved = window.localStorage.getItem(HISTORY_KEY);
  if (!saved) {
    return [] as HistoryEntry[];
  }

  try {
    return JSON.parse(saved) as HistoryEntry[];
  } catch {
    window.localStorage.removeItem(HISTORY_KEY);
    return [] as HistoryEntry[];
  }
}

function readSharedInput() {
  if (typeof window === "undefined") {
    return "";
  }

  const rawHash = window.location.hash;
  if (!rawHash.startsWith("#data=")) {
    return "";
  }

  return decodeURIComponent(rawHash.slice(6));
}

function buildPreview(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 80) || "Empty input";
}

function sanitizeInput(input: string) {
  return input
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json)?/gi, "")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");
}

function autoFixJson(input: string) {
  let next = sanitizeInput(input).trim();
  next = next.replace(/,\s*([}\]])/g, "$1");
  next = next.replace(/([{,]\s*)([A-Za-z0-9_$]+)\s*:/g, '$1"$2":');
  next = next.replace(/:\s*'([^']*)'/g, ': "$1"');
  next = next.replace(/'([^']*)'\s*:/g, '"$1":');
  return next;
}

function parseInput(input: string) {
  const cleaned = sanitizeInput(input).trim();
  if (!cleaned) {
    return {
      value: null as ParsedValue | null,
      error: "",
      normalized: "",
      valid: false,
    };
  }

  try {
    return {
      value: JSON.parse(cleaned) as ParsedValue,
      error: "",
      normalized: cleaned,
      valid: true,
    };
  } catch (error) {
    return {
      value: null as ParsedValue | null,
      error: error instanceof Error ? error.message : "Invalid JSON",
      normalized: cleaned,
      valid: false,
    };
  }
}

function renderScalar(value: string | number | boolean | null) {
  if (value === null) {
    return "null";
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  return String(value);
}

function stringifyJsLike(value: ParsedValue, mode: "js" | "php" | "python", indent = 0): string {
  const pad = "  ".repeat(indent);
  const nextPad = "  ".repeat(indent + 1);

  if (value === null) {
    return mode === "python" ? "None" : "null";
  }

  if (typeof value === "string") {
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "boolean") {
    if (mode === "python") {
      return value ? "True" : "False";
    }
    return value ? "true" : "false";
  }

  if (Array.isArray(value)) {
    if (mode === "php") {
      const items = value.map((item) => `${nextPad}${stringifyJsLike(item, mode, indent + 1)}`);
      return `[\n${items.join(",\n")}\n${pad}]`;
    }

    const items = value.map((item) => `${nextPad}${stringifyJsLike(item, mode, indent + 1)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  const entries = Object.entries(value);
  if (mode === "php") {
    const body = entries
      .map(
        ([key, item]) =>
          `${nextPad}"${key}" => ${stringifyJsLike(item, mode, indent + 1)}`,
      )
      .join(",\n");
    return `[\n${body}\n${pad}]`;
  }

  if (mode === "python") {
    const body = entries
      .map(
        ([key, item]) =>
          `${nextPad}"${key}": ${stringifyJsLike(item, mode, indent + 1)}`,
      )
      .join(",\n");
    return `{\n${body}\n${pad}}`;
  }

  const identifier = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  const body = entries
    .map(([key, item]) => {
      const safeKey = identifier.test(key) ? key : `"${key}"`;
      return `${nextPad}${safeKey}: ${stringifyJsLike(item, mode, indent + 1)}`;
    })
    .join(",\n");
  return `{\n${body}\n${pad}}`;
}

function objectToXml(value: ParsedValue, nodeName = "root", indent = 0): string {
  const pad = "  ".repeat(indent);

  if (value === null) {
    return `${pad}<${nodeName} />`;
  }

  if (typeof value !== "object") {
    return `${pad}<${nodeName}>${String(value)}</${nodeName}>`;
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => objectToXml(item, "item", indent + 1)).join("\n");
    return `${pad}<${nodeName}>\n${items}\n${pad}</${nodeName}>`;
  }

  const children = Object.entries(value)
    .map(([key, item]) => objectToXml(item, key, indent + 1))
    .join("\n");
  return `${pad}<${nodeName}>\n${children}\n${pad}</${nodeName}>`;
}

function objectToMarkdown(value: ParsedValue) {
  if (!Array.isArray(value) || value.length === 0) {
    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(([key, item]) => `- **${key}**: \`${typeof item === "object" ? JSON.stringify(item) : String(item)}\``)
        .join("\n");
    }
    return "No tabular data available.";
  }

  const objectRows = value.filter(
    (item): item is Record<string, ParsedValue> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );

  if (objectRows.length !== value.length) {
    return value.map((item, index) => `- Row ${index + 1}: \`${JSON.stringify(item)}\``).join("\n");
  }

  const headers = Array.from(new Set(objectRows.flatMap((item) => Object.keys(item))));
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const rows = objectRows.map((item) => {
    const cells = headers.map((header) => {
      const cell = item[header];
      if (cell === null || cell === undefined) {
        return "";
      }
      return typeof cell === "object" ? JSON.stringify(cell) : String(cell);
    });
    return `| ${cells.join(" | ")} |`;
  });

  return [head, divider, ...rows].join("\n");
}

function diffLines(original: string, formatted: string) {
  const left = original.split("\n");
  const right = formatted.split("\n");
  const max = Math.max(left.length, right.length);

  return Array.from({ length: max }, (_, index) => ({
    original: left[index] ?? "",
    formatted: right[index] ?? "",
    changed: (left[index] ?? "") !== (right[index] ?? ""),
  }));
}

function flattenTextView(value: ParsedValue, path = "$"): TextViewEntry[] {
  if (value === null) {
    return [{ path, value: "null" }];
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [{ path, value: String(value) }];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ path, value: "[]" }];
    }

    return value.flatMap((item, index) => flattenTextView(item, `${path}[${index}]`));
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return [{ path, value: "{}" }];
  }

  return entries.flatMap(([key, item]) => flattenTextView(item, `${path}.${key}`));
}

function TreeNode({ label, value, path, depth = 0, onSelectPath }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 1);
  const isExpandable = typeof value === "object" && value !== null;

  if (!isExpandable) {
    return (
      <div className="tree-node" style={{ paddingLeft: `${depth * 18}px` }}>
        <button className="tree-label" onClick={() => onSelectPath(path)} type="button">
          <span className="tree-key">{label}</span>
          <span className="tree-separator">:</span>
          <span className="tree-value">{renderScalar(value)}</span>
        </button>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item] as const)
    : Object.entries(value);

  return (
    <div className="tree-node">
      <button
        className="tree-label"
        onClick={() => {
          setOpen((current) => !current);
          onSelectPath(path);
        }}
        style={{ paddingLeft: `${depth * 18}px` }}
        type="button"
      >
        <span className="tree-toggle">{open ? "▾" : "▸"}</span>
        <span className="tree-key">{label}</span>
        <span className="tree-separator">:</span>
        <span className="tree-hint">{Array.isArray(value) ? `[${value.length}]` : `{${entries.length}}`}</span>
      </button>
      {open ? (
        <div>
          {entries.map(([childKey, childValue]) => (
            <TreeNode
              key={`${path}.${childKey}`}
              label={childKey}
              onSelectPath={onSelectPath}
              path={Array.isArray(value) ? `${path}[${childKey}]` : `${path}.${childKey}`}
              value={childValue}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Home() {
  const initialSharedInput = readSharedInput();
  const [input, setInput] = useState(initialSharedInput);
  const [activeTab, setActiveTab] = useState<ViewTab>("tree");
  const [statusMessage, setStatusMessage] = useState(
    initialSharedInput ? "Loaded shared data" : "",
  );
  const [selectedPath, setSelectedPath] = useState("$");
  const [history, setHistory] = useState<HistoryEntry[]>(readHistory);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputId = useId();

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const parsed = useMemo(() => parseInput(input), [input]);
  const prettyOutput = parsed.valid ? JSON.stringify(parsed.value, null, 2) : "";
  const minifiedOutput = parsed.valid ? JSON.stringify(parsed.value) : "";
  const textOutput = parsed.valid ? stringifyJsLike(parsed.value as ParsedValue, "js") : "";
  const phpOutput = parsed.valid ? stringifyJsLike(parsed.value as ParsedValue, "php") : "";
  const pythonOutput = parsed.valid ? stringifyJsLike(parsed.value as ParsedValue, "python") : "";
  const xmlOutput = parsed.valid ? objectToXml(parsed.value as ParsedValue) : "";
  const markdownOutput = parsed.valid ? objectToMarkdown(parsed.value as ParsedValue) : "";
  const diffOutput = parsed.valid ? diffLines(parsed.normalized, prettyOutput) : [];
  const textViewEntries = parsed.valid ? flattenTextView(parsed.value as ParsedValue) : [];
  const charCount = input.length;
  const status = useMemo(() => {
    if (statusMessage) {
      return statusMessage;
    }
    if (!input.trim()) {
      return "Ready";
    }
    return parsed.valid ? "Valid JSON" : parsed.error;
  }, [input, parsed.error, parsed.valid, statusMessage]);

  function saveToHistory(nextInput: string) {
    const cleaned = nextInput.trim();
    if (!cleaned) {
      return;
    }

    const entry: HistoryEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toLocaleString(),
      preview: buildPreview(cleaned),
      input: cleaned,
    };

    setHistory((current) => [entry, ...current.filter((item) => item.input !== cleaned)].slice(0, 10));
  }

  function handlePretty() {
    if (!parsed.valid) {
      setStatusMessage(parsed.error || "Cannot format invalid JSON");
      return;
    }

    setInput(prettyOutput);
    setStatusMessage("Formatted successfully");
    saveToHistory(prettyOutput);
    setActiveTab("formatted");
  }

  function handleMinify() {
    if (!parsed.valid) {
      setStatusMessage(parsed.error || "Cannot minify invalid JSON");
      return;
    }

    setInput(minifiedOutput);
    setStatusMessage("Minified successfully");
    saveToHistory(minifiedOutput);
    setActiveTab("text");
  }

  function handleValidate() {
    setStatusMessage(parsed.valid ? "JSON is valid" : parsed.error || "Invalid JSON");
    if (parsed.valid) {
      saveToHistory(input);
    }
  }

  function handleAutoFix() {
    const fixed = autoFixJson(input);
    setInput(fixed);
    const nextParsed = parseInput(fixed);
    setStatusMessage(
      nextParsed.valid ? "Auto-fix applied" : nextParsed.error || "Unable to fully auto-fix",
    );
  }

  async function copyText(value: string, message: string) {
    if (!value) {
      setStatusMessage("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setStatusMessage(message);
    } catch {
      setStatusMessage("Clipboard permission was denied");
    }
  }

  function handleSample() {
    setInput(SAMPLE_JSON);
    setStatusMessage("Sample loaded");
    setActiveTab("tree");
    saveToHistory(SAMPLE_JSON);
  }

  function handleClear() {
    setInput("");
    setSelectedPath("$");
    setStatusMessage("Cleared");
  }

  function handleLoadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    file.text().then((text) => {
      setInput(text);
      setStatusMessage(`Loaded ${file.name}`);
      saveToHistory(text);
    });
  }

  async function handleShare() {
    if (!input.trim()) {
      setStatusMessage("Nothing to share");
      return;
    }

    const shareUrl = `${window.location.origin}${window.location.pathname}#data=${encodeURIComponent(input)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "JSON Parser Online",
          text: "Shared JSON payload",
          url: shareUrl,
        });
        setStatusMessage("Shared successfully");
        return;
      } catch {
        // Fall back to clipboard below.
      }
    }

    await copyText(shareUrl, "Share link copied");
  }

  function currentOutput() {
    switch (activeTab) {
      case "formatted":
        return prettyOutput;
      case "tree":
        return prettyOutput;
      case "text":
        return textOutput;
      case "diff":
        return prettyOutput;
      case "php":
        return phpOutput;
      case "js":
        return textOutput;
      case "python":
        return pythonOutput;
      case "xml":
        return xmlOutput;
      case "markdown":
        return markdownOutput;
      default:
        return prettyOutput;
    }
  }

  return (
    <main className="parser-shell">
      <section className="topbar">
        <div className="brand">JSON Parser Online</div>
        <div className="toolbar">
          <button
            className="btn btn-muted"
            onClick={() => setStatusMessage("JSON parser with formatter, tree view and converters.")}
            type="button"
          >
            About
          </button>
          <button className="btn btn-primary" onClick={handlePretty} type="button">
            Format (Pretty)
          </button>
          <button className="btn btn-warning" onClick={handleMinify} type="button">
            Minify
          </button>
          <button className="btn btn-success" onClick={handleValidate} type="button">
            Validate
          </button>
          <button className="btn btn-muted" onClick={handleAutoFix} type="button">
            Auto Fix
          </button>
          <button className="btn btn-muted" onClick={() => copyText(input, "Input copied")} type="button">
            Copy
          </button>
          <button className="btn btn-muted" onClick={handleSample} type="button">
            Sample
          </button>
          <button className="btn btn-muted" onClick={handleShare} type="button">
            Share
          </button>
          <label className="btn btn-muted" htmlFor={fileInputId}>
            Load
          </label>
          <input
            className="sr-only"
            id={fileInputId}
            onChange={handleLoadFile}
            type="file"
            accept=".json,.txt,.md,.csv,.xml"
          />
          <button className="btn btn-danger" onClick={handleClear} type="button">
            Clear
          </button>
          <button className="btn btn-muted" onClick={() => setShowHistory((current) => !current)} type="button">
            History
          </button>
        </div>
      </section>

      <section className="workspace">
        <div className="panel input-panel">
          <div className="panel-header">
            <span>Input JSON</span>
            <div className="panel-tools">
              <span>{charCount} chars</span>
              <button className="mini-btn" onClick={() => setShowHistory((current) => !current)} type="button">
                History
              </button>
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
              placeholder={`Paste or drag & drop your data here...\n\nSupported formats:\n• JSON, JSONL, XML, Markdown, CSV\n• URL - Auto fetch JSON/CSV\n• curl - Fetch with headers\n• File drop - JSON, XML, CSV, TXT, MD\n\nExample:\n{"name": "John", "age": 30}`}
              spellCheck={false}
              value={input}
            />
          </div>
          {showHistory ? (
            <div className="history-box">
              {history.length === 0 ? <p>No history yet.</p> : null}
              {history.map((item) => (
                <button
                  className="history-item"
                  key={item.id}
                  onClick={() => {
                    setInput(item.input);
                    setStatusMessage(`Loaded history from ${item.createdAt}`);
                    setShowHistory(false);
                  }}
                  type="button"
                >
                  <strong>{item.createdAt}</strong>
                  <span>{item.preview}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="panel output-panel">
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
            {activeTab !== "text" ? (
              <button className="mini-btn copy-output" onClick={() => copyText(currentOutput(), "Output copied")} type="button">
                Copy
              </button>
            ) : null}
          </div>

          <div className="output-body">
            {!input.trim() ? (
              <div className="empty-state">Output will appear here when you enter JSON.</div>
            ) : !parsed.valid ? (
              <div className="error-box">
                <h2>Invalid JSON</h2>
                <p>{parsed.error}</p>
              </div>
            ) : activeTab === "tree" ? (
              <div className="tree-view">
                <TreeNode label="$" onSelectPath={setSelectedPath} path="$" value={parsed.value as ParsedValue} />
              </div>
            ) : activeTab === "text" ? (
              <div className="text-view">
                {textViewEntries.map((entry) => (
                  <article
                    className="text-card"
                    key={`${entry.path}-${entry.value}`}
                    onClick={() => setSelectedPath(entry.path)}
                  >
                    <header className="text-card-header">
                      <span className="text-card-path">{entry.path}</span>
                      <button
                        className="text-copy-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          void copyText(entry.value, `Copied ${entry.path}`);
                          setSelectedPath(entry.path);
                        }}
                        type="button"
                      >
                        Copy
                      </button>
                    </header>
                    <div className="text-card-value">{entry.value}</div>
                  </article>
                ))}
              </div>
            ) : activeTab === "diff" ? (
              <div className="diff-view">
                {diffOutput.map((line, index) => (
                  <div className={`diff-row ${line.changed ? "changed" : ""}`} key={`${index}-${line.original}-${line.formatted}`}>
                    <div className="diff-cell">{line.original || " "}</div>
                    <div className="diff-cell">{line.formatted || " "}</div>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="code-view">{currentOutput()}</pre>
            )}
          </div>
          <div className="pathbar">Path: {selectedPath}</div>
        </div>
      </section>

      <footer className="statusbar">
        <span>{status}</span>
        <span>PlayHouse Co.,Ltd. Copyright © 2026 | apps@playhouse.com</span>
      </footer>
    </main>
  );
}

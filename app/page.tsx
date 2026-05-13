"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

type DiffLine = {
  original: string;
  formatted: string;
  changed: boolean;
  changeType: "added" | "removed" | "modified" | "unchanged";
};

type DragTarget = "workspace" | "diff";

type MarkdownMode = "table-render" | "table-source" | "plain-render" | "plain-source";
type ThemeTone = "blue" | "green" | "violet" | "dark";

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
const THEME_KEY = "json-parser-theme";

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

const THEMES: Array<{ id: ThemeTone; label: string }> = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "violet", label: "Violet" },
  { id: "dark", label: "Dark" },
];

function readTheme() {
  if (typeof window === "undefined") {
    return "blue" as ThemeTone;
  }

  const saved = window.localStorage.getItem(THEME_KEY);
  return THEMES.some((theme) => theme.id === saved) ? (saved as ThemeTone) : "blue";
}

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

function objectToXml(value: ParsedValue, nodeName = '?xml version="1.0" encoding="UTF-8"?', indent = 0): string {
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
      const body = Object.entries(value)
        .map(([key, item]) => `- **${key}**: \`${typeof item === "object" ? JSON.stringify(item) : String(item)}\``)
        .join("\n");
      return `# JSON Data\n\n${body}`;
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
  const allHeaders = ["#", ...headers];
  const head = `| ${allHeaders.join(" | ")} |`;
  const divider = `| ${allHeaders.map(() => "---").join(" | ")} |`;
  const rows = objectRows.map((item, index) => {
    const cells = headers.map((header) => {
      const cell = item[header];
      if (cell === null || cell === undefined) {
        return "";
      }
      return typeof cell === "object" ? JSON.stringify(cell) : String(cell);
    });
    return `| ${[String(index), ...cells].join(" | ")} |`;
  });

  return ["# JSON Data", "", head, divider, ...rows].join("\n");
}

function objectToPlainMarkdown(value: ParsedValue, heading = "JSON Data"): string {
  const lines: string[] = [`# ${heading}`, ""];

  function walk(node: ParsedValue, label: string, depth = 2) {
    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        lines.push(`${"#".repeat(depth)} ${label}.${index}`);
        lines.push("");
        walk(item, `${label}.${index}`, depth + 1);
      });
      return;
    }

    if (node && typeof node === "object") {
      const entries = Object.entries(node);
      if (label !== heading) {
        lines.push(`${"#".repeat(depth)} ${label}`);
        lines.push("");
      }

      entries.forEach(([key, item]) => {
        if (item && typeof item === "object") {
          walk(item, key, depth + 1);
          return;
        }

        lines.push(`- **${key}:** ${String(item)}`);
      });

      lines.push("");
      return;
    }

    lines.push(`- ${String(node)}`);
    lines.push("");
  }

  walk(value, heading);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function diffLines(original: string, formatted: string): DiffLine[] {
  const left = original.split("\n");
  const right = formatted.split("\n");
  const max = Math.max(left.length, right.length);

  return Array.from({ length: max }, (_, index) => ({
    original: left[index] ?? "",
    formatted: right[index] ?? "",
    changed: (left[index] ?? "") !== (right[index] ?? ""),
    changeType:
      !(left[index] ?? "") && (right[index] ?? "")
        ? "added"
        : (left[index] ?? "") && !(right[index] ?? "")
          ? "removed"
          : (left[index] ?? "") !== (right[index] ?? "")
            ? "modified"
            : "unchanged",
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
  const [compareInput, setCompareInput] = useState("");
  const [activeTab, setActiveTab] = useState<ViewTab>("tree");
  const [statusMessage, setStatusMessage] = useState(
    initialSharedInput ? "Loaded shared data" : "",
  );
  const [selectedPath, setSelectedPath] = useState("$");
  const [history, setHistory] = useState<HistoryEntry[]>(readHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>("table-render");
  const [workspaceSplit, setWorkspaceSplit] = useState(50);
  const [diffSplit, setDiffSplit] = useState(50);
  const [theme, setTheme] = useState<ThemeTone>(readTheme);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [canResizeWorkspace, setCanResizeWorkspace] = useState(false);
  const [canResizeDiff, setCanResizeDiff] = useState(false);
  const workspaceRef = useRef<HTMLElement | null>(null);
  const diffCompareRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    function syncResizeAvailability() {
      setCanResizeWorkspace(window.innerWidth > 1100);
      setCanResizeDiff(window.innerWidth > 720);
    }

    syncResizeAvailability();
    window.addEventListener("resize", syncResizeAvailability);

    return () => window.removeEventListener("resize", syncResizeAvailability);
  }, []);

  useEffect(() => {
    if (!dragTarget || (dragTarget === "workspace" && !canResizeWorkspace) || (dragTarget === "diff" && !canResizeDiff)) {
      return;
    }

    function handlePointerMove(event: MouseEvent) {
      const container = dragTarget === "workspace" ? workspaceRef.current : diffCompareRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }

      const percent = ((event.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(75, Math.max(25, percent));

      if (dragTarget === "workspace") {
        setWorkspaceSplit(clamped);
      } else {
        setDiffSplit(clamped);
      }
    }

    function handlePointerUp() {
      setDragTarget(null);
    }

    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
    };
  }, [canResizeDiff, canResizeWorkspace, dragTarget]);

  const parsed = useMemo(() => parseInput(input), [input]);
  const comparedParsed = useMemo(() => parseInput(compareInput), [compareInput]);
  const prettyOutput = parsed.valid ? JSON.stringify(parsed.value, null, 2) : "";
  const minifiedOutput = parsed.valid ? JSON.stringify(parsed.value) : "";
  const textOutput = parsed.valid ? stringifyJsLike(parsed.value as ParsedValue, "js") : "";
  const phpOutput = parsed.valid ? stringifyJsLike(parsed.value as ParsedValue, "php") : "";
  const pythonOutput = parsed.valid ? stringifyJsLike(parsed.value as ParsedValue, "python") : "";
  const xmlOutput = parsed.valid ? objectToXml(parsed.value as ParsedValue) : "";
  const markdownOutput = parsed.valid ? objectToMarkdown(parsed.value as ParsedValue) : "";
  const markdownPlainOutput = parsed.valid ? objectToPlainMarkdown(parsed.value as ParsedValue) : "";
  const diffLeftSource = parsed.valid ? JSON.stringify(parsed.value, null, 2) : parsed.normalized;
  const diffRightSource = comparedParsed.valid
    ? JSON.stringify(comparedParsed.value, null, 2)
    : sanitizeInput(compareInput).trim();
  const diffOutput = useMemo(
    () => (input.trim() || compareInput.trim() ? diffLines(diffLeftSource, diffRightSource) : []),
    [compareInput, diffLeftSource, diffRightSource, input],
  );
  const textViewEntries = parsed.valid ? flattenTextView(parsed.value as ParsedValue) : [];
  const diffStats = useMemo(
    () =>
      diffOutput.reduce(
        (summary, line) => {
          summary[line.changeType] += 1;
          return summary;
        },
        { added: 0, removed: 0, modified: 0, unchanged: 0 },
      ),
    [diffOutput],
  );
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
    setCompareInput("");
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

  function handleSwapDiff() {
    setInput(compareInput);
    setCompareInput(input);
    setStatusMessage("Swapped compare panes");
  }

  function handleClearDiff() {
    setCompareInput("");
    setStatusMessage("Cleared compare JSON");
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
        return markdownMode === "plain-source" || markdownMode === "plain-render"
          ? markdownPlainOutput
          : markdownOutput;
      default:
        return prettyOutput;
    }
  }

  return (
    <main className="parser-shell" data-theme={theme}>
      <div
        aria-hidden={!showHistory}
        className={`history-overlay ${showHistory ? "open" : ""}`}
        onClick={() => setShowHistory(false)}
      />
      <aside aria-hidden={!showHistory} className={`history-drawer ${showHistory ? "open" : ""}`}>
        <div className="history-drawer-header">
          <div>
            <strong>History</strong>
            <p>Recent JSON snapshots</p>
          </div>
          <button className="history-close-btn" onClick={() => setShowHistory(false)} type="button">
            Close
          </button>
        </div>
        <div className="history-box">
          {history.length === 0 ? <p>No history yet.</p> : null}
          {history?.map((item) => (
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
      </aside>

      <section className="topbar">
        <div className="brand">JSON Parser Online</div>
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
          <button className="btn btn-muted" onClick={() => copyText(input, "Input copied")} type="button">
            Copy
          </button>
          <button className="btn btn-muted" onClick={handleSample} type="button">
            Sample
          </button>
          <button className="btn btn-muted" onClick={handleShare} type="button">
            Share
          </button>
          
          <button className="btn btn-danger" onClick={handleClear} type="button">
            Clear
          </button>
          <button className="btn btn-muted" onClick={() => setShowHistory((current) => !current)} type="button">
            History
          </button>
        </div>
      </section>

      <section
        className={`workspace ${dragTarget === "workspace" ? "is-resizing" : ""}`}
        ref={workspaceRef}
        style={
          canResizeWorkspace
            ? { gridTemplateColumns: `${workspaceSplit}% 10px minmax(0, ${100 - workspaceSplit}%)` }
            : undefined
        }
      >
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
        </div>

        <button
          aria-label="Resize panels"
          className="resize-handle resize-handle-workspace"
          onMouseDown={() => {
            if (canResizeWorkspace) {
              setDragTarget("workspace");
            }
          }}
          type="button"
        >
          <span />
        </button>

        <div className="panel output-panel">
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                className={`tab ${activeTab === tab.id ? "active" : ""}`}
                key={tab.id}
                onClick={() => {
                  if (tab.id === "diff" && !compareInput.trim() && input.trim()) {
                    setCompareInput(input);
                  }
                  setActiveTab(tab.id);
                }}
                type="button"
              >
                {tab.label}
              </button>
            ))}
            {activeTab !== "text" && activeTab !== "diff" && activeTab !== "markdown" ? (
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

                <div className="diff-editor-shell">
                  <div className="diff-editor-header">Compare JSON</div>
                  <textarea
                    className="diff-editor"
                    onChange={(event) => {
                      setCompareInput(event.target.value);
                      setStatusMessage("");
                    }}
                    placeholder="Paste JSON to compare against the input JSON..."
                    spellCheck={false}
                    value={compareInput}
                  />
                </div>

                <div className="diff-toolbar">
                  <div className="diff-actions">
                    <button className="diff-btn" onClick={handleSwapDiff} type="button">
                      Swap
                    </button>
                    <button className="diff-btn diff-btn-muted" onClick={handleClearDiff} type="button">
                      Clear
                    </button>
                    <button className="diff-btn diff-btn-copy" onClick={() => copyText(compareInput, "Compare JSON copied")} type="button">
                      Copy
                    </button>
                  </div>
                  <div className="diff-stats">
                    <span className="diff-stat diff-stat-added">{diffStats.added} Added</span>
                    <span className="diff-stat diff-stat-removed">{diffStats.removed} Removed</span>
                    <span className="diff-stat diff-stat-modified">{diffStats.modified} Modified</span>
                    <span className="diff-stat">{diffStats.unchanged} Unchanged</span>
                  </div>
                </div>

                <div
                  className={`diff-compare ${dragTarget === "diff" ? "is-resizing" : ""}`}
                  ref={diffCompareRef}
                  style={
                    canResizeDiff
                      ? { gridTemplateColumns: `${diffSplit}% 10px minmax(0, ${100 - diffSplit}%)` }
                      : undefined
                  }
                >
                  <div className="diff-column">
                    <div className="diff-column-header">Input JSON</div>
                    <div className="diff-lines">
                      {diffOutput.map((line, index) => (
                        <div className={`diff-line ${line.changeType !== "unchanged" ? `is-${line.changeType}` : ""}`} key={`left-${index}-${line.original}`}>
                          <span className="diff-line-number">{index + 1}</span>
                          <span className="diff-line-code">{line.original || " "}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    aria-label="Resize diff columns"
                    className="resize-handle resize-handle-diff"
                    onMouseDown={() => {
                      if (canResizeDiff) {
                        setDragTarget("diff");
                      }
                    }}
                    type="button"
                  >
                    <span />
                  </button>

                  <div className="diff-column">
                    <div className="diff-column-header">Compare JSON</div>
                    <div className="diff-lines">
                      {diffOutput.map((line, index) => (
                        <div className={`diff-line ${line.changeType !== "unchanged" ? `is-${line.changeType}` : ""}`} key={`right-${index}-${line.formatted}`}>
                          <span className="diff-line-number">{index + 1}</span>
                          <span className="diff-line-code">{line.formatted || " "}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "markdown" ? (
              <div className="markdown-view">
                <div className="markdown-toolbar">
                  <div className="markdown-modes">
                    <button
                      className={`markdown-mode-btn ${markdownMode === "table-render" ? "active" : ""}`}
                      onClick={() => setMarkdownMode("table-render")}
                      type="button"
                    >
                      Table Render
                    </button>
                    <button
                      className={`markdown-mode-btn ${markdownMode === "table-source" ? "active" : ""}`}
                      onClick={() => setMarkdownMode("table-source")}
                      type="button"
                    >
                      Table Source
                    </button>
                    <span className="markdown-mode-divider" />
                    <button
                      className={`markdown-mode-btn ${markdownMode === "plain-render" ? "active" : ""}`}
                      onClick={() => setMarkdownMode("plain-render")}
                      type="button"
                    >
                      Plain Render
                    </button>
                    <button
                      className={`markdown-mode-btn ${markdownMode === "plain-source" ? "active" : ""}`}
                      onClick={() => setMarkdownMode("plain-source")}
                      type="button"
                    >
                      Plain Source
                    </button>
                  </div>

                  <button className="markdown-copy-btn" onClick={() => copyText(currentOutput(), "Markdown copied")} type="button">
                    Copy
                  </button>
                </div>

                {markdownMode === "table-source" ? (
                  <pre className="code-view markdown-source-view">{markdownOutput}</pre>
                ) : null}

                {markdownMode === "plain-source" ? (
                  <pre className="code-view markdown-source-view">{markdownPlainOutput}</pre>
                ) : null}

                {markdownMode === "table-render" ? (
                  <div className="markdown-render">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownOutput}</ReactMarkdown>
                  </div>
                ) : null}

                {markdownMode === "plain-render" ? (
                  <div className="markdown-render">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownPlainOutput}</ReactMarkdown>
                  </div>
                ) : null}
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
        <span>ToolHub Co.,Ltd. Copyright © 2026 | toolhub@gmail.com</span>
      </footer>
    </main>
  );
}

"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeEditor from "@/app/components/CodeEditor";
import { useI18n } from "@/app/components/I18nProvider";
import GoogleAd from "@/app/components/GoogleAd";
import JsonError from "@/app/components/JsonError";
import SiteHeader from "@/app/components/SiteHeader";
import { flattenJson, toCode, toMarkdownOutline, toMarkdownTable, toXml } from "@/lib/converters";
import { diffText } from "@/lib/diff";
import { useMediaQuery, useSplitResize } from "@/lib/hooks";
import { childPath, parseJson, sanitizeInput, type JsonValue } from "@/lib/json";
import { copyToClipboard, readStorage, removeStorage, writeStorage } from "@/lib/storage";

type ViewTab = "formatted" | "tree" | "text" | "diff" | "php" | "js" | "python" | "xml" | "markdown";
type MarkdownMode = "table-render" | "table-source" | "plain-render" | "plain-source";

type HistoryEntry = {
  id: string;
  createdAt: string;
  preview: string;
  input: string;
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
const HISTORY_LIMIT = 10;
/** Inputs larger than this are not written to history, to stay well inside the storage quota. */
const HISTORY_MAX_ENTRY = 200_000;
const TREE_PAGE = 200;
const TEXT_PAGE = 500;
const DIFF_RENDER_LIMIT = 5000;

const TABS: ViewTab[] = ["tree", "formatted", "text", "diff", "js", "php", "python", "xml", "markdown"];

const MARKDOWN_MODES: Array<{ id: MarkdownMode; key: "tableRender" | "tableSource" | "plainRender" | "plainSource" }> = [
  { id: "table-render", key: "tableRender" },
  { id: "table-source", key: "tableSource" },
  { id: "plain-render", key: "plainRender" },
  { id: "plain-source", key: "plainSource" },
];

function readHistory(): HistoryEntry[] {
  const saved = readStorage(HISTORY_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    removeStorage(HISTORY_KEY);
    return [];
  }
}

/** Writes history, dropping the oldest entries until it fits in storage. */
function writeHistory(entries: HistoryEntry[]) {
  for (let count = entries.length; count >= 0; count -= 1) {
    if (writeStorage(HISTORY_KEY, JSON.stringify(entries.slice(0, count)))) return;
  }
}

function readSharedInput() {
  const rawHash = window.location.hash;
  if (!rawHash.startsWith("#data=")) return "";
  try {
    return decodeURIComponent(rawHash.slice(6));
  } catch {
    return "";
  }
}

function formatTimestamp(value: string, intl: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(intl);
}

function renderScalar(value: string | number | boolean | null) {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

type TreeNodeProps = {
  label: string;
  value: JsonValue;
  path: string;
  depth?: number;
  selectedPath: string;
  onSelectPath: (path: string) => void;
};

function TreeNode({ label, value, path, depth = 0, selectedPath, onSelectPath }: TreeNodeProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(depth < 1);
  const [visible, setVisible] = useState(TREE_PAGE);
  const indent = { paddingLeft: `${depth * 18}px` };
  const selected = selectedPath === path;

  if (value === null || typeof value !== "object") {
    return (
      <div className="tree-node">
        <button
          aria-current={selected ? "true" : undefined}
          className="tree-label"
          onClick={() => onSelectPath(path)}
          style={indent}
          type="button"
        >
          <span className="tree-key">{label}</span>
          <span className="tree-separator">:</span>
          <span className="tree-value">{renderScalar(value)}</span>
        </button>
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: Array<[string, JsonValue]> = isArray
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  return (
    <div className="tree-node">
      <button
        aria-current={selected ? "true" : undefined}
        aria-expanded={open}
        className="tree-label"
        onClick={() => {
          setOpen((current) => !current);
          onSelectPath(path);
        }}
        style={indent}
        type="button"
      >
        <span className="tree-toggle">{open ? "▾" : "▸"}</span>
        <span className="tree-key">{label}</span>
        <span className="tree-separator">:</span>
        <span className="tree-hint">{isArray ? `[${entries.length}]` : `{${entries.length}}`}</span>
      </button>
      {open ? (
        <div>
          {entries.slice(0, visible).map(([childKey, childValue]) => {
            const nextPath = isArray ? childPath(path, Number(childKey)) : childPath(path, childKey);
            return (
              <TreeNode
                depth={depth + 1}
                key={nextPath}
                label={childKey}
                onSelectPath={onSelectPath}
                path={nextPath}
                selectedPath={selectedPath}
                value={childValue}
              />
            );
          })}
          {entries.length > visible ? (
            <button
              className="tree-more"
              onClick={() => setVisible((current) => current + TREE_PAGE)}
              style={{ paddingLeft: `${(depth + 1) * 18}px` }}
              type="button"
            >
              {t.jsonParser.showMoreTree(Math.min(TREE_PAGE, entries.length - visible), entries.length - visible)}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function JsonParserTool() {
  const { t, n, intl } = useI18n();
  const tj = t.jsonParser;
  const [input, setInput] = useState("");
  const [compareInput, setCompareInput] = useState("");
  const [activeTab, setActiveTab] = useState<ViewTab>("tree");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedPath, setSelectedPath] = useState("$");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>("table-render");
  const [textVisible, setTextVisible] = useState(TEXT_PAGE);
  const [hasHydrated, setHasHydrated] = useState(false);

  const isWide = useMediaQuery("(min-width: 1101px)");
  const isMedium = useMediaQuery("(min-width: 721px)");
  const {
    setContainer: setWorkspace,
    isResizing: workspaceResizing,
    handleProps: workspaceHandle,
    gridStyle: workspaceGrid,
  } = useSplitResize<HTMLElement>({ enabled: isWide });
  const {
    setContainer: setDiffCompare,
    isResizing: diffResizing,
    handleProps: diffHandle,
    gridStyle: diffGrid,
  } = useSplitResize<HTMLDivElement>({ enabled: isMedium });

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const sharedInput = readSharedInput();
      setHistory(readHistory());
      if (sharedInput) {
        setInput(sharedInput);
        setStatusMessage(tj.sharedLoaded);
      }
      setHasHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [tj.sharedLoaded]);

  useEffect(() => {
    if (hasHydrated) writeHistory(history);
  }, [hasHydrated, history]);

  useEffect(() => {
    if (!showHistory) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHistory(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showHistory]);

  // Typing stays responsive on large inputs: parsing and rendering follow a deferred copy.
  const deferredInput = useDeferredValue(input);
  const deferredCompare = useDeferredValue(compareInput);
  const parsed = useMemo(() => parseJson(deferredInput), [deferredInput]);
  const value = parsed.valid ? parsed.value : null;
  const prettyOutput = useMemo(() => (parsed.valid ? JSON.stringify(parsed.value, null, 2) : ""), [parsed]);

  // Only the active view is computed.
  const output = useMemo(() => {
    if (!parsed.valid) return "";
    switch (activeTab) {
      case "js":
        return toCode(parsed.value, "js");
      case "php":
        return toCode(parsed.value, "php");
      case "python":
        return toCode(parsed.value, "python");
      case "xml":
        return toXml(parsed.value);
      case "markdown":
        return markdownMode.startsWith("plain") ? toMarkdownOutline(parsed.value) : toMarkdownTable(parsed.value, tj.noTableData);
      default:
        return prettyOutput;
    }
  }, [activeTab, markdownMode, parsed, prettyOutput, tj.noTableData]);

  const textEntries = useMemo(
    () => (activeTab === "text" && parsed.valid ? flattenJson(parsed.value) : []),
    [activeTab, parsed],
  );

  const diff = useMemo(() => {
    if (activeTab !== "diff" || (!deferredInput.trim() && !deferredCompare.trim())) return null;
    const compared = parseJson(deferredCompare);
    const left = parsed.valid ? prettyOutput : parsed.normalized;
    const right = compared.valid ? JSON.stringify(compared.value, null, 2) : sanitizeInput(deferredCompare);
    return diffText(left, right);
  }, [activeTab, deferredCompare, deferredInput, parsed, prettyOutput]);

  const status = statusMessage
    ? statusMessage
    : !input.trim()
      ? t.common.ready
      : parsed.valid
        ? parsed.repaired
          ? tj.validRepaired
          : tj.valid
        : parsed.location
          ? tj.errorAt(parsed.location.line, parsed.location.column)
          : parsed.error;

  function updateInput(next: string) {
    setInput(next);
    setStatusMessage("");
    setTextVisible(TEXT_PAGE);
  }

  function saveToHistory(nextInput: string) {
    const cleaned = nextInput.trim();
    if (!cleaned || cleaned.length > HISTORY_MAX_ENTRY) return;
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      preview: cleaned.replace(/\s+/g, " ").slice(0, 80),
      input: cleaned,
    };
    setHistory((current) => [entry, ...current.filter((item) => item.input !== cleaned)].slice(0, HISTORY_LIMIT));
  }

  // Actions read the live input (not the deferred copy) so they never act on stale text.
  function handlePretty() {
    const result = parseJson(input);
    if (!result.valid) {
      setStatusMessage(result.error || tj.cannotFormat);
      return;
    }
    const next = JSON.stringify(result.value, null, 2);
    setInput(next);
    setStatusMessage(tj.formatted);
    saveToHistory(next);
    setActiveTab("formatted");
  }

  function handleMinify() {
    const result = parseJson(input);
    if (!result.valid) {
      setStatusMessage(result.error || tj.cannotMinify);
      return;
    }
    const next = JSON.stringify(result.value);
    setInput(next);
    setStatusMessage(tj.minified(n(next.length)));
    saveToHistory(next);
    setActiveTab("formatted");
  }

  function handleValidate() {
    const result = parseJson(input);
    if (result.valid) {
      setStatusMessage(tj.valid);
      saveToHistory(input);
    } else {
      setStatusMessage(
        result.location
          ? tj.invalidAt(result.location.line, result.location.column)
          : result.error || tj.noData,
      );
    }
  }

  async function copyText(text: string, message: string) {
    if (!text) {
      setStatusMessage(t.common.nothingToCopy);
      return;
    }
    setStatusMessage((await copyToClipboard(text)) ? message : t.common.clipboardDenied);
  }

  function handleSample() {
    updateInput(SAMPLE_JSON);
    setStatusMessage(t.common.sampleLoaded);
    setActiveTab("tree");
    saveToHistory(SAMPLE_JSON);
  }

  function handleClear() {
    setInput("");
    setCompareInput("");
    setSelectedPath("$");
    setStatusMessage(t.common.cleared);
  }

  function selectTab(tab: ViewTab) {
    if (tab === "diff" && !compareInput.trim() && input.trim()) setCompareInput(input);
    setActiveTab(tab);
  }

  const showCopyOutput = activeTab !== "text" && activeTab !== "diff" && activeTab !== "markdown";
  const diffRows = diff ? diff.rows.slice(0, DIFF_RENDER_LIMIT) : [];

  return (
    <main className="parser-shell">
      <div className={`history-overlay ${showHistory ? "open" : ""}`} onClick={() => setShowHistory(false)} />
      <aside
        aria-hidden={!showHistory}
        aria-label={tj.history}
        className={`history-drawer ${showHistory ? "open" : ""}`}
        inert={!showHistory}
      >
        <div className="history-drawer-header">
          <div>
            <strong>{tj.history}</strong>
            <p>{tj.historyHint}</p>
          </div>
          <button className="history-close-btn" onClick={() => setShowHistory(false)} type="button">
            {t.common.close}
          </button>
        </div>
        <div className="history-box">
          {history.length === 0 ? <p>{tj.historyEmpty}</p> : null}
          {history.map((item) => (
            <button
              className="history-item"
              key={item.id}
              onClick={() => {
                updateInput(item.input);
                setStatusMessage(tj.historyLoaded(formatTimestamp(item.createdAt, intl)));
                setShowHistory(false);
              }}
              type="button"
            >
              <strong>{formatTimestamp(item.createdAt, intl)}</strong>
              <span>{item.preview}</span>
            </button>
          ))}
        </div>
      </aside>

      <SiteHeader tool="jsonParser" workspace />

      <GoogleAd />

      <section
        className={`workspace ${workspaceResizing ? "is-resizing" : ""}`}
        ref={setWorkspace}
        style={workspaceGrid}
      >
        <div className="panel input-panel">
          <div className="panel-header">
            <span>{tj.input} · {t.common.chars(n(input.length))}</span>
            <div className="panel-tools panel-actions">
              <button className="mini-btn mini-btn-primary" onClick={handlePretty} type="button">
                {t.common.format}
              </button>
              <button className="mini-btn" onClick={handleMinify} type="button">
                {tj.minify}
              </button>
              <button className="mini-btn" onClick={handleValidate} type="button">
                {tj.validate}
              </button>
              <button className="mini-btn" onClick={() => copyText(input, tj.inputCopied)} type="button">
                {t.common.copy}
              </button>
              <button className="mini-btn" onClick={handleSample} type="button">
                {t.common.sample}
              </button>
              <button
                aria-expanded={showHistory}
                className="mini-btn"
                onClick={() => setShowHistory((current) => !current)}
                type="button"
              >
                {tj.history}
              </button>
              <button className="mini-btn mini-btn-danger" onClick={handleClear} type="button">
                {t.common.clear}
              </button>
            </div>
          </div>
          <CodeEditor
            ariaLabel={tj.input}
            errorLine={parsed.valid ? null : parsed.location?.line}
            onChange={updateInput}
            placeholder={tj.inputPlaceholder}
            value={input}
          />
        </div>

        <div
          aria-label={t.common.resizePanels}
          className="resize-handle resize-handle-workspace"
          {...workspaceHandle}
        >
          <span />
        </div>

        <div className="panel output-panel">
          <div className="tabs" role="tablist" aria-label={tj.viewType}>
            {TABS.map((tab) => (
              <button
                aria-selected={activeTab === tab}
                className={`tab ${activeTab === tab ? "active" : ""}`}
                key={tab}
                onClick={() => selectTab(tab)}
                role="tab"
                type="button"
              >
                {tj.tabs[tab]}
              </button>
            ))}
            {showCopyOutput ? (
              <button className="mini-btn copy-output" onClick={() => copyText(output, tj.outputCopied)} type="button">
                {t.common.copy}
              </button>
            ) : null}
          </div>

          <div className="output-body" role="tabpanel">
            {!deferredInput.trim() && activeTab !== "diff" ? (
              <div className="empty-state">{tj.emptyOutput}</div>
            ) : !parsed.valid && activeTab !== "diff" ? (
              <JsonError location={parsed.location} message={parsed.error} source={parsed.normalized} />
            ) : activeTab === "tree" && value !== null ? (
              <div className="tree-view">
                <TreeNode label="$" onSelectPath={setSelectedPath} path="$" selectedPath={selectedPath} value={value} />
              </div>
            ) : activeTab === "text" ? (
              <div className="text-view">
                {textEntries.slice(0, textVisible).map((entry) => (
                  <article className={`text-card ${selectedPath === entry.path ? "is-selected" : ""}`} key={entry.path}>
                    <header className="text-card-header">
                      <button className="text-card-path" onClick={() => setSelectedPath(entry.path)} type="button">
                        {entry.path}
                      </button>
                      <button
                        className="text-copy-btn"
                        onClick={() => {
                          void copyText(entry.value, tj.pathCopied(entry.path));
                          setSelectedPath(entry.path);
                        }}
                        type="button"
                      >
                        {t.common.copy}
                      </button>
                    </header>
                    <div className="text-card-value">{entry.value}</div>
                  </article>
                ))}
                {textEntries.length > textVisible ? (
                  <button className="tree-more" onClick={() => setTextVisible((current) => current + TEXT_PAGE)} type="button">
                    {tj.showMoreList(n(textEntries.length - textVisible))}
                  </button>
                ) : null}
              </div>
            ) : activeTab === "diff" ? (
              <div className="diff-view">
                <div className="diff-editor-shell">
                  <div className="diff-editor-header">{tj.compareJson}</div>
                  <textarea
                    aria-label={tj.compareJson}
                    className="diff-editor"
                    onChange={(event) => {
                      setCompareInput(event.target.value);
                      setStatusMessage("");
                    }}
                    placeholder={tj.comparePlaceholder}
                    spellCheck={false}
                    value={compareInput}
                  />
                </div>

                <div className="diff-toolbar">
                  <div className="diff-actions">
                    <button
                      className="diff-btn"
                      onClick={() => {
                        setInput(compareInput);
                        setCompareInput(input);
                        setStatusMessage(tj.swapped);
                      }}
                      type="button"
                    >
                      {tj.swap}
                    </button>
                    <button
                      className="diff-btn diff-btn-muted"
                      onClick={() => {
                        setCompareInput("");
                        setStatusMessage(tj.compareCleared);
                      }}
                      type="button"
                    >
                      {t.common.clear}
                    </button>
                    <button
                      className="diff-btn diff-btn-copy"
                      onClick={() => copyText(compareInput, tj.compareCopied)}
                      type="button"
                    >
                      {t.common.copy}
                    </button>
                  </div>
                  {diff ? (
                    <div className="diff-stats">
                      <span className="diff-stat diff-stat-added">{diff.stats.added} {tj.diffStats.added}</span>
                      <span className="diff-stat diff-stat-removed">{diff.stats.removed} {tj.diffStats.removed}</span>
                      <span className="diff-stat diff-stat-modified">{diff.stats.modified} {tj.diffStats.modified}</span>
                      <span className="diff-stat">{diff.stats.same} {tj.diffStats.same}</span>
                    </div>
                  ) : null}
                </div>

                {diff?.approximate ? (
                  <p className="diff-tip">{tj.diffApproximate}</p>
                ) : null}
                {diff && diff.rows.length > DIFF_RENDER_LIMIT ? (
                  <p className="diff-tip">
                    {tj.diffTruncated(n(DIFF_RENDER_LIMIT), n(diff.rows.length))}
                  </p>
                ) : null}

                <div
                  className={`diff-compare ${diffResizing ? "is-resizing" : ""}`}
                  ref={setDiffCompare}
                  style={diffGrid}
                >
                  <div className="diff-column">
                    <div className="diff-column-header">{tj.inputColumn}</div>
                    <div className="diff-lines">
                      {diffRows.map((row, index) => (
                        <div className={`diff-line ${row.kind !== "same" ? `is-${row.kind}` : ""}`} key={index}>
                          <span className="diff-line-number">{row.leftNumber ?? ""}</span>
                          <span className="diff-line-code">{row.left || " "}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    aria-label={tj.resizeDiff}
                    className="resize-handle resize-handle-diff"
                    {...diffHandle}
                  >
                    <span />
                  </div>

                  <div className="diff-column">
                    <div className="diff-column-header">{tj.compareColumn}</div>
                    <div className="diff-lines">
                      {diffRows.map((row, index) => (
                        <div className={`diff-line ${row.kind !== "same" ? `is-${row.kind}` : ""}`} key={index}>
                          <span className="diff-line-number">{row.rightNumber ?? ""}</span>
                          <span className="diff-line-code">{row.right || " "}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === "markdown" ? (
              <div className="markdown-view">
                <div className="markdown-toolbar">
                  <div aria-label={tj.markdownMode} className="markdown-modes" role="group">
                    {MARKDOWN_MODES.map((mode, index) => (
                      <span className="markdown-mode-item" key={mode.id}>
                        {index === 2 ? <span className="markdown-mode-divider" /> : null}
                        <button
                          aria-pressed={markdownMode === mode.id}
                          className={`markdown-mode-btn ${markdownMode === mode.id ? "active" : ""}`}
                          onClick={() => setMarkdownMode(mode.id)}
                          type="button"
                        >
                          {tj.markdownModes[mode.key]}
                        </button>
                      </span>
                    ))}
                  </div>
                  <button className="markdown-copy-btn" onClick={() => copyText(output, tj.markdownCopied)} type="button">
                    {t.common.copy}
                  </button>
                </div>
                {markdownMode.endsWith("source") ? (
                  <pre className="code-view markdown-source-view">{output}</pre>
                ) : (
                  <div className="markdown-render">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                  </div>
                )}
              </div>
            ) : (
              <pre className="code-view">{output}</pre>
            )}
          </div>
          <div className="pathbar" title={selectedPath}>{tj.path}: {selectedPath}</div>
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

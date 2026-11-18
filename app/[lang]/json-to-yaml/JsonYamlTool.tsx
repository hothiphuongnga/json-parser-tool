"use client";

import { useDeferredValue, useMemo, useState } from "react";
import CodeEditor from "@/app/components/CodeEditor";
import GoogleAd from "@/app/components/GoogleAd";
import { useI18n } from "@/app/components/I18nProvider";
import JsonError from "@/app/components/JsonError";
import SiteHeader from "@/app/components/SiteHeader";
import { useMediaQuery, useSplitResize } from "@/lib/hooks";
import { localePath } from "@/lib/i18n";
import type { ErrorLocation } from "@/lib/json";
import { parseJson } from "@/lib/json";
import { copyToClipboard } from "@/lib/storage";
import { parseYaml, toYaml, type YamlIndent } from "@/lib/yaml";
import "./json-to-yaml.css";

export type Direction = "toYaml" | "toJson";

/** Each direction has its own public URL (and metadata), but it is one tool. */
const DIRECTION_PATH: Record<Direction, string> = { toYaml: "/json-to-yaml", toJson: "/yaml-to-json" };

const SAMPLE_JSON = `{
  "service": "api",
  "image": "goingtool/api:1.4.0",
  "replicas": 3,
  "debug": false,
  "ports": [80, 443],
  "env": {
    "NODE_ENV": "production",
    "FEATURE_FLAG": "on",
    "ZIP_CODE": "01234"
  }
}`;

const SAMPLE_YAML = `service: api
image: goingtool/api:1.4.0
replicas: 3
debug: false
ports:
  - 80
  - 443
defaults: &defaults
  timeout: 30
  retries: 2
env:
  NODE_ENV: production
  <<: *defaults
`;

type Conversion =
  | { ok: true; output: string; documents: number }
  | { ok: false; empty: boolean; error: string; location: ErrorLocation | null; source: string };

function convert(input: string, direction: Direction, indent: YamlIndent): Conversion {
  if (direction === "toYaml") {
    const parsed = parseJson(input);
    if (!parsed.valid) {
      return { ok: false, empty: !parsed.error, error: parsed.error, location: parsed.location, source: parsed.normalized };
    }
    return { ok: true, output: toYaml(parsed.value, indent), documents: 1 };
  }

  const parsed = parseYaml(input);
  if (!parsed.valid) {
    return { ok: false, empty: !parsed.error, error: parsed.error, location: parsed.location, source: input };
  }
  return { ok: true, output: JSON.stringify(parsed.value, null, indent), documents: parsed.documents };
}

export default function JsonYamlTool({ initialDirection }: { initialDirection: Direction }) {
  const { t, n, locale } = useI18n();
  const ty = t.jsonYaml;
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [input, setInput] = useState(initialDirection === "toYaml" ? SAMPLE_JSON : SAMPLE_YAML);
  const [indent, setIndent] = useState<YamlIndent>(2);
  const [statusMessage, setStatusMessage] = useState("");
  const isWide = useMediaQuery("(min-width: 1101px)");
  const { setContainer, isResizing, handleProps, gridStyle } = useSplitResize<HTMLElement>({ enabled: isWide });

  // Conversion follows a deferred copy so typing stays responsive on large documents.
  const deferredInput = useDeferredValue(input);
  const result = useMemo(() => convert(deferredInput, direction, indent), [deferredInput, direction, indent]);

  const source = direction === "toYaml" ? "JSON" : "YAML";
  const target = direction === "toYaml" ? "YAML" : "JSON";

  const status = statusMessage
    ? statusMessage
    : !input.trim()
      ? t.common.ready
      : result.ok
        ? result.documents > 1
          ? `${ty.converted(target)} · ${ty.documents(result.documents)}`
          : ty.converted(target)
        : result.location
          ? ty.errorAt(result.location.line, result.location.column)
          : result.error;

  function updateInput(next: string) {
    setInput(next);
    setStatusMessage("");
  }

  /** Flips the direction; a valid result becomes the new input so the content carries over. */
  function changeDirection(next: Direction) {
    if (next === direction) return;
    const current = convert(input, direction, indent);
    if (current.ok) {
      setInput(current.output);
      setStatusMessage(ty.usedOutput);
    } else {
      setStatusMessage("");
    }
    setDirection(next);
    // Keep the address in step with the direction (shareable, matches the page's metadata).
    window.history.replaceState(null, "", localePath(locale, DIRECTION_PATH[next]) + window.location.hash);
  }

  function formatInput() {
    const parsed = parseJson(input);
    if (!parsed.valid) {
      setStatusMessage(parsed.error || t.jsonParser.cannotFormat);
      return;
    }
    setInput(JSON.stringify(parsed.value, null, indent));
    setStatusMessage(t.jsonParser.formatted);
  }

  async function copyOutput() {
    if (!result.ok) {
      setStatusMessage(t.common.nothingToCopy);
      return;
    }
    setStatusMessage((await copyToClipboard(result.output)) ? ty.outputCopied : t.common.clipboardDenied);
  }

  function downloadOutput() {
    if (!result.ok) {
      setStatusMessage(t.common.nothingToCopy);
      return;
    }
    const fileName = direction === "toYaml" ? "output.yaml" : "output.json";
    const type = direction === "toYaml" ? "application/yaml" : "application/json";
    const url = URL.createObjectURL(new Blob([result.output], { type: `${type};charset=utf-8` }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage(ty.downloaded(fileName));
  }

  return (
    <main className="parser-shell">
      <SiteHeader tool="jsonYaml" workspace />

      <GoogleAd />

      <section className={`workspace ${isResizing ? "is-resizing" : ""}`} ref={setContainer} style={gridStyle}>
        <div className="panel input-panel">
          <div className="panel-header">
            <span>
              {direction === "toYaml" ? ty.inputJson : ty.inputYaml} · {t.common.chars(n(input.length))}
            </span>
            <div className="panel-tools panel-actions">
              {direction === "toYaml" ? (
                <button className="mini-btn" onClick={formatInput} type="button">
                  {t.common.format}
                </button>
              ) : null}
              <button
                className="mini-btn"
                onClick={() => {
                  updateInput(direction === "toYaml" ? SAMPLE_JSON : SAMPLE_YAML);
                  setStatusMessage(t.common.sampleLoaded);
                }}
                type="button"
              >
                {t.common.sample}
              </button>
              <button
                className="mini-btn mini-btn-danger"
                onClick={() => {
                  updateInput("");
                  setStatusMessage(t.common.cleared);
                }}
                type="button"
              >
                {t.common.clear}
              </button>
            </div>
          </div>
          <CodeEditor
            ariaLabel={direction === "toYaml" ? ty.inputJson : ty.inputYaml}
            errorLine={result.ok ? null : result.location?.line}
            onChange={updateInput}
            placeholder={direction === "toYaml" ? ty.placeholderJson : ty.placeholderYaml}
            value={input}
          />
        </div>

        <div aria-label={t.common.resizePanels} className="resize-handle resize-handle-workspace" {...handleProps}>
          <span />
        </div>

        <div className="panel output-panel">
          <div className="yaml-controls">
            <div aria-label={ty.direction} className="yaml-direction" role="group">
              {(["toYaml", "toJson"] as const).map((option) => (
                <button
                  aria-pressed={direction === option}
                  className={`yaml-direction-btn ${direction === option ? "active" : ""}`}
                  key={option}
                  onClick={() => changeDirection(option)}
                  type="button"
                >
                  {ty[option]}
                </button>
              ))}
            </div>

            <label className="yaml-field">
              <span>{ty.indent}</span>
              <select onChange={(event) => setIndent(Number(event.target.value) as YamlIndent)} value={indent}>
                <option value={2}>{ty.spaces(2)}</option>
                <option value={4}>{ty.spaces(4)}</option>
              </select>
            </label>

            <div className="panel-actions yaml-actions">
              <button className="mini-btn" onClick={downloadOutput} type="button">
                {ty.download}
              </button>
              <button className="mini-btn mini-btn-primary" onClick={copyOutput} type="button">
                {t.common.copy}
              </button>
            </div>
          </div>

          <div className="output-body">
            {result.ok ? (
              <pre className="code-view">{result.output}</pre>
            ) : result.empty ? (
              <div className="empty-state">{ty.emptyOutput}</div>
            ) : (
              <JsonError
                location={result.location}
                message={result.error}
                source={result.source}
                title={source === "YAML" ? ty.invalidYaml : undefined}
              />
            )}
          </div>

          {direction === "toYaml" ? <p className="yaml-note">{ty.yaml11Note}</p> : null}
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

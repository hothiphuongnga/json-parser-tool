"use client";

import { useEffect, useMemo, useState } from "react";
import GoogleAd from "@/app/components/GoogleAd";
import { useI18n } from "@/app/components/I18nProvider";
import SiteHeader from "@/app/components/SiteHeader";
import { useMediaQuery, useSplitResize } from "@/lib/hooks";
import type { Dictionary, Locale } from "@/lib/i18n";
import { copyToClipboard, readStorage, writeStorage } from "@/lib/storage";
import "./html-online.css";

const STORAGE_KEY = "html-online-source";
const SAVE_DELAY = 500;

/** Starter document, written in the visitor's language. */
function sampleHtml(locale: Locale, t: Dictionary["htmlOnline"]["sample"]) {
  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HTML Online</title>
    <style>
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        color: #17324d;
        font-family: system-ui, sans-serif;
        background: linear-gradient(135deg, #e0f2fe, #f5f3ff);
      }
      .card {
        width: min(520px, 90vw);
        padding: 32px;
        border: 1px solid rgba(255, 255, 255, .8);
        border-radius: 24px;
        background: rgba(255, 255, 255, .72);
        box-shadow: 0 24px 60px rgba(8, 126, 193, .18);
        text-align: center;
      }
      h1 { margin-top: 0; color: #087ec1; }
      button {
        padding: 10px 18px;
        border: 0;
        border-radius: 999px;
        background: #087ec1;
        color: white;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>HTML Online Viewer</h1>
      <p>${t.lead}</p>
      <button onclick="this.textContent = '${t.clicked}'">${t.button}</button>
    </main>
  </body>
</html>`;
}

function formatHtml(source: string) {
  // <script>, <style>, <pre> and <textarea> are kept as single raw tokens so their contents
  // (whitespace, `a < b` comparisons) are never reflowed.
  const tokens =
    source.match(/<(script|style|pre|textarea)\b[\s\S]*?<\/\1\s*>|<!--[\s\S]*?-->|<![^>]+>|<[^>]+>|[^<]+/gi) ?? [];
  const voidElements = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
  ]);
  let depth = 0;
  const lines: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) continue;
    if (/^<(script|style|pre|textarea)\b[\s\S]*<\/\1\s*>$/i.test(token)) {
      lines.push(`${"  ".repeat(depth)}${token}`);
      continue;
    }
    const closing = /^<\//.test(token);
    const tagName = token.match(/^<\/?([\w-]+)/)?.[1]?.toLowerCase();
    const declaration = /^<!/.test(token);
    const selfClosing = /\/>$/.test(token) || (tagName ? voidElements.has(tagName) : false);

    if (closing) depth = Math.max(0, depth - 1);
    lines.push(`${"  ".repeat(depth)}${token}`);
    if (!closing && !declaration && !selfClosing && /^</.test(token)) depth += 1;
  }

  return lines.join("\n");
}

export default function HtmlOnlineTool() {
  const { t, n, locale } = useI18n();
  const th = t.htmlOnline;
  // Start from the sample on both server and client; the saved draft is loaded after hydration.
  const [source, setSource] = useState(() => sampleHtml(locale, th.sample));
  const [preview, setPreview] = useState(source);
  const [autoRun, setAutoRun] = useState(true);
  const [status, setStatus] = useState(t.common.ready);
  const [loaded, setLoaded] = useState(false);
  const isWide = useMediaQuery("(min-width: 1101px)");
  const {
    setContainer: setWorkspace,
    isResizing,
    handleProps,
    gridStyle,
  } = useSplitResize<HTMLElement>({ enabled: isWide, min: 20, max: 80 });

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = readStorage(STORAGE_KEY);
      if (saved !== null) {
        setSource(saved);
        setPreview(saved);
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      if (!writeStorage(STORAGE_KEY, source)) setStatus(th.saveFailed);
    }, SAVE_DELAY);
    return () => window.clearTimeout(timer);
  }, [loaded, source, th.saveFailed]);

  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(() => {
      setPreview(source);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [autoRun, source]);

  const lineCount = useMemo(() => source.split("\n").length, [source]);

  async function copySource() {
    setStatus((await copyToClipboard(source)) ? th.copied : t.common.clipboardDenied);
  }

  function downloadSource() {
    const url = URL.createObjectURL(new Blob([source], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "preview.html";
    link.click();
    URL.revokeObjectURL(url);
    setStatus(th.downloaded);
  }

  function openPreview() {
    const url = URL.createObjectURL(new Blob([preview], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setStatus(th.opened);
  }

  return (
    <main className="html-shell">
      <SiteHeader tool="htmlOnline" workspace />

      <GoogleAd />

      <section
        className={`html-workspace ${isResizing ? "is-resizing" : ""}`}
        ref={setWorkspace}
        style={gridStyle}
      >
        <section className="html-panel">
          <div className="html-panel-header">
            <span>{th.source} · {t.common.lines(n(lineCount))} · {t.common.chars(n(source.length))}</span>
            <div className="panel-actions">
              <button className="mini-btn mini-btn-primary" onClick={() => { setPreview(source); setStatus(th.ran); }} type="button">{th.run}</button>
              <button className="mini-btn" onClick={() => { setSource(formatHtml(source)); setStatus(th.formatted); }} type="button">{t.common.format}</button>
              <button className="mini-btn" onClick={copySource} type="button">{t.common.copy}</button>
              <button className="mini-btn" onClick={downloadSource} type="button">{th.download}</button>
              <button className="mini-btn" onClick={openPreview} type="button">{th.openTab}</button>
              <button className="mini-btn mini-btn-danger" onClick={() => { setSource(""); setPreview(""); setStatus(th.cleared); }} type="button">{t.common.clear}</button>
            </div>
          </div>
          <textarea
            aria-label={th.source}
            className="html-editor"
            onChange={(event) => setSource(event.target.value)}
            placeholder={th.sourcePlaceholder}
            spellCheck={false}
            value={source}
          />
        </section>

        <div
          aria-label={th.resize}
          className="resize-handle html-resize-handle"
          {...handleProps}
        >
          <span />
        </div>

        <section className="html-panel html-preview-panel">
          <div className="html-panel-header">
            <span>{th.preview}</span>
            <label className="html-auto-run">
              <input checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} type="checkbox" />
              {th.autoRun}
            </label>
          </div>
          <iframe
            className="html-preview"
            sandbox="allow-forms allow-modals allow-popups allow-scripts"
            srcDoc={preview}
            title={th.preview}
          />
        </section>
      </section>

      <footer className="statusbar html-statusbar">
        <span aria-live="polite" role="status">{status}</span>
        <span>{th.sandboxNote} · {t.site.copyright}</span>
      </footer>
    </main>
  );
}

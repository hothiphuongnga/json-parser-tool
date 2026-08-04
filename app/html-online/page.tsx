"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "./html-online.css";

type ThemeTone = "blue" | "green" | "violet" | "dark";

const STORAGE_KEY = "html-online-source";
const THEME_KEY = "json-parser-theme";

const SAMPLE_HTML = `<!doctype html>
<html lang="vi">
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
      <p>Chỉnh sửa mã nguồn bên trái để xem kết quả ngay lập tức.</p>
      <button onclick="this.textContent = 'Đã chạy JavaScript!'">Thử JavaScript</button>
    </main>
  </body>
</html>`;

const THEMES: Array<{ id: ThemeTone; label: string }> = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "violet", label: "Violet" },
  { id: "dark", label: "Dark" },
];

function readTheme(): ThemeTone {
  if (typeof window === "undefined") return "blue";
  const saved = window.localStorage.getItem(THEME_KEY);
  return THEMES.some((theme) => theme.id === saved) ? (saved as ThemeTone) : "blue";
}

function readSource() {
  if (typeof window === "undefined") return SAMPLE_HTML;
  return window.localStorage.getItem(STORAGE_KEY) ?? SAMPLE_HTML;
}

function formatHtml(source: string) {
  const compact = source.replace(/>\s*</g, "><").trim();
  const tokens = compact.match(/<!--[\s\S]*?-->|<![^>]+>|<[^>]+>|[^<]+/g) ?? [];
  const voidElements = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
    "param", "source", "track", "wbr",
  ]);
  let depth = 0;
  const lines: string[] = [];

  for (const rawToken of tokens) {
    const token = rawToken.trim();
    if (!token) continue;
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

export default function HtmlOnlinePage() {
  const [source, setSource] = useState(readSource);
  const [preview, setPreview] = useState(readSource);
  const [theme, setTheme] = useState<ThemeTone>(readTheme);
  const [autoRun, setAutoRun] = useState(true);
  const [status, setStatus] = useState("Sẵn sàng");

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, source);
    if (!autoRun) return;
    const timer = window.setTimeout(() => {
      setPreview(source);
      setStatus("Preview đã cập nhật");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [autoRun, source]);

  const lineCount = useMemo(() => source.split("\n").length, [source]);

  async function copySource() {
    await navigator.clipboard.writeText(source);
    setStatus("Đã copy HTML");
  }

  function downloadSource() {
    const url = URL.createObjectURL(new Blob([source], { type: "text/html;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "preview.html";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Đã tải preview.html");
  }

  function openPreview() {
    const url = URL.createObjectURL(new Blob([preview], { type: "text/html;charset=utf-8" }));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    setStatus("Đã mở preview trong tab mới");
  }

  return (
    <main className="html-shell" data-theme={theme}>
      <header className="topbar html-topbar">
        <div className="brand">HTML Online Viewer</div>
        <div className="toolbar">
          <label className="theme-picker">
            <span className="sr-only">Theme</span>
            <select aria-label="Change theme" onChange={(event) => setTheme(event.target.value as ThemeTone)} value={theme}>
              {THEMES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </label>
          <Link className="btn btn-muted tool-link" href="/">JSON Parser</Link>
          <button className="btn btn-primary" onClick={() => { setPreview(source); setStatus("Đã chạy HTML"); }} type="button">Run</button>
          <button className="btn btn-muted" onClick={() => { setSource(formatHtml(source)); setStatus("Đã format HTML"); }} type="button">Format</button>
          <button className="btn btn-muted" onClick={copySource} type="button">Copy</button>
          <button className="btn btn-muted" onClick={downloadSource} type="button">Download</button>
          <button className="btn btn-muted" onClick={openPreview} type="button">Open tab</button>
          <button className="btn btn-danger" onClick={() => { setSource(""); setPreview(""); setStatus("Đã xóa nội dung"); }} type="button">Clear</button>
        </div>
      </header>

      <section className="html-workspace">
        <section className="html-panel">
          <div className="html-panel-header">
            <span>HTML source</span>
            <span>{lineCount} lines · {source.length} chars</span>
          </div>
          <textarea
            aria-label="HTML source"
            className="html-editor"
            onChange={(event) => { setSource(event.target.value); setStatus("Đang chỉnh sửa..."); }}
            placeholder="Dán mã HTML vào đây..."
            spellCheck={false}
            value={source}
          />
        </section>

        <section className="html-panel html-preview-panel">
          <div className="html-panel-header">
            <span>Preview</span>
            <label className="html-auto-run">
              <input checked={autoRun} onChange={(event) => setAutoRun(event.target.checked)} type="checkbox" />
              Auto run
            </label>
          </div>
          <iframe
            className="html-preview"
            sandbox="allow-forms allow-modals allow-popups allow-scripts"
            srcDoc={preview}
            title="HTML preview"
          />
        </section>
      </section>

      <footer className="statusbar html-statusbar">
        <span>{status}</span>
        <span>Preview chạy trong iframe sandbox · Tools.hothiphuongnga Co.,Ltd. © 2026</span>
      </footer>
    </main>
  );
}

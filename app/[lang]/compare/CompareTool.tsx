"use client";

import { useDeferredValue, useMemo, useState } from "react";
import GoogleAd from "@/app/components/GoogleAd";
import { useI18n } from "@/app/components/I18nProvider";
import SiteHeader from "@/app/components/SiteHeader";
import { diffText } from "@/lib/diff";
import { copyToClipboard } from "@/lib/storage";
import "./compare.css";

const RENDER_LIMIT = 5000;

export default function CompareTool() {
  const { t, n } = useI18n();
  const tc = t.compare;
  const [leftContent, setLeftContent] = useState(tc.sampleLeft);
  const [rightContent, setRightContent] = useState(tc.sampleRight);
  const [copied, setCopied] = useState<{ side: "left" | "right"; ok: boolean } | null>(null);
  const deferredLeft = useDeferredValue(leftContent);
  const deferredRight = useDeferredValue(rightContent);
  const { rows, stats, approximate } = useMemo(() => diffText(deferredLeft, deferredRight), [deferredLeft, deferredRight]);

  async function copyContent(side: "left" | "right") {
    const ok = await copyToClipboard(side === "left" ? leftContent : rightContent);
    setCopied({ side, ok });
    window.setTimeout(() => setCopied(null), 1200);
  }

  const copyLabel = (side: "left" | "right") =>
    copied?.side === side ? (copied.ok ? tc.copied : tc.copyFailed) : tc.copy;

  return (
    <main className="page-shell compare-shell">
      <SiteHeader tool="compare" workspace />

      <GoogleAd />

      <div className="page-content">

      <section className="page-heading compare-heading">
        <div>
          <span className="page-kicker">{tc.kicker}</span>
          <h1>{tc.title}</h1>
          <p>{tc.intro}</p>
        </div>
        <div className="compare-stats" aria-label={tc.statsLabel}>
          <span className="stat-same">{tc.stats.same(stats.same)}</span>
          <span className="stat-added">{tc.stats.added(stats.added)}</span>
          <span className="stat-removed">{tc.stats.removed(stats.removed)}</span>
          <span className="stat-modified">{tc.stats.modified(stats.modified)}</span>
        </div>
      </section>

      <section className="compare-editors">
        <article className="compare-editor-card card">
          <header>
            <div>
              <span>{tc.original}</span>
              <small>{t.common.chars(n(leftContent.length))}</small>
            </div>
            <button className="soft-btn" type="button" onClick={() => copyContent("left")}>
              {copyLabel("left")}
            </button>
          </header>
          <textarea
            aria-label={tc.originalLabel}
            onChange={(event) => setLeftContent(event.target.value)}
            placeholder={tc.originalPlaceholder}
            spellCheck={false}
            value={leftContent}
          />
        </article>

        <div className="compare-center-actions">
          <button
            className="soft-btn"
            type="button"
            aria-label={tc.swap}
            title={tc.swap}
            onClick={() => {
              setLeftContent(rightContent);
              setRightContent(leftContent);
            }}
          >
            ⇄
          </button>
          <button
            className="soft-btn"
            type="button"
            aria-label={tc.clear}
            title={tc.clear}
            onClick={() => {
              setLeftContent("");
              setRightContent("");
            }}
          >
            ×
          </button>
        </div>

        <article className="compare-editor-card card">
          <header>
            <div>
              <span>{tc.changed}</span>
              <small>{t.common.chars(n(rightContent.length))}</small>
            </div>
            <button className="soft-btn" type="button" onClick={() => copyContent("right")}>
              {copyLabel("right")}
            </button>
          </header>
          <textarea
            aria-label={tc.changedLabel}
            onChange={(event) => setRightContent(event.target.value)}
            placeholder={tc.changedPlaceholder}
            spellCheck={false}
            value={rightContent}
          />
        </article>
      </section>

      <section className="compare-result card">
        <header className="compare-result-header">
          <div>
            <span>{tc.result}</span>
            <small>{tc.linesAnalysed(n(rows.length))}</small>
          </div>
          <div className="compare-legend">
            <span><i className="legend-removed" />{tc.legend.removed}</span>
            <span><i className="legend-modified" />{tc.legend.modified}</span>
            <span><i className="legend-added" />{tc.legend.added}</span>
          </div>
        </header>

        <div className="compare-result-columns" aria-hidden="true">
          <span>{tc.original}</span>
          <span>{tc.changed}</span>
        </div>

        {approximate ? (
          <p className="compare-notice">{tc.approximate}</p>
        ) : null}
        {rows.length > RENDER_LIMIT ? (
          <p className="compare-notice">
            {tc.truncated(n(RENDER_LIMIT), n(rows.length))}
          </p>
        ) : null}

        <div className="compare-rows">
          {rows.slice(0, RENDER_LIMIT).map((row, index) => (
            <div className={`compare-row row-${row.kind}`} key={`${index}-${row.kind}`}>
              <div className="compare-cell">
                <span className="compare-line-number">{row.leftNumber ?? "·"}</span>
                <code>{row.left || " "}</code>
              </div>
              <div className="compare-cell">
                <span className="compare-line-number">{row.rightNumber ?? "·"}</span>
                <code>{row.right || " "}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="page-footer">{t.site.copyright}</footer>
      </div>
    </main>
  );
}

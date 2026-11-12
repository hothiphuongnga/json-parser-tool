"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./compare.css";

type DiffKind = "same" | "added" | "removed" | "modified";

type DiffRow = {
  kind: DiffKind;
  left: string;
  right: string;
  leftNumber?: number;
  rightNumber?: number;
};

const SAMPLE_LEFT = `Chào mừng bạn đến với ToolHub.
Đây là công cụ so sánh nội dung.
Mỗi thay đổi sẽ được đánh dấu rõ ràng.
Bạn có thể dán văn bản bất kỳ.`;

const SAMPLE_RIGHT = `Chào mừng bạn đến với ToolHub.
Đây là công cụ compare nội dung trực quan.
Mỗi thay đổi sẽ được đánh dấu bằng màu sắc.
Bạn có thể dán văn bản, mã nguồn hoặc ghi chú.`;

function buildDiff(leftValue: string, rightValue: string): DiffRow[] {
  const left = leftValue.split("\n");
  const right = rightValue.split("\n");
  const table = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );

  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] =
        left[leftIndex] === right[rightIndex]
          ? table[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }

  const raw: DiffRow[] = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length || rightIndex < right.length) {
    if (
      leftIndex < left.length &&
      rightIndex < right.length &&
      left[leftIndex] === right[rightIndex]
    ) {
      raw.push({
        kind: "same",
        left: left[leftIndex],
        right: right[rightIndex],
        leftNumber: leftIndex + 1,
        rightNumber: rightIndex + 1,
      });
      leftIndex += 1;
      rightIndex += 1;
    } else if (
      rightIndex < right.length &&
      (leftIndex === left.length ||
        table[leftIndex][rightIndex + 1] >= table[leftIndex + 1][rightIndex])
    ) {
      raw.push({
        kind: "added",
        left: "",
        right: right[rightIndex],
        rightNumber: rightIndex + 1,
      });
      rightIndex += 1;
    } else {
      raw.push({
        kind: "removed",
        left: left[leftIndex],
        right: "",
        leftNumber: leftIndex + 1,
      });
      leftIndex += 1;
    }
  }

  const rows: DiffRow[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const current = raw[index];
    const next = raw[index + 1];

    if (current.kind === "removed" && next?.kind === "added") {
      rows.push({
        kind: "modified",
        left: current.left,
        right: next.right,
        leftNumber: current.leftNumber,
        rightNumber: next.rightNumber,
      });
      index += 1;
    } else if (current.kind === "added" && next?.kind === "removed") {
      rows.push({
        kind: "modified",
        left: next.left,
        right: current.right,
        leftNumber: next.leftNumber,
        rightNumber: current.rightNumber,
      });
      index += 1;
    } else {
      rows.push(current);
    }
  }

  return rows;
}

export default function ComparePage() {
  const [leftContent, setLeftContent] = useState(SAMPLE_LEFT);
  const [rightContent, setRightContent] = useState(SAMPLE_RIGHT);
  const [copied, setCopied] = useState<"left" | "right" | null>(null);
  const rows = useMemo(() => buildDiff(leftContent, rightContent), [leftContent, rightContent]);
  const stats = useMemo(
    () =>
      rows.reduce(
        (result, row) => {
          result[row.kind] += 1;
          return result;
        },
        { same: 0, added: 0, removed: 0, modified: 0 },
      ),
    [rows],
  );

  async function copyContent(side: "left" | "right") {
    await navigator.clipboard.writeText(side === "left" ? leftContent : rightContent);
    setCopied(side);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <main className="compare-shell">
      <header className="compare-topbar">
        <Link className="compare-brand" href="/">
          ToolHub
          <span>Content Compare</span>
        </Link>
        <nav className="compare-nav" aria-label="Công cụ">
          <Link href="/">JSON Parser</Link>
          <Link href="/json-to-type">JSON to Type</Link>
          <Link href="/dem-ngay">Đếm ngày</Link>
          <Link href="/lunar-calendar">Lịch âm</Link>
        </nav>
      </header>

      <section className="compare-heading">
        <div>
          <span className="compare-kicker">Smart text comparison</span>
          <h1>So sánh nội dung</h1>
          <p>Dán hai phiên bản để tìm nhanh những dòng đã thêm, xóa hoặc thay đổi.</p>
        </div>
        <div className="compare-stats" aria-label="Thống kê thay đổi">
          <span className="stat-same">{stats.same} giống nhau</span>
          <span className="stat-added">+{stats.added} thêm</span>
          <span className="stat-removed">−{stats.removed} xóa</span>
          <span className="stat-modified">~{stats.modified} sửa</span>
        </div>
      </section>

      <section className="compare-editors">
        <article className="compare-editor-card">
          <header>
            <div>
              <span>Phiên bản gốc</span>
              <small>{leftContent.length.toLocaleString("vi-VN")} ký tự</small>
            </div>
            <button type="button" onClick={() => copyContent("left")}>
              {copied === "left" ? "Đã chép" : "Sao chép"}
            </button>
          </header>
          <textarea
            aria-label="Nội dung phiên bản gốc"
            onChange={(event) => setLeftContent(event.target.value)}
            placeholder="Dán nội dung gốc..."
            spellCheck={false}
            value={leftContent}
          />
        </article>

        <div className="compare-center-actions">
          <button
            type="button"
            title="Đổi hai nội dung"
            onClick={() => {
              setLeftContent(rightContent);
              setRightContent(leftContent);
            }}
          >
            ⇄
          </button>
          <button
            type="button"
            title="Xóa nội dung"
            onClick={() => {
              setLeftContent("");
              setRightContent("");
            }}
          >
            ×
          </button>
        </div>

        <article className="compare-editor-card">
          <header>
            <div>
              <span>Phiên bản mới</span>
              <small>{rightContent.length.toLocaleString("vi-VN")} ký tự</small>
            </div>
            <button type="button" onClick={() => copyContent("right")}>
              {copied === "right" ? "Đã chép" : "Sao chép"}
            </button>
          </header>
          <textarea
            aria-label="Nội dung phiên bản mới"
            onChange={(event) => setRightContent(event.target.value)}
            placeholder="Dán nội dung mới..."
            spellCheck={false}
            value={rightContent}
          />
        </article>
      </section>

      <section className="compare-result">
        <header className="compare-result-header">
          <div>
            <span>Kết quả theo dòng</span>
            <small>{rows.length.toLocaleString("vi-VN")} dòng được phân tích</small>
          </div>
          <div className="compare-legend">
            <span><i className="legend-removed" />Đã xóa</span>
            <span><i className="legend-modified" />Đã sửa</span>
            <span><i className="legend-added" />Đã thêm</span>
          </div>
        </header>

        <div className="compare-result-columns" aria-hidden="true">
          <span>Phiên bản gốc</span>
          <span>Phiên bản mới</span>
        </div>

        <div className="compare-rows">
          {rows.map((row, index) => (
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
    </main>
  );
}

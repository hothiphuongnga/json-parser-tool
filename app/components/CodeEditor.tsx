"use client";

import { useMemo, useRef } from "react";

type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
  /** 1-based line to highlight in the gutter (e.g. a parse error). */
  errorLine?: number | null;
};

/** Textarea with a line-number gutter that scrolls in sync. Lines don't wrap, so numbers stay aligned. */
export default function CodeEditor({ value, onChange, placeholder, ariaLabel, errorLine }: CodeEditorProps) {
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const lineCount = useMemo(() => {
    let count = 1;
    for (let index = 0; index < value.length; index += 1) {
      if (value.charCodeAt(index) === 10) count += 1;
    }
    return count;
  }, [value]);

  // Rendered as plain text blocks (not one element per line) so huge inputs stay cheap.
  const gutter = useMemo(() => {
    const range = (from: number, to: number) =>
      Array.from({ length: Math.max(0, to - from + 1) }, (_, index) => from + index).join("\n");
    if (!errorLine || errorLine > lineCount) return { before: range(1, lineCount), error: "", after: "" };
    return { before: range(1, errorLine - 1), error: String(errorLine), after: range(errorLine + 1, lineCount) };
  }, [errorLine, lineCount]);

  return (
    <div className="editor-wrap">
      <div aria-hidden="true" className="line-gutter" ref={gutterRef}>
        {gutter.before}
        {gutter.error ? (
          <>
            {gutter.before ? "\n" : null}
            <span className="is-error">{gutter.error}</span>
            {gutter.after ? "\n" : null}
          </>
        ) : null}
        {gutter.after}
      </div>
      <textarea
        aria-label={ariaLabel}
        className="editor"
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop;
        }}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
        wrap="off"
      />
    </div>
  );
}

"use client";

import { useI18n } from "./I18nProvider";
import type { ErrorLocation } from "@/lib/json";

type JsonErrorProps = {
  message: string;
  location: ErrorLocation | null;
  source: string;
};

/** Parse error with line/column and a short excerpt pointing at the problem. */
export default function JsonError({ message, location, source }: JsonErrorProps) {
  const { t } = useI18n();
  const lines = source.split("\n");
  const excerpt = location
    ? lines
        .map((text, index) => ({ number: index + 1, text }))
        .slice(Math.max(0, location.line - 3), location.line + 1)
    : [];

  return (
    <div className="error-box" role="alert">
      <h2>{t.jsonError.title}</h2>
      {location ? (
        <p className="error-location">
          {t.jsonError.location(location.line, location.column)}
        </p>
      ) : null}
      <p>{message}</p>
      {excerpt.length > 0 && location ? (
        <pre className="error-excerpt">
          {excerpt.map((line) => (
            <span className={line.number === location.line ? "is-error" : undefined} key={line.number}>
              <span className="error-line-number">{line.number}</span>
              {line.text || " "}
              {line.number === location.line ? (
                <>
                  {"\n"}
                  <span className="error-line-number" />
                  {" ".repeat(Math.max(0, location.column - 1))}
                  <span className="error-caret">^</span>
                </>
              ) : null}
              {"\n"}
            </span>
          ))}
        </pre>
      ) : null}
    </div>
  );
}

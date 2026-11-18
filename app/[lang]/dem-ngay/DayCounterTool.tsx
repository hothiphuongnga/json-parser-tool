"use client";

import GoogleAd from "@/app/components/GoogleAd";
import { useI18n } from "@/app/components/I18nProvider";
import SiteHeader from "@/app/components/SiteHeader";
import { useIsClient } from "@/lib/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { enUS, ja, ko, vi, zhCN } from "react-day-picker/locale";
import "react-day-picker/style.css";
import "./dem-ngay.css";

const DAY_MS = 24 * 60 * 60 * 1000;
type OffsetUnit = "days" | "months" | "years";

const PICKER_LOCALES = { en: enUS, vi, zh: zhCN, ja, ko } as const;

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** Long date in the page language, e.g. "Wednesday, 11/18/2026" / "Thứ Tư, 18/11/2026". */
function formatDate(date: Date, intl: string) {
  let formatter = dateFormatters.get(intl);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(intl, { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    dateFormatters.set(intl, formatter);
  }
  return formatter.format(date);
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addOffset(date: Date, amount: number, unit: OffsetUnit) {
  const next = new Date(date);

  if (unit === "months") {
    next.setMonth(next.getMonth() + amount);
  } else if (unit === "years") {
    next.setFullYear(next.getFullYear() + amount);
  } else {
    next.setDate(next.getDate() + amount);
  }

  return next;
}

function getMonthDistance(from: Date, to: Date) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth();

  if (to.getDate() < from.getDate()) {
    months -= 1;
  }

  const anchor = new Date(from);
  anchor.setMonth(anchor.getMonth() + months);
  const remainingDays = Math.round((to.getTime() - anchor.getTime()) / DAY_MS);

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: remainingDays,
  };
}

type GlassDatePickerProps = {
  label: string;
  step: string;
  value: string;
  onChange: (value: string) => void;
};

function GlassDatePicker({ label, step, value, onChange }: GlassDatePickerProps) {
  const { t, intl, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseLocalDate(value);

  useEffect(() => {
    if (!open) return;

    const closePicker = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closePicker);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closePicker);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="date-picker-card" ref={pickerRef}>
      <span className="date-picker-label">
        <span className="date-picker-step">{step}</span>
        {label}
      </span>
      <button
        className="date-input-shell"
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="date-calendar-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M7 3v3m10-3v3M4.5 9.5h15M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          </svg>
        </span>
        <span className="date-input-value">
          {selectedDate.toLocaleDateString(intl, {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
        <svg className="date-input-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m8 10 4 4 4-4" />
        </svg>
      </button>
      <span className="date-picker-preview">{formatDate(selectedDate, intl)}</span>

      {open && (
        <div className="picker-popover date-picker-popover" role="dialog" aria-label={t.dayCounter.pick(label)}>
          <DayPicker
            animate
            captionLayout="dropdown"
            endMonth={new Date(2100, 11)}
            fixedWeeks
            locale={PICKER_LOCALES[locale]}
            mode="single"
            onSelect={(date) => {
              if (!date) return;
              onChange(toDateInputValue(date));
              setOpen(false);
            }}
            selected={selectedDate}
            showOutsideDays
            startMonth={new Date(1900, 0)}
          />
          <div className="picker-footer">
            <button className="soft-btn" type="button" onClick={() => setOpen(false)}>
              {t.common.close}
            </button>
            <button
              className="soft-btn"
              type="button"
              onClick={() => {
                onChange(toDateInputValue(new Date()));
                setOpen(false);
              }}
            >
              {t.common.today}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DayCounterContent() {
  const { t, n, intl } = useI18n();
  const td = t.dayCounter;
  const today = useMemo(() => startOfLocalDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const [fromDate, setFromDate] = useState(toDateInputValue(today));
  const [toDate, setToDate] = useState(toDateInputValue(tomorrow));
  const [includeEndDate, setIncludeEndDate] = useState(false);
  const [customAmount, setCustomAmount] = useState("14");
  const [customUnit, setCustomUnit] = useState<OffsetUnit>("days");

  const result = useMemo(() => {
    const from = parseLocalDate(fromDate);
    const to = parseLocalDate(toDate);
    const direction = to.getTime() >= from.getTime() ? 1 : -1;
    const first = direction === 1 ? from : to;
    const last = direction === 1 ? to : from;
    const rawDays = Math.round((last.getTime() - first.getTime()) / DAY_MS);
    const countedDays = rawDays + (includeEndDate ? 1 : 0);
    const weeks = Math.floor(countedDays / 7);
    const weekRemainder = countedDays % 7;
    const distance = getMonthDistance(first, last);
    const fromToday = Math.round((last.getTime() - today.getTime()) / DAY_MS);

    return {
      from,
      to,
      first,
      last,
      rawDays,
      countedDays,
      weeks,
      weekRemainder,
      direction,
      distance,
      fromToday,
      midpoint: addDays(first, Math.floor(rawDays / 2)),
    };
  }, [fromDate, includeEndDate, toDate, today]);

  const rangeLabel =
    result.direction === 1
      ? td.range(formatDate(result.from, intl), formatDate(result.to, intl))
      : td.range(formatDate(result.to, intl), formatDate(result.from, intl));

  const todayLabel =
    result.fromToday === 0
      ? td.endsToday
      : result.last < today
        ? td.endPassed(n(Math.abs(result.fromToday)))
        : td.endAhead(n(result.fromToday));

  return (
    <DayCounterShell>
      <section className="day-counter-grid">
          <DayCounterIntro />

          <form className="day-counter-card card" aria-label={td.formLabel}>
            <div className="date-fields">
              <GlassDatePicker
                label={td.start}
                step="01"
                value={fromDate}
                onChange={setFromDate}
              />

              <button
                className="date-swap-button"
                type="button"
                aria-label={td.swap}
                title={td.swapTitle}
                onClick={() => {
                  setFromDate(toDate);
                  setToDate(fromDate);
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m7 7 3-3m-3 3 3 3M7 7h10a3 3 0 0 1 3 3v1M17 17l-3-3m3 3-3 3m3-3H7a3 3 0 0 1-3-3v-1" />
                </svg>
              </button>

              <GlassDatePicker
                label={td.end}
                step="02"
                value={toDate}
                onChange={setToDate}
              />
            </div>

            <label className="glass-toggle">
              <input
                type="checkbox"
                checked={includeEndDate}
                onChange={(event) => setIncludeEndDate(event.target.checked)}
              />
              <span className="toggle-track" aria-hidden="true">
                <span />
              </span>
              <span>{td.includeEnd}</span>
            </label>

            <div className="quick-actions" aria-label={td.quickPicks}>
              <button className="soft-btn" type="button" onClick={() => setFromDate(toDateInputValue(today))}>
                {t.common.today}
              </button>
              <button className="soft-btn" type="button" onClick={() => setToDate(toDateInputValue(addDays(today, 7)))}>
                {td.plus7}
              </button>
              <button className="soft-btn" type="button" onClick={() => setToDate(toDateInputValue(addDays(today, 30)))}>
                {td.plus30}
              </button>
              <button className="soft-btn" type="button" onClick={() => setToDate(toDateInputValue(addDays(today, 365)))}>
                {td.plus1y}
              </button>
            </div>

            <div className="custom-offset">
              <span className="custom-offset-label">{td.custom}</span>
              <div className="custom-offset-controls">
                <label>
                  <span className="sr-only">{td.amount}</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder={td.amountPlaceholder}
                  />
                </label>
                <label>
                  <span className="sr-only">{td.unit}</span>
                  <select
                    value={customUnit}
                    onChange={(event) => setCustomUnit(event.target.value as OffsetUnit)}
                  >
                    <option value="days">{td.units.days}</option>
                    <option value="months">{td.units.months}</option>
                    <option value="years">{td.units.years}</option>
                  </select>
                </label>
                <button
                  className="soft-btn soft-btn-primary"
                  type="button"
                  disabled={!customAmount || Number(customAmount) < 0}
                  onClick={() => {
                    const amount = Number(customAmount);
                    if (!Number.isFinite(amount) || amount < 0) return;
                    setToDate(toDateInputValue(addOffset(parseLocalDate(fromDate), amount, customUnit)));
                  }}
                >
                  {td.apply}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <small>{td.fromStart}</small>
            </div>
          </form>
      </section>

      <section className="result-band card" aria-live="polite">
        <div className="result-main">
          <span>{rangeLabel}</span>
          <strong>{td.days(n(result.countedDays))}</strong>
          <p>
            {includeEndDate
              ? td.includeNote(td.days(n(result.rawDays)))
              : td.excludeNote}
          </p>
        </div>

        <div className="metric-grid">
          <article>
            <span>{td.weeks}</span>
            <strong>
              {td.weeksValue(n(result.weeks), result.weekRemainder)}
            </strong>
          </article>
          <article>
            <span>{td.monthsYears}</span>
            <strong>
              {td.monthsYearsValue(result.distance.years, result.distance.months, result.distance.days)}
            </strong>
          </article>
          <article>
            <span>{td.midpoint}</span>
            <strong>{formatDate(result.midpoint, intl)}</strong>
          </article>
          <article>
            <span>{td.vsToday}</span>
            <strong>{todayLabel}</strong>
          </article>
        </div>
      </section>
    </DayCounterShell>
  );
}

function DayCounterShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="page-shell day-counter-shell">
      <SiteHeader tool="dayCounter" workspace />
      <GoogleAd />
      <div className="page-content">
        {children}
        <footer className="page-footer">{t.site.copyright}</footer>
      </div>
    </main>
  );
}

function DayCounterIntro() {
  const { t } = useI18n();
  return (
    <div className="page-heading day-counter-copy">
      <p className="page-kicker">{t.dayCounter.kicker}</p>
      <h1>{t.dayCounter.title}</h1>
      <p>{t.dayCounter.intro}</p>
    </div>
  );
}

/**
 * Default dates are relative to "today" in the visitor's time zone, which a page
 * prerendered at build time cannot know. The intro renders on the server; the
 * calculator renders after hydration.
 */
export default function DayCounterTool() {
  const isClient = useIsClient();
  if (isClient) return <DayCounterContent />;

  return (
    <DayCounterShell>
      <section aria-busy="true" className="day-counter-grid">
        <DayCounterIntro />
      </section>
    </DayCounterShell>
  );
}

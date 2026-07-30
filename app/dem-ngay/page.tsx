"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "react-day-picker/locale";
import "react-day-picker/style.css";
import "./dem-ngay.css";

const DAY_MS = 24 * 60 * 60 * 1000;
type OffsetUnit = "days" | "months" | "years";

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

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

function formatDate(date: Date) {
  return DATE_FORMATTER.format(date);
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

function pluralDay(value: number) {
  return `${value.toLocaleString("vi-VN")} ngày`;
}

type GlassDatePickerProps = {
  label: string;
  step: string;
  value: string;
  onChange: (value: string) => void;
};

function GlassDatePicker({ label, step, value, onChange }: GlassDatePickerProps) {
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
          {selectedDate.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
        <svg className="date-input-chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m8 10 4 4 4-4" />
        </svg>
      </button>
      <span className="date-picker-preview">{formatDate(selectedDate)}</span>

      {open && (
        <div className="date-picker-popover" role="dialog" aria-label={`Chọn ${label.toLowerCase()}`}>
          <DayPicker
            animate
            captionLayout="dropdown"
            endMonth={new Date(2100, 11)}
            fixedWeeks
            locale={vi}
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
          <div className="date-picker-footer">
            <button type="button" onClick={() => setOpen(false)}>
              Đóng
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(toDateInputValue(new Date()));
                setOpen(false);
              }}
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DayCounterPage() {
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
      ? `${formatDate(result.from)} đến ${formatDate(result.to)}`
      : `${formatDate(result.to)} đến ${formatDate(result.from)}`;

  const todayLabel =
    result.fromToday === 0
      ? "Kết thúc vào hôm nay"
      : result.last < today
        ? `Mốc cuối đã qua ${Math.abs(result.fromToday).toLocaleString("vi-VN")} ngày`
        : `Còn ${result.fromToday.toLocaleString("vi-VN")} ngày tới mốc cuối`;

  return (
    <main className="day-counter-shell">
      <section className="day-counter-hero">
        <div className="day-counter-nav">
          <Link href="/" className="day-counter-back">
            JSON Tool
          </Link>
          <span>Đếm ngày</span>
        </div>

        <div className="day-counter-grid">
          <div className="day-counter-copy">
            <p className="day-counter-kicker">Date distance calculator</p>
            <h1>Đếm ngày từ mốc này đến mốc kia</h1>
            <p>
              Chọn hai ngày bất kỳ để xem khoảng cách chính xác, tính theo ngày,
              tuần và nhịp tháng/năm dễ đọc.
            </p>
          </div>

          <form className="day-counter-card" aria-label="Công cụ đếm ngày">
            <div className="date-fields">
              <GlassDatePicker
                label="Ngày bắt đầu"
                step="01"
                value={fromDate}
                onChange={setFromDate}
              />

              <button
                className="date-swap-button"
                type="button"
                aria-label="Đổi ngày bắt đầu và ngày kết thúc"
                title="Đổi hai mốc ngày"
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
                label="Ngày kết thúc"
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
              <span>Tính cả ngày bắt đầu và ngày kết thúc</span>
            </label>

            <div className="quick-actions" aria-label="Chọn nhanh">
              <button type="button" onClick={() => setFromDate(toDateInputValue(today))}>
                Hôm nay
              </button>
              <button type="button" onClick={() => setToDate(toDateInputValue(addDays(today, 7)))}>
                +7 ngày
              </button>
              <button type="button" onClick={() => setToDate(toDateInputValue(addDays(today, 30)))}>
                +30 ngày
              </button>
              <button type="button" onClick={() => setToDate(toDateInputValue(addDays(today, 365)))}>
                +1 năm
              </button>
            </div>

            <div className="custom-offset">
              <span className="custom-offset-label">Tùy chỉnh khoảng cách</span>
              <div className="custom-offset-controls">
                <label>
                  <span className="sr-only">Số lượng muốn cộng</span>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder="Nhập số"
                  />
                </label>
                <label>
                  <span className="sr-only">Đơn vị thời gian</span>
                  <select
                    value={customUnit}
                    onChange={(event) => setCustomUnit(event.target.value as OffsetUnit)}
                  >
                    <option value="days">Ngày</option>
                    <option value="months">Tháng</option>
                    <option value="years">Năm</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!customAmount || Number(customAmount) < 0}
                  onClick={() => {
                    const amount = Number(customAmount);
                    if (!Number.isFinite(amount) || amount < 0) return;
                    setToDate(toDateInputValue(addOffset(parseLocalDate(fromDate), amount, customUnit)));
                  }}
                >
                  Áp dụng
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <small>Tính từ ngày bắt đầu đã chọn</small>
            </div>
          </form>
        </div>
      </section>

      <section className="result-band" aria-live="polite">
        <div className="result-main">
          <span>{rangeLabel}</span>
          <strong>{pluralDay(result.countedDays)}</strong>
          <p>
            {includeEndDate
              ? `Khoảng cách thường là ${pluralDay(result.rawDays)}, đang cộng thêm 1 ngày theo lựa chọn.`
              : "Không tính trùng ngày kết thúc, đúng kiểu đếm khoảng cách giữa hai mốc."}
          </p>
        </div>

        <div className="metric-grid">
          <article>
            <span>Tuần</span>
            <strong>
              {result.weeks.toLocaleString("vi-VN")} tuần {result.weekRemainder} ngày
            </strong>
          </article>
          <article>
            <span>Tháng / năm</span>
            <strong>
              {result.distance.years} năm {result.distance.months} tháng {result.distance.days} ngày
            </strong>
          </article>
          <article>
            <span>Điểm giữa</span>
            <strong>{formatDate(result.midpoint)}</strong>
          </article>
          <article>
            <span>So với hôm nay</span>
            <strong>{todayLabel}</strong>
          </article>
        </div>
      </section>
    </main>
  );
}

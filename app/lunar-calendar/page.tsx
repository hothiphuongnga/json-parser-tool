"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import "./lunar-calendar.css";

type LunarDate = {
  day: number;
  month: number;
  year: number;
  leap: boolean;
};

type CalendarDay = {
  date: Date;
  lunar: LunarDate;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
};

type LunarLookup = {
  day: string;
  month: string;
  year: string;
  leap: boolean;
};

const TIME_ZONE = 7;
const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTH_NAMES = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];
const GOOD_HOUR_PATTERNS = [
  "110100101100",
  "001101001011",
  "110011010010",
  "101100110100",
  "001011001101",
  "010010110011",
];

function jdFromDate(day: number, month: number, year: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  if (jd < 2299161) {
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }

  return jd;
}

function jdToDate(jd: number) {
  let b: number;
  let c: number;

  if (jd > 2299160) {
    const a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }

  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);

  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: b * 100 + d - 4800 + Math.floor(m / 10),
  };
}

function getNewMoonDay(k: number, timeZone: number) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = Math.PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);

  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  const c1 =
    (0.1734 - 0.000393 * t) * Math.sin(m * dr) +
    0.0021 * Math.sin(2 * dr * m) -
    0.4068 * Math.sin(mpr * dr) +
    0.0161 * Math.sin(2 * dr * mpr) -
    0.0004 * Math.sin(3 * dr * mpr) +
    0.0104 * Math.sin(2 * dr * f) -
    0.0051 * Math.sin((m + mpr) * dr) -
    0.0074 * Math.sin((m - mpr) * dr) +
    0.0004 * Math.sin((2 * f + m) * dr) -
    0.0004 * Math.sin((2 * f - m) * dr) -
    0.0006 * Math.sin((2 * f + mpr) * dr) +
    0.001 * Math.sin((2 * f - mpr) * dr) +
    0.0005 * Math.sin((2 * mpr + m) * dr);

  const deltaT =
    t < -11
      ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
      : -0.000278 + 0.000265 * t + 0.000262 * t2;

  return Math.floor(jd1 + c1 - deltaT + 0.5 + timeZone / 24);
}

function getSunLongitude(dayNumber: number, timeZone: number) {
  const t = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
  const t2 = t * t;
  const dr = Math.PI / 180;
  const m = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t * t2;
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  let dl = (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(dr * m);
  dl += (0.019993 - 0.000101 * t) * Math.sin(2 * dr * m) + 0.00029 * Math.sin(3 * dr * m);
  let longitude = (l0 + dl) * dr;
  longitude -= Math.PI * 2 * Math.floor(longitude / (Math.PI * 2));

  return Math.floor((longitude / Math.PI) * 6);
}

function getLunarMonth11(year: number, timeZone: number) {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);

  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }

  return nm;
}

function getLeapMonthOffset(a11: number, timeZone: number) {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);

  do {
    last = arc;
    i += 1;
    arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);

  return i - 1;
}

function convertSolarToLunar(day: number, month: number, year: number, timeZone = TIME_ZONE): LunarDate {
  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);

  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }

  let a11 = getLunarMonth11(year, timeZone);
  let b11 = a11;
  let lunarYear: number;

  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = getLunarMonth11(year - 1, timeZone);
  } else {
    lunarYear = year + 1;
    b11 = getLunarMonth11(year + 1, timeZone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = false;
  let lunarMonth = diff + 11;

  if (b11 - a11 > 365) {
    const leapMonthDiff = getLeapMonthOffset(a11, timeZone);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = true;
      }
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }

  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return {
    day: lunarDay,
    month: lunarMonth,
    year: lunarYear,
    leap: lunarLeap,
  };
}

function convertLunarToSolar(lunar: LunarDate, timeZone = TIME_ZONE) {
  let a11: number;
  let b11: number;

  if (lunar.month < 11) {
    a11 = getLunarMonth11(lunar.year - 1, timeZone);
    b11 = getLunarMonth11(lunar.year, timeZone);
  } else {
    a11 = getLunarMonth11(lunar.year, timeZone);
    b11 = getLunarMonth11(lunar.year + 1, timeZone);
  }

  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let offset = lunar.month - 11;
  if (offset < 0) {
    offset += 12;
  }

  if (b11 - a11 > 365) {
    const leapOffset = getLeapMonthOffset(a11, timeZone);
    let leapMonth = leapOffset - 2;
    if (leapMonth < 0) {
      leapMonth += 12;
    }

    if (lunar.leap && lunar.month !== leapMonth) {
      return null;
    }

    if (lunar.leap || offset >= leapOffset) {
      offset += 1;
    }
  } else if (lunar.leap) {
    return null;
  }

  const monthStart = getNewMoonDay(k + offset, timeZone);
  const solar = jdToDate(monthStart + lunar.day - 1);
  const checked = convertSolarToLunar(solar.day, solar.month, solar.year, timeZone);

  if (
    checked.day !== lunar.day ||
    checked.month !== lunar.month ||
    checked.year !== lunar.year ||
    checked.leap !== lunar.leap
  ) {
    return null;
  }

  return solar;
}

function sameDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatSolarDate(date: Date) {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
}

function formatSolarParts(day: number, month: number, year: number) {
  return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

function parseLookupNumber(value: string) {
  const next = Number(value);
  return Number.isInteger(next) ? next : null;
}

function canChiYear(year: number) {
  return `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;
}

function canChiMonth(lunar: LunarDate) {
  return `${CAN[(lunar.year * 12 + lunar.month + 3) % 10]} ${CHI[(lunar.month + 1) % 12]}`;
}

function canChiDay(date: Date) {
  const jd = jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`;
}

function goodHours(date: Date) {
  const jd = jdFromDate(date.getDate(), date.getMonth() + 1, date.getFullYear());
  const pattern = GOOD_HOUR_PATTERNS[(jd + 1) % 12 % 6];

  return CHI.filter((_, index) => pattern.charAt(index) === "1").join(", ");
}

function buildCalendarDays(viewDate: Date, selectedDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(year, month, 1 - mondayOffset);
  const today = new Date();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    return {
      date,
      lunar: convertSolarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear()),
      inMonth: date.getMonth() === month,
      isToday: sameDate(date, today),
      isSelected: sameDate(date, selectedDate),
    };
  });
}

function moonPhase(lunarDay: number) {
  if (lunarDay <= 2 || lunarDay >= 29) {
    return "Trăng non";
  }
  if (lunarDay < 8) {
    return "Trăng thượng huyền";
  }
  if (lunarDay <= 16) {
    return "Trăng tròn";
  }
  if (lunarDay < 24) {
    return "Trăng hạ huyền";
  }
  return "Cuối tuần trăng";
}

export default function LunarCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const solarInputRef = useRef<HTMLInputElement | null>(null);
  const todayLunar = useMemo(
    () => convertSolarToLunar(today.getDate(), today.getMonth() + 1, today.getFullYear()),
    [today],
  );
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [solarLookup, setSolarLookup] = useState(toDateInputValue(today));
  const [lunarLookup, setLunarLookup] = useState<LunarLookup>({
    day: String(todayLunar.day),
    month: String(todayLunar.month),
    year: String(todayLunar.year),
    leap: todayLunar.leap,
  });
  const days = useMemo(() => buildCalendarDays(viewDate, selectedDate), [selectedDate, viewDate]);
  const selectedLunar = convertSolarToLunar(selectedDate.getDate(), selectedDate.getMonth() + 1, selectedDate.getFullYear());
  const monthTitle = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const solarLookupResult = useMemo(() => {
    const date = parseDateInput(solarLookup);
    if (!date) {
      return null;
    }

    return convertSolarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
  }, [solarLookup]);
  const lunarLookupResult = useMemo(() => {
    const day = parseLookupNumber(lunarLookup.day);
    const month = parseLookupNumber(lunarLookup.month);
    const year = parseLookupNumber(lunarLookup.year);

    if (!day || !month || !year || day < 1 || day > 30 || month < 1 || month > 12) {
      return null;
    }

    return convertLunarToSolar({ day, month, year, leap: lunarLookup.leap });
  }, [lunarLookup]);

  function moveMonth(step: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));
  }

  function jumpToday() {
    const next = new Date();
    setSelectedDate(next);
    setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
    setSolarLookup(toDateInputValue(next));
  }

  function pickDate(date: Date) {
    const lunar = convertSolarToLunar(date.getDate(), date.getMonth() + 1, date.getFullYear());
    setSelectedDate(date);
    setSolarLookup(toDateInputValue(date));
    setLunarLookup({
      day: String(lunar.day),
      month: String(lunar.month),
      year: String(lunar.year),
      leap: lunar.leap,
    });
  }

  function handleSolarLookupChange(value: string) {
    setSolarLookup(value);

    const date = parseDateInput(value);
    if (!date) {
      return;
    }

    pickDate(date);
    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function openSolarPicker() {
    const input = solarInputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.showPicker?.();
  }

  return (
    <main className="lunar-shell">
      <header className="lunar-topbar">
        <Link className="lunar-brand" href="/">
          ToolHub Calendar
        </Link>
        <nav className="lunar-nav" aria-label="Tools">
          <Link href="/">JSON Parser</Link>
          <Link href="/json-to-type">JSON to Type</Link>
        </nav>
      </header>

      <section className="lookup-stage" aria-label="Chuyển đổi lịch âm dương">
        <div className="lookup-heading">
          <span>Tra cứu nhanh</span>
          <h1>Đổi ngày âm dương</h1>
        </div>

        <div className="converter-panel">
          <article className="converter-card">
            <span>Đổi dương sang âm</span>
            <label>
              Ngày dương
              <span className="date-picker-shell" onClick={openSolarPicker}>
                <input
                  onClick={openSolarPicker}
                  onChange={(event) => handleSolarLookupChange(event.target.value)}
                  ref={solarInputRef}
                  type="date"
                  value={solarLookup}
                />
                <button aria-label="Mở chọn ngày dương" onClick={openSolarPicker} type="button">
                  <span aria-hidden="true">▦</span>
                </button>
              </span>
            </label>
            <strong>
              {solarLookupResult
                ? `${solarLookupResult.day}/${solarLookupResult.month}${solarLookupResult.leap ? " nhuận" : ""}/${solarLookupResult.year}`
                : "Ngày dương không hợp lệ"}
            </strong>
          </article>

          <article className="converter-card">
            <span>Đổi âm sang dương</span>
            <div className="lunar-input-grid">
              <label>
                Ngày
                <input
                  inputMode="numeric"
                  max="30"
                  min="1"
                  onChange={(event) => setLunarLookup((current) => ({ ...current, day: event.target.value }))}
                  type="number"
                  value={lunarLookup.day}
                />
              </label>
              <label>
                Tháng
                <input
                  inputMode="numeric"
                  max="12"
                  min="1"
                  onChange={(event) => setLunarLookup((current) => ({ ...current, month: event.target.value }))}
                  type="number"
                  value={lunarLookup.month}
                />
              </label>
              <label>
                Năm
                <input
                  inputMode="numeric"
                  min="1"
                  onChange={(event) => setLunarLookup((current) => ({ ...current, year: event.target.value }))}
                  type="number"
                  value={lunarLookup.year}
                />
              </label>
            </div>
            <label className="leap-check">
              <input
                checked={lunarLookup.leap}
                onChange={(event) => setLunarLookup((current) => ({ ...current, leap: event.target.checked }))}
                type="checkbox"
              />
              Tháng nhuận
            </label>
            <strong>
              {lunarLookupResult
                ? formatSolarParts(lunarLookupResult.day, lunarLookupResult.month, lunarLookupResult.year)
                : "Ngày âm không hợp lệ"}
            </strong>
          </article>
        </div>
      </section>

      <section className="lunar-stage">
        <aside className="lunar-detail">
          <div className="moon-card">
            <span className="moon-visual" aria-hidden="true" />
            <div>
              <p>{formatSolarDate(selectedDate)}</p>
              <h1>
                {selectedLunar.day}
                <span>/{selectedLunar.month}{selectedLunar.leap ? " nhuận" : ""}</span>
              </h1>
              <strong>{canChiYear(selectedLunar.year)}</strong>
            </div>
          </div>

          <div className="lunar-note-grid">
            <article>
              <span>Ngày</span>
              <strong>{canChiDay(selectedDate)}</strong>
            </article>
            <article>
              <span>Tháng</span>
              <strong>{canChiMonth(selectedLunar)}</strong>
            </article>
            <article>
              <span>Tuần trăng</span>
              <strong>{moonPhase(selectedLunar.day)}</strong>
            </article>
            <article>
              <span>Giờ hoàng đạo</span>
              <strong>{goodHours(selectedDate)}</strong>
            </article>
          </div>
        </aside>

        <section className="calendar-board">
          <div className="calendar-toolbar">
            <div>
              <span>Lịch âm Việt Nam</span>
              <h2>{monthTitle}</h2>
            </div>
            <div className="calendar-actions">
              <button onClick={() => moveMonth(-1)} type="button" aria-label="Tháng trước">
                ‹
              </button>
              <button onClick={jumpToday} type="button">
                Hôm nay
              </button>
              <button onClick={() => moveMonth(1)} type="button" aria-label="Tháng sau">
                ›
              </button>
            </div>
          </div>

          <div className="weekday-row">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {days.map((item) => (
              <button
                className={[
                  "calendar-cell",
                  item.inMonth ? "" : "muted",
                  item.isToday ? "today" : "",
                  item.isSelected ? "selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={item.date.toISOString()}
                onClick={() => pickDate(item.date)}
                type="button"
              >
                <span className="solar-day">{item.date.getDate()}</span>
                <span className="lunar-day">
                  {item.lunar.day === 1 ? `${item.lunar.day}/${item.lunar.month}` : item.lunar.day}
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { CalendarDays, MapPin } from "lucide-react";

export type Filters = {
  search?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  campus?: string;
  minAvailable?: number;
};

export default function PostsFilter({
  value,
  onChange,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
}) {
  const [search, setSearch] = useState(value.search || "");
  const [eventId, setEventId] = useState(value.eventId || "");
  const [dateFrom, setDateFrom] = useState(value.dateFrom || "");
  const [dateTo, setDateTo] = useState(value.dateTo || "");
  const [location, setLocation] = useState(value.location || "");
  const [campus, setCampus] = useState(value.campus || "");
  const [minAvailable, setMinAvailable] = useState<number>(value.minAvailable ?? 0);

  // Keep local state in sync when parent `value` changes (e.g. Reset)
  useEffect(() => {
    setSearch(value.search || "");
    setEventId(value.eventId || "");
    setDateFrom(value.dateFrom || "");
    setDateTo(value.dateTo || "");
    setLocation(value.location || "");
    setCampus(value.campus || "");
    setMinAvailable(value.minAvailable ?? 0);
  }, [value]);

  // debounce search input (use current local state to avoid stale `value` prop)
    useEffect(() => {
      const t = setTimeout(() =>
        onChange({ search, eventId, dateFrom, dateTo, location, campus, minAvailable }),
      300);
      return () => clearTimeout(t);
    }, [search]);

  // immediate updates for other fields (send full filter shape)
  useEffect(() => {
    onChange({ search, eventId, dateFrom, dateTo, location, campus, minAvailable });
  }, [eventId, dateFrom, dateTo, location, campus, minAvailable]);

  return (
    <div className="mb-4 p-3 bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input
          className="w-full px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800"
          placeholder="Search title or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="relative">
          {/* Calendar dropdown toggle */}
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChangeFrom={setDateFrom}
            onChangeTo={setDateTo}
          />
        </div>
        
        {/* Campus Filter Dropdown */}
        <div className="relative">
          <select
            className="w-full px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800 appearance-none pr-8"
            value={campus}
            onChange={(e) => setCampus(e.target.value)}
          >
            <option value="">All Campuses</option>
            <option value="South Campus">South Campus</option>
            <option value="North Campus">North Campus</option>
            <option value="East Campus">East Campus</option>
            <option value="West Campus">West Campus</option>
          </select>
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
        <input
          className="w-full px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800"
          placeholder="Specific location (e.g., GSU)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <select
          className="w-full px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        >
          <option value="">All events</option>
          {/* If you want to inject events, extend this component to accept an `events` prop */}
        </select>

        <input
          type="number"
          min={0}
          className="w-full px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800"
          placeholder="Min available"
          value={minAvailable}
          onChange={(e) => setMinAvailable(Number(e.target.value || 0))}
        />
      </div>
    </div>
  );
}

function DateRangePicker({
  dateFrom,
  dateTo,
  onChangeFrom,
  onChangeTo,
}: {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const [viewDate, setViewDate] = useState(() => {
    const d = dateFrom || dateTo;
    return d ? new Date(d + "T00:00:00") : new Date();
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    // keep viewDate in sync when external dates change
    const d = dateFrom || dateTo;
    if (d) setViewDate(new Date(d + "T00:00:00"));
  }, [dateFrom, dateTo]);

  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

  const prevMonth = () => setViewDate((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  const nextMonth = () => setViewDate((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));

  const label = dateFrom || dateTo ? `${dateFrom || "—"} → ${dateTo || "—"}` : "Choose dates";

  const onDayClick = (day: number) => {
    const clicked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const iso = formatYMD(clicked);
    if (!dateFrom || (dateFrom && dateTo)) {
      // start new range
      onChangeFrom(iso);
      onChangeTo("");
    } else if (dateFrom && !dateTo) {
      // set end if after or equal, else start over
      if (iso >= dateFrom) {
        onChangeTo(iso);
      } else {
        onChangeFrom(iso);
      }
    }
  };

  const renderCalendar = () => {
    const first = startOfMonth(viewDate);
    const startWeekday = first.getDay(); // 0 Sun..6 Sat
    const totalDays = daysInMonth(viewDate);
    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <button className="px-2" onClick={prevMonth}>&lt;</button>
          <div className="text-sm font-medium">{viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</div>
          <button className="px-2" onClick={nextMonth}>&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-center">
          {['S','M','T','W','T','F','S'].map((d) => (
            <div key={d} className="text-gray-500">{d}</div>
          ))}
          {cells.map((c, idx) => {
            if (c === null) return <div key={idx} />;
            const dt = new Date(viewDate.getFullYear(), viewDate.getMonth(), c);
            const iso = formatYMD(dt);
            const isStart = dateFrom === iso;
            const isEnd = dateTo === iso;
            const inRange = dateFrom && dateTo && iso >= dateFrom && iso <= dateTo;
            const classes = [
              'py-2 rounded',
              isStart || isEnd ? 'bg-red-600 text-white' : inRange ? 'bg-red-100 dark:bg-red-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
            ].join(' ');
            return (
              <button key={idx} className={classes} onClick={() => onDayClick(c)}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={ref} className="inline-block relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center gap-2 px-3 py-2 border rounded bg-gray-50 dark:bg-gray-800"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      </button>

      {open && (
        <div className="absolute mt-2 z-40 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-3 shadow-lg">
          {renderCalendar()}
          <div className="flex justify-between mt-3">
            <button className="text-sm text-gray-600" onClick={() => { onChangeFrom(''); onChangeTo(''); }}>
              Clear
            </button>
            <button className="text-sm text-blue-600" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList as List, ListOnScrollProps } from 'react-window';
import { addDays, differenceInCalendarDays, formatISO, isAfter, isSameDay, parseISO, startOfDay } from 'date-fns';
import clsx from 'clsx';
import { dayStats, eachDay, rangeStats } from '../stats';
import type { HabitInstance } from '../types';
import { useReportRange } from '../reportRangeStore';
import { demoInstances } from '../fixtures';

type Zoom = '21d' | '30d' | '90d' | '6m' | '1y' | 'custom';

export type ActivityHeatmapProps = {
  instances: HabitInstance[];
  startDate?: string;
  endDate?: string;
  onRangeChange?: (from: string, to: string) => void;
  zoom?: Zoom;
};

const CELL = 44; // px
const GAP = 4; // px
const ITEM = CELL + GAP;

export function ActivityHeatmap({ instances = demoInstances, startDate, endDate, onRangeChange, zoom = '30d' }: ActivityHeatmapProps) {
  const todayISO = formatISO(startOfDay(new Date()), { representation: 'date' });
  const store = useReportRange();
  const controlled = startDate && endDate;
  const [range, setRange] = useState(() => normalizeRange(zoom, todayISO, startDate ?? store.from, endDate ?? store.to));
  useEffect(() => {
    const from = startDate ?? store.from;
    const to = endDate ?? store.to;
    setRange({ from, to });
  }, [startDate, endDate, store.from, store.to]);

  const dates = useMemo(() => eachDay(range.from, range.to), [range]);
  const listRef = useRef<List>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const onScroll = (e: ListOnScrollProps) => setScrollOffset(e.scrollOffset);

  const initialIndex = Math.max(0, dates.length - 1 - Math.floor((600 - CELL) / ITEM));

  // keyboard navigation
  const [focusIdx, setFocusIdx] = useState(() => dates.length - 1);

  useEffect(() => {
    // whenever range changes, keep focus at the last day (usually today)
    setFocusIdx(dates.length - 1);
  }, [dates.length]);

  const handleKey = (ev: React.KeyboardEvent<HTMLDivElement>) => {
    if (!dates.length) return;
    const windowSize = dates.length; // current visible range window
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      setFocusIdx((i) => Math.max(0, i - 1));
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      setFocusIdx((i) => Math.min(dates.length - 1, i + 1));
    } else if (ev.key === 'PageUp') {
      ev.preventDefault();
      setFocusIdx((i) => Math.max(0, i - windowSize));
    } else if (ev.key === 'PageDown') {
      ev.preventDefault();
      setFocusIdx((i) => Math.min(dates.length - 1, i + windowSize));
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      const idx = dates.findIndex((d) => d === todayISO);
      setFocusIdx(idx >= 0 ? idx : dates.length - 1);
    }
  };

  useEffect(() => {
    // scroll focused item into view
    listRef.current?.scrollToItem(focusIdx, 'smart');
  }, [focusIdx]);

  // ensure we exercise rangeStats for correctness (aggregate for potential header/aria)
  const aggregate = useMemo(() => rangeStats(range.from, range.to, instances, todayISO), [range, instances, todayISO]);

  return (
    <div className="relative" onKeyDown={handleKey} role="group" aria-label="Activity heatmap">
      {/* month labels */}
      <MonthLabels dates={dates} itemWidth={ITEM} scrollOffset={scrollOffset} />
      <div className="mt-6">
        <List
          layout="horizontal"
          ref={listRef}
          height={CELL}
          width={Math.min(1000, Math.max(360, typeof window === 'undefined' ? 600 : window.innerWidth - 64))}
          itemCount={dates.length}
          itemSize={ITEM}
          onScroll={onScroll}
          initialScrollOffset={initialIndex * ITEM}
        >
          {({ index, style }) => {
            const date = dates[index];
            const s = dayStats(date, instances, todayISO);
            const tooltip = s.pct == null
              ? `${date} — —`
              : `${date} — ${s.completed}/${s.scheduled} (${Math.round(s.pct)}%)`;
            const noSchedule = s.scheduled === 0 || s.pct == null;
            const bg = intensityClass(s.pct ?? 0);
            const pattern = noSchedule
              ? {
                  backgroundImage:
                    'repeating-linear-gradient(135deg, rgba(107,114,128,0.35) 0px, rgba(107,114,128,0.35) 6px, transparent 6px, transparent 12px)'
                }
              : undefined;

            const isToday = date === todayISO;
            const isFocused = index === focusIdx;

            return (
              <div style={style} className="px-0.5">
                <button
                  data-testid="day-cell"
                  className={clsx(
                    'flex items-center justify-center rounded-md border text-xs tabular-nums',
                    'w-[44px] h-[44px] min-w-[44px] min-h-[44px] select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                    noSchedule ? 'border-dashed border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700',
                    bg,
                    isToday && 'ring-1 ring-brand-600'
                  )}
                  style={pattern}
                  title={s.pct == null ? `${date} — No schedule` : tooltip}
                  aria-label={s.pct == null ? `${date} — No schedule` : `${date} — ${s.completed}/${s.scheduled} completed (${Math.round(s.pct)}%)`}
                  tabIndex={isFocused ? 0 : -1}
                  onFocus={() => setFocusIdx(index)}
                >
                  <span className={clsx('font-semibold', (s.pct ?? 0) > 50 ? 'text-white' : 'text-slate-800 dark:text-slate-100')}>{formatDateLabel(date)}</span>
                </button>
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
}

function formatDateLabel(dateISO: string): string {
  const d = parseISO(dateISO);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function intensityClass(pct: number) {
  if (pct >= 90) return 'bg-emerald-600';
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-emerald-400';
  if (pct > 0) return 'bg-amber-400';
  return 'bg-slate-100 dark:bg-slate-800';
}

function normalizeRange(zoom: Zoom, todayISO: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) return { from: startDate, to: endDate };
  const today = parseISO(todayISO);
  const add = (days: number) => formatISO(addDays(today, -days + 1), { representation: 'date' });
  switch (zoom) {
    case '21d':
      return { from: add(21), to: todayISO };
    case '30d':
      return { from: add(30), to: todayISO };
    case '90d':
      return { from: add(90), to: todayISO };
    case '6m':
      return { from: formatISO(addDays(today, -183), { representation: 'date' }), to: todayISO };
    case '1y':
      return { from: formatISO(addDays(today, -364), { representation: 'date' }), to: todayISO };
    default:
      return { from: add(30), to: todayISO };
  }
}

function MonthLabels({ dates, itemWidth, scrollOffset }: { dates: string[]; itemWidth: number; scrollOffset: number }) {
  const positions = useMemo(() => {
    const arr: { left: number; label: string }[] = [];
    dates.forEach((d, i) => {
      const date = parseISO(d);
      if (date.getDate() === 1) arr.push({ left: i * itemWidth, label: date.toLocaleString(undefined, { month: 'short' }) });
    });
    return arr;
  }, [dates, itemWidth]);

  return (
    <div className="sticky top-0 z-10 h-6 select-none">
      <div className="relative h-6 overflow-hidden">
        <div className="absolute left-0 top-0 h-6" style={{ transform: `translateX(${-scrollOffset}px)` }}>
          {positions.map((p) => (
            <span key={`${p.label}-${p.left}`} className="absolute text-xs text-slate-600 dark:text-slate-300" style={{ left: p.left + 4 }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

import { useStore } from '../../state/store';

export function FilterBar() {
  const { tags, filters, setRange, toggleTag, setAgg, resetFilters } = useStore();

  return (
    <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/70 dark:bg-slate-950/70 backdrop-blur border-y border-slate-200/60 dark:border-slate-700/60">
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2" role="tablist" aria-label="Time range">
          {(
            [
              { key: '7', label: '7' },
              { key: '30', label: '30' },
              { key: 'quarter', label: 'Quarter' },
              { key: 'year', label: 'Year' }
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              role="tab"
              aria-selected={filters.rangeKey === r.key}
              onClick={() => setRange(r.key)}
              className={
                'h-11 min-w-11 px-4 rounded-full text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ' +
                (filters.rangeKey === r.key
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700')
              }
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2" aria-label="Tags filter">
          {tags.map((t) => {
            const active = filters.tags.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={
                  'h-11 px-4 rounded-full text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ' +
                  (active
                    ? 'bg-slate-900 text-white border-transparent dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700')
                }
                aria-pressed={active}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2" role="group" aria-label="Aggregation mode">
          {(
            [
              { key: 'micro', label: 'Micro' },
              { key: 'macro', label: 'Macro' }
            ] as const
          ).map((m) => (
            <button
              key={m.key}
              onClick={() => setAgg(m.key)}
              className={
                'h-11 px-4 rounded-full text-sm border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ' +
                (filters.agg === m.key
                  ? 'bg-brand-600 text-white border-transparent'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700')
              }
              aria-pressed={filters.agg === m.key}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={resetFilters}
            className="h-11 px-4 rounded-full text-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

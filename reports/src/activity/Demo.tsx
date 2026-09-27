import { useMemo } from 'react';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { YearOverview } from './components/YearOverview';
import { RangeControls } from './components/RangeControls';
import { useActivityStore } from './store';
import { demoInstances } from './fixtures';

export function ActivityDemo() {
  const { zoom, from, to, setZoom, setRange } = useActivityStore();
  const instances = demoInstances;

  return (
    <div className="min-h-screen p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Activity Heatmap Demo</h1>
      <RangeControls zoom={zoom} from={from} to={to} onZoomChange={setZoom} onRangeChange={setRange} />
      <ActivityHeatmap instances={instances} startDate={from} endDate={to} />
      <YearOverview instances={instances} from={from} to={to} onRangeChange={setRange} />
    </div>
  );
}


import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import type { WeeklyBucket } from '../../domain/stats';

type Props = { buckets: WeeklyBucket[] };

export function WeeklyBars({ buckets }: Props) {
  const data = buckets.map((b) => ({
    week: b.weekStart,
    pct: Math.round(b.pct),
    completed: b.completed,
    scheduled: b.scheduled
  }));
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: any, name, props) => {
            const p = props?.payload as any;
            return [
              `${value}%`,
              `${p.completed}/${p.scheduled} completed`
            ];
          }}
          labelFormatter={(label) => `Week starting ${label}`}
          />
          <Bar dataKey="pct" fill="#2563eb" radius={[4, 4, 0, 0]}>
            <LabelList dataKey="pct" position="top" formatter={(v: any) => `${v}%`} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


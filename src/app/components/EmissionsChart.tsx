import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EmissionsChartProps {
  industry1: string;
  industry2: string;
  data: Array<{ year: number; industry1: number; industry2: number }>;
  yAxisLabel: string;
  tooltipLabel: string;
  unitLabel: string;
}

function formatTonnes(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${Number((value / 1_000_000_000).toFixed(1)).toLocaleString()}B`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${Number((value / 1_000_000).toFixed(1)).toLocaleString()}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${Number((value / 1_000).toFixed(1)).toLocaleString()}k`;
  }

  return value.toLocaleString();
}

export function EmissionsChart({ industry1, industry2, data, yAxisLabel, tooltipLabel, unitLabel }: EmissionsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 18 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d9e2e8" />
        <XAxis
          dataKey="year"
          stroke="#526371"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#526371"
          style={{ fontSize: '12px' }}
          tickFormatter={formatTonnes}
          width={64}
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -8, fill: '#526371' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #d9e2e8',
            borderRadius: '8px',
            boxShadow: '0 16px 32px -20px rgba(20, 33, 43, 0.45)'
          }}
          formatter={(value: number) => [`${Math.round(value).toLocaleString()} ${unitLabel}`, tooltipLabel]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="industry1"
          name={industry1}
          stroke="#25a9e0"
          strokeWidth={3}
          dot={{ fill: '#25a9e0', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="industry2"
          name={industry2}
          stroke="#f05a9d"
          strokeWidth={3}
          dot={{ fill: '#f05a9d', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

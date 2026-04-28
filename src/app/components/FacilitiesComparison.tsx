import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FacilitiesComparisonProps {
  industry1: string;
  industry2: string;
  count1: number;
  count2: number;
}

export function FacilitiesComparison({ industry1, industry2, count1, count2 }: FacilitiesComparisonProps) {
  const data = [
    { name: industry1, facilities: count1, color: '#3b82f6' },
    { name: industry2, facilities: count2, color: '#8b5cf6' }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          type="number"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          width={150}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        />
        <Bar dataKey="facilities" radius={[0, 8, 8, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

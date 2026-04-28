import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FacilitiesComparisonProps {
  industry1: string;
  industry2: string;
  count1: number;
  count2: number;
}

export function FacilitiesComparison({ industry1, industry2, count1, count2 }: FacilitiesComparisonProps) {
  const data = [
    { name: industry1, facilities: count1, color: '#25a9e0' },
    { name: industry2, facilities: count2, color: '#f05a9d' }
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#d9e2e8" />
        <XAxis
          type="number"
          stroke="#526371"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#526371"
          style={{ fontSize: '12px' }}
          width={150}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #d9e2e8',
            borderRadius: '8px',
            boxShadow: '0 16px 32px -20px rgba(20, 33, 43, 0.45)'
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

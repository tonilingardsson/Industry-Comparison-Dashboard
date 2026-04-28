import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface GeographicSpreadProps {
  industry1: string;
  industry2: string;
  locations1: Array<{ country: string; lat: number; lon: number }>;
  locations2: Array<{ country: string; lat: number; lon: number }>;
}

export function GeographicSpread({ industry1, industry2, locations1, locations2 }: GeographicSpreadProps) {
  const data1 = locations1.map(loc => ({ ...loc, z: 100, industry: industry1 }));
  const data2 = locations2.map(loc => ({ ...loc, z: 100, industry: industry2 }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#d9e2e8" />
          <XAxis
            type="number"
            dataKey="lon"
            name="Longitude"
            stroke="#526371"
            style={{ fontSize: '12px' }}
            domain={[-15, 35]}
          />
          <YAxis
            type="number"
            dataKey="lat"
            name="Latitude"
            stroke="#526371"
            style={{ fontSize: '12px' }}
            domain={[35, 70]}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #d9e2e8',
              borderRadius: '8px',
              boxShadow: '0 16px 32px -20px rgba(20, 33, 43, 0.45)'
            }}
            formatter={(value: any, name: string, props: any) => {
              if (name === 'lat') return [`${value}°`, 'Latitude'];
              if (name === 'lon') return [`${value}°`, 'Longitude'];
              return [value, name];
            }}
            labelFormatter={(value: any, payload: any) => {
              if (payload && payload[0]) {
                return payload[0].payload.country;
              }
              return '';
            }}
          />
          <Scatter name={industry1} data={data1} fill="#25a9e0">
            {data1.map((entry, index) => (
              <Cell key={`cell-1-${index}`} fill="#25a9e0" opacity={0.7} />
            ))}
          </Scatter>
          <Scatter name={industry2} data={data2} fill="#f05a9d">
            {data2.map((entry, index) => (
              <Cell key={`cell-2-${index}`} fill="#f05a9d" opacity={0.7} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex gap-6 justify-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#25a9e0]"></div>
          <span className="text-sm text-[#526371]">{industry1}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-[#f05a9d]"></div>
          <span className="text-sm text-[#526371]">{industry2}</span>
        </div>
      </div>
    </div>
  );
}

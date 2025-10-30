import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { YearProjection } from '../../types/deal';

interface EquityChartProps {
  projections: YearProjection[];
}

export function EquityChart({ projections }: EquityChartProps) {
  const data = projections.map(p => ({
    year: `Year ${p.year}`,
    equity: Math.round(p.equity)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Growth</CardTitle>
        <CardDescription>Total equity buildup over 10 years</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="equity" 
              stroke="var(--chart-2)" 
              fill="var(--chart-2)"
              fillOpacity={0.6}
              name="Equity"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { YearProjection } from '../../types/deal';

interface CashOnCashChartProps {
  projections: YearProjection[];
  cashInvested: number;
}

export function CashOnCashChart({ projections, cashInvested }: CashOnCashChartProps) {
  const data = projections.map(projection => ({
    year: `Year ${projection.year}`,
    cashOnCash: cashInvested > 0 ? (projection.cashFlow / cashInvested) * 100 : 0,
  }));

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash-on-Cash Return</CardTitle>
        <CardDescription>Annual return on invested capital (%)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={formatPercent} />
            <Tooltip formatter={(value: number) => formatPercent(value)} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cashOnCash" 
              stroke="var(--chart-2)" 
              strokeWidth={3}
              name="Cash-on-Cash Return"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
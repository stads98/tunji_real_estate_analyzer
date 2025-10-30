import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { YearProjection } from '../../types/deal';

interface ROIChartProps {
  projections: YearProjection[];
  timeHorizon: 5 | 7 | 10 | 15 | 30;
}

export function ROIChart({ projections, timeHorizon }: ROIChartProps) {
  // Limit projections to selected time horizon
  const displayedProjections = projections.slice(0, timeHorizon);
  
  const data = displayedProjections.map(p => ({
    year: `Year ${p.year}`,
    propertyValue: Math.round(p.propertyValue),
    equity: Math.round(p.equity)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wealth Building Over Time</CardTitle>
        <CardDescription>Property value growth and equity accumulation over {timeHorizon} years (4% appreciation compounding annually)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Bar dataKey="equity" fill="var(--chart-1)" name="Your Equity (Value - Loan)" />
            <Bar dataKey="propertyValue" fill="var(--chart-3)" name="Property Value" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

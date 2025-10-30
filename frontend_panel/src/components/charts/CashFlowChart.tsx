import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { YearProjection } from '../../types/deal';

interface CashFlowChartProps {
  projections: YearProjection[];
  timeHorizon: 5 | 7 | 10 | 15 | 30;
}

export function CashFlowChart({ projections, timeHorizon }: CashFlowChartProps) {
  const displayedProjections = projections.slice(0, timeHorizon);
  
  const data = displayedProjections.map(p => ({
    year: `Year ${p.year}`,
    cashFlow: Math.round(p.cashFlow)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Trend</CardTitle>
        <CardDescription>Annual cash flow over {timeHorizon} years</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cashFlow" 
              stroke="var(--chart-1)" 
              strokeWidth={3}
              name="Cash Flow"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

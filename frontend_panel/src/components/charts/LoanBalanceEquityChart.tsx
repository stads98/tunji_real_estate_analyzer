import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { YearProjection } from '../../types/deal';

interface LoanBalanceEquityChartProps {
  projections: YearProjection[];
  initialPropertyValue: number;
  timeHorizon: 5 | 7 | 10 | 15 | 30;
}

export function LoanBalanceEquityChart({ projections, initialPropertyValue, timeHorizon }: LoanBalanceEquityChartProps) {
  const displayedProjections = projections.slice(0, timeHorizon);
  
  const data = displayedProjections.map(p => ({
    year: `Year ${p.year}`,
    loanBalance: Math.round(p.loanBalance),
    equity: Math.round(p.equity),
    propertyValue: Math.round(p.equity + p.loanBalance)
  }));

  // Calculate 75% and 80% LTV thresholds for refi timing
  const currentPropertyValue = data[data.length - 1]?.propertyValue || initialPropertyValue;
  const refi75Threshold = currentPropertyValue * 0.75;
  const refi80Threshold = currentPropertyValue * 0.80;

  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loan Balance & Equity Tracker</CardTitle>
        <CardDescription>Track equity growth over {timeHorizon} years to identify optimal refinance timing</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis tickFormatter={formatCurrency} />
            <Tooltip 
              formatter={(value: number) => `$${Number(value).toLocaleString()}`}
              labelStyle={{ color: '#000' }}
            />
            <Legend />
            
            {/* Reference lines for common refi LTV thresholds */}
            <ReferenceLine 
              y={refi75Threshold} 
              stroke="#10b981" 
              strokeDasharray="5 5" 
              label={{ value: '75% LTV Refi', position: 'right', fill: '#10b981', fontSize: 11 }}
            />
            
            <Line 
              type="monotone" 
              dataKey="loanBalance" 
              stroke="var(--chart-1)" 
              strokeWidth={3}
              name="Loan Balance"
              dot={{ r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="equity" 
              stroke="var(--chart-2)" 
              strokeWidth={3}
              name="Equity"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--chart-2)' }}></div>
            <span>When equity line crosses 75% LTV line = good time to refinance</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// v253_change: Added useMemo for performance optimization
import React, { useState, useMemo } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { DealInputs, GlobalAssumptions, Strategy } from "../types/deal";
import {
  calculateLTR,
  calculateSection8,
  calculateAirbnb,
  formatCurrency,
  formatPercent,
} from "../utils/calculations";
import {
  ArrowLeft,
  Home,
  Building2,
  Palmtree,
  Download,
  Share2,
} from "lucide-react";
import { CashFlowChart } from "./charts/CashFlowChart";
import { EquityChart } from "./charts/EquityChart";
import { ROIChart } from "./charts/ROIChart";

interface ResultsPageProps {
  inputs: DealInputs;
  assumptions: GlobalAssumptions;
  onBack: () => void;
}

export function ResultsPage({ inputs, assumptions, onBack }: ResultsPageProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>("ltr");

  // v253_change: Memoize expensive 30-year projection calculations
  const ltrResults = useMemo(
    () => calculateLTR(inputs, assumptions),
    [inputs, assumptions]
  );
  const section8Results = useMemo(
    () => calculateSection8(inputs, assumptions),
    [inputs, assumptions]
  );
  const airbnbResults = useMemo(
    () => calculateAirbnb(inputs, assumptions),
    [inputs, assumptions]
  );

  const getBestStrategy = () => {
    const year5ROI = {
      ltr: ltrResults.projections[4]?.cumulativeReturn || 0,
      section8: section8Results.projections[4]?.cumulativeReturn || 0,
      airbnb: airbnbResults.projections[4]?.cumulativeReturn || 0,
    };

    if (year5ROI.airbnb >= year5ROI.ltr && year5ROI.airbnb >= year5ROI.section8)
      return "airbnb";
    if (year5ROI.section8 >= year5ROI.ltr) return "section8";
    return "ltr";
  };

  const bestStrategy = getBestStrategy();

  const renderYear1Summary = (
    results: typeof ltrResults,
    strategyName: string,
    icon: React.ReactNode
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle>{strategyName}</CardTitle>
          </div>
          {bestStrategy === selectedStrategy.toLowerCase() && (
            <Badge variant="default" className="bg-green-600">
              Best 5-Year ROI
            </Badge>
          )}
        </div>
        <CardDescription>Year 1 Summary</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground">Gross Income</p>
            <p>{formatCurrency(results.year1Summary.grossIncome)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Vacancy</p>
            <p>{formatCurrency(results.year1Summary.vacancy)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Expenses</p>
            <p>{formatCurrency(results.year1Summary.expenses)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">NOI</p>
            <p>{formatCurrency(results.year1Summary.noi)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Debt Service</p>
            <p>{formatCurrency(results.year1Summary.debtService)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cash Flow</p>
            <p
              className={
                results.year1Summary.cashFlow >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {formatCurrency(results.year1Summary.cashFlow)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cap Rate</p>
            <p>{formatPercent(results.year1Summary.capRate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">DSCR</p>
            <p>{results.year1Summary.dscr.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cash-on-Cash</p>
            <p>{formatPercent(results.year1Summary.cashOnCash)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderProjectionTable = (results: typeof ltrResults) => (
    <Card>
      <CardHeader>
        <CardTitle>7-Year Projection</CardTitle>
        <CardDescription>
          Detailed financial projections over 7 years
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year</TableHead>
                <TableHead className="text-right">Gross Income</TableHead>
                <TableHead className="text-right">NOI</TableHead>
                <TableHead className="text-right">Debt Service</TableHead>
                <TableHead className="text-right">Cash Flow</TableHead>
                <TableHead className="text-right">Appreciation</TableHead>
                <TableHead className="text-right">Equity</TableHead>
                <TableHead className="text-right">Annual Return</TableHead>
                <TableHead className="text-right">Cumulative Cash</TableHead>
                <TableHead className="text-right">Cumulative Return</TableHead>
                <TableHead className="text-right">Cumulative ROI %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.projections.map((projection) => {
                const cumulativeROI =
                  (projection.cumulativeReturn / results.cashInvested) * 100;
                return (
                  <TableRow key={projection.year}>
                    <TableCell>{projection.year}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.grossIncome)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.noi)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.debtService)}
                    </TableCell>
                    <TableCell
                      className={`text-right ${
                        projection.cashFlow >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(projection.cashFlow)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.appreciation)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.equity)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.annualReturn)}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      {formatCurrency(projection.cumulativeCashFlow)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(projection.cumulativeReturn)}
                    </TableCell>
                    <TableCell className="text-right text-purple-600">
                      {formatPercent(cumulativeROI)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  const renderCharts = (results: typeof ltrResults) => {
    const len = results.projections?.length || 0;
    const timeHorizon: 5 | 7 | 10 | 15 | 30 =
      len >= 30 ? 30 : len >= 15 ? 15 : len >= 10 ? 10 : len >= 7 ? 7 : 5;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CashFlowChart
          projections={results.projections}
          timeHorizon={timeHorizon}
        />
        <EquityChart projections={results.projections} />
        <div className="lg:col-span-2">
          <ROIChart
            projections={results.projections}
            timeHorizon={timeHorizon}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Input
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share Deal
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h1>Deal Analysis: {inputs.address}</h1>
          <p className="text-muted-foreground">
            {inputs.units} unit{inputs.units > 1 ? "s" : ""} •{" "}
            {inputs.totalSqft.toLocaleString()} sqft
            {inputs.unitDetails.length > 0 && (
              <>
                {" "}
                •{" "}
                {inputs.unitDetails
                  .map(
                    (unit, i) => `Unit ${i + 1}: ${unit.beds}bd/${unit.baths}ba`
                  )
                  .join(" • ")}
              </>
            )}
          </p>
        </div>

        <Tabs
          value={selectedStrategy}
          onValueChange={(v) => setSelectedStrategy(v as Strategy)}
          className="space-y-6"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ltr" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Long-Term
            </TabsTrigger>
            <TabsTrigger value="section8" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Section 8
            </TabsTrigger>
            <TabsTrigger value="airbnb" className="flex items-center gap-2">
              <Palmtree className="h-4 w-4" />
              Airbnb
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ltr" className="space-y-6">
            {renderYear1Summary(
              ltrResults,
              "Long-Term Rental",
              <Home className="h-5 w-5" />
            )}
            {renderProjectionTable(ltrResults)}
            {renderCharts(ltrResults)}
          </TabsContent>

          <TabsContent value="section8" className="space-y-6">
            {renderYear1Summary(
              section8Results,
              "Section 8 Rental",
              <Building2 className="h-5 w-5" />
            )}
            {renderProjectionTable(section8Results)}
            {renderCharts(section8Results)}
          </TabsContent>

          <TabsContent value="airbnb" className="space-y-6">
            {renderYear1Summary(
              airbnbResults,
              "Short-Term Rental (Airbnb)",
              <Palmtree className="h-5 w-5" />
            )}
            {renderProjectionTable(airbnbResults)}
            {renderCharts(airbnbResults)}
          </TabsContent>
        </Tabs>

        {/* Comparison Widget */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Strategy Comparison</CardTitle>
            <CardDescription>5-Year Total Return Comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4" />
                  <p>Long-Term Rental</p>
                </div>
                <p className="text-muted-foreground">
                  5-Year Cumulative Return
                </p>
                <p>
                  {formatCurrency(
                    ltrResults.projections[4]?.cumulativeReturn || 0
                  )}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  <p>Section 8</p>
                </div>
                <p className="text-muted-foreground">
                  5-Year Cumulative Return
                </p>
                <p>
                  {formatCurrency(
                    section8Results.projections[4]?.cumulativeReturn || 0
                  )}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Palmtree className="h-4 w-4" />
                  <p>Airbnb</p>
                </div>
                <p className="text-muted-foreground">
                  5-Year Cumulative Return
                </p>
                <p>
                  {formatCurrency(
                    airbnbResults.projections[4]?.cumulativeReturn || 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

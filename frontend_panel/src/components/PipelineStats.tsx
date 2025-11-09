//COMPONENT
import React, { useState, useMemo } from "react";
import {
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Activity,
  Filter,
} from "lucide-react";
import { SavedDeal } from "../types/deal";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface PipelineStatsProps {
  savedDeals: SavedDeal[];
}

type TimeFrame = "today" | "week" | "month" | "custom";

interface DateRange {
  start: Date;
  end: Date;
}

export const PipelineStats: React.FC<PipelineStatsProps> = ({ savedDeals }) => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("month");
  const [customRange, setCustomRange] = useState<DateRange>({
    start: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  // Calculate date range based on timeframe
  const getDateRange = (): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeFrame) {
      case "today":
        return { start: today, end: now };

      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        return { start: weekStart, end: now };

      case "month":
        const monthStart = new Date(today);
        monthStart.setDate(today.getDate() - 30);
        return { start: monthStart, end: now };

      case "custom":
        return customRange;

      default:
        return { start: today, end: now };
    }
  };

  const dateRange = getDateRange();

  // Filter deals by date range - FIXED: Added proper dateField type
  const filterByDate = (
    date: string | undefined,
    dateField: "created" | "stageUpdated" = "created"
  ): boolean => {
    if (!date) return false;
    const dealDate = new Date(date);
    return dealDate >= dateRange.start && dealDate <= dateRange.end;
  };

  // Calculate stats
  const stats = useMemo(() => {
    // Deals created in timeframe
    const dealsCreated = savedDeals.filter((deal) =>
      filterByDate(deal.createdAt || deal.savedAt)
    );

    // FIXED: Use correct DealStage values from your types
    // Deals that reached Stage 5 in timeframe
    const dealsToStage5 = savedDeals.filter(
      (deal) =>
        (deal.dealStage === "stage4-ready-offer" ||
          deal.dealStage === "stage5-offer-submitted") &&
        filterByDate(deal.stageUpdatedAt, "stageUpdated")
    );

    // Deals with max offer calculated in timeframe
    const dealsWithMaxOffer = savedDeals.filter(
      (deal) =>
        deal.maxOffer &&
        deal.maxOffer > 0 &&
        filterByDate(deal.stageUpdatedAt, "stageUpdated")
    );

    // FIXED: Use correct DealStage values
    // Deals currently in Stage 5
    const currentStage5 = savedDeals.filter(
      (deal) =>
        deal.dealStage === "stage4-ready-offer" ||
        deal.dealStage === "stage5-offer-submitted"
    );

    // FIXED: Use correct DealStage values from your types
    // Stage distribution in timeframe
    const stageDistribution = {
      stage1: dealsCreated.filter((d) => d.dealStage === "stage1-basic-data")
        .length,
      stage2: dealsCreated.filter((d) => d.dealStage === "stage2-ready-comps")
        .length,
      stage3: dealsCreated.filter(
        (d) => d.dealStage === "stage3-data-collection"
      ).length,
      stage4: dealsCreated.filter((d) => d.dealStage === "stage4-ready-offer")
        .length,
      stage5: dealsCreated.filter(
        (d) => d.dealStage === "stage5-offer-submitted"
      ).length,
      stage6: dealsCreated.filter(
        (d) =>
          d.dealStage === "stage6-accepted" ||
          d.dealStage === "stage6-rejected" ||
          d.dealStage === "stage6-counter"
      ).length,
      archived: dealsCreated.filter((d) => d.dealStage === "archived").length,
    };

    // FIXED: Use correct DealStage values
    // Average days to reach Stage 5
    const dealsWithStage5Data = savedDeals.filter(
      (deal) =>
        (deal.dealStage === "stage4-ready-offer" ||
          deal.dealStage === "stage5-offer-submitted") &&
        deal.createdAt &&
        deal.stageUpdatedAt
    );

    let avgDaysToStage5 = 0;
    if (dealsWithStage5Data.length > 0) {
      const totalDays = dealsWithStage5Data.reduce((sum, deal) => {
        const created = new Date(deal.createdAt!);
        const stageUpdate = new Date(deal.stageUpdatedAt!);
        const days = Math.floor(
          (stageUpdate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0);
      avgDaysToStage5 = Math.round(totalDays / dealsWithStage5Data.length);
    }

    // Conversion rate (deals created -> deals to Stage 5)
    const conversionRate =
      dealsCreated.length > 0
        ? Math.round((dealsToStage5.length / dealsCreated.length) * 100)
        : 0;

    // Average max offer
    const validMaxOffers = dealsWithMaxOffer
      .map((d) => d.maxOffer!)
      .filter((o) => o > 0);
    const avgMaxOffer =
      validMaxOffers.length > 0
        ? Math.round(
            validMaxOffers.reduce((sum, o) => sum + o, 0) /
              validMaxOffers.length
          )
        : 0;

    return {
      dealsCreated: dealsCreated.length,
      dealsToStage5: dealsToStage5.length,
      dealsWithMaxOffer: dealsWithMaxOffer.length,
      currentStage5: currentStage5.length,
      avgDaysToStage5,
      conversionRate,
      avgMaxOffer,
      stageDistribution,
    };
  }, [savedDeals, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getTimeFrameLabel = () => {
    switch (timeFrame) {
      case "today":
        return "Today";
      case "week":
        return "Last 7 Days";
      case "month":
        return "Last 30 Days";
      case "custom":
        return `${customRange.start.toLocaleDateString()} - ${customRange.end.toLocaleDateString()}`;
      default:
        return "";
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl">
            <Activity className="h-6 w-6" />
            Pipeline Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your deal flow and performance metrics
          </p>
        </div>

        {/* Time Frame Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={timeFrame}
            onValueChange={(value: any) => setTimeFrame(value as TimeFrame)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {timeFrame === "custom" && (
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={customRange.start.toISOString().split("T")[0]}
                onChange={(e) =>
                  setCustomRange({
                    ...customRange,
                    start: new Date(e.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={customRange.end.toISOString().split("T")[0]}
                onChange={(e) =>
                  setCustomRange({
                    ...customRange,
                    end: new Date(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Time Frame Label */}
      <div className="text-center">
        <p className="text-lg font-medium">{getTimeFrameLabel()}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Deals Created */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Deals Created</p>
              <p className="text-3xl font-bold">{stats.dealsCreated}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            New deals added to pipeline
          </p>
        </Card>

        {/* Deals to Stage 5 */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reached Stage 5</p>
              <p className="text-3xl font-bold">{stats.dealsToStage5}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <Target className="h-6 w-6 text-green-600 dark:text-green-300" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ready for max offer
          </p>
        </Card>

        {/* Max Offers Calculated */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Max Offers</p>
              <p className="text-3xl font-bold">{stats.dealsWithMaxOffer}</p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
              <Filter className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Offers calculated
          </p>
        </Card>

        {/* Avg Days to Stage 5 */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Avg Days to Stage 5
              </p>
              <p className="text-3xl font-bold">{stats.avgDaysToStage5}</p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900">
              <Clock className="h-6 w-6 text-orange-600 dark:text-orange-300" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Processing speed</p>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Conversion Rate */}
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Conversion Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{stats.conversionRate}%</p>
              <p className="text-xs text-muted-foreground">
                ({stats.dealsToStage5} / {stats.dealsCreated})
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${stats.conversionRate}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Deals created → Ready for offer
            </p>
          </div>
        </Card>

        {/* Average Max Offer */}
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Avg Max Offer</p>
            <p className="text-3xl font-bold">
              {stats.avgMaxOffer > 0 ? formatCurrency(stats.avgMaxOffer) : "$0"}
            </p>
            <p className="text-xs text-muted-foreground">
              Based on {stats.dealsWithMaxOffer} offers
            </p>
          </div>
        </Card>

        {/* Currently in Stage 5 */}
        <Card className="p-6">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Currently in Stage 5
            </p>
            <p className="text-3xl font-bold">{stats.currentStage5}</p>
            <p className="text-xs text-muted-foreground">
              Active deals ready for offer
            </p>
          </div>
        </Card>
      </div>

      {/* Stage Distribution */}
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Stage Distribution</h3>
        <div className="space-y-3">
          {[
            {
              stage: "stage1",
              label: "Stage 1: Basic Data",
              count: stats.stageDistribution.stage1,
              color: "bg-gray-500",
            },
            {
              stage: "stage2",
              label: "Stage 2: Ready for Comps",
              count: stats.stageDistribution.stage2,
              color: "bg-blue-500",
            },
            {
              stage: "stage3",
              label: "Stage 3: Data Collection",
              count: stats.stageDistribution.stage3,
              color: "bg-cyan-500",
            },
            {
              stage: "stage4",
              label: "Stage 4: Ready for Offer",
              count: stats.stageDistribution.stage4,
              color: "bg-indigo-500",
            },
            {
              stage: "stage5",
              label: "Stage 5: Offer Submitted",
              count: stats.stageDistribution.stage5,
              color: "bg-green-500",
            },
            {
              stage: "stage6",
              label: "Stage 6: Offer Response",
              count: stats.stageDistribution.stage6,
              color: "bg-yellow-500",
            },
            {
              stage: "archived",
              label: "Archived/Closed",
              count: stats.stageDistribution.archived,
              color: "bg-red-500",
            },
          ].map(({ stage, label, count, color }) => {
            const percentage =
              stats.dealsCreated > 0 ? (count / stats.dealsCreated) * 100 : 0;
            return (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">
                    {count} deals ({Math.round(percentage)}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full ${color} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Insights */}
      {stats.dealsCreated > 0 && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50 p-6 dark:bg-blue-950">
          <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
            📊 Insights
          </h3>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            {stats.conversionRate >= 50 && (
              <li>
                ✅ Strong conversion rate - You're efficiently moving deals to
                offer stage
              </li>
            )}
            {stats.conversionRate < 50 && stats.conversionRate > 0 && (
              <li>
                ⚠️ {stats.dealsCreated - stats.dealsToStage5} deals still in
                pipeline - Consider reviewing older deals
              </li>
            )}
            {stats.avgDaysToStage5 > 0 && stats.avgDaysToStage5 <= 3 && (
              <li>
                🚀 Excellent processing speed - Averaging{" "}
                {stats.avgDaysToStage5} days to max offer
              </li>
            )}
            {stats.avgDaysToStage5 > 7 && (
              <li>
                ⏰ Average {stats.avgDaysToStage5} days to Stage 5 - Consider
                streamlining your process
              </li>
            )}
            {stats.dealsWithMaxOffer > 0 && (
              <li>💰 Average max offer: {formatCurrency(stats.avgMaxOffer)}</li>
            )}
            {stats.currentStage5 > 5 && (
              <li>
                🎯 {stats.currentStage5} deals ready for offer - High activity
                pipeline!
              </li>
            )}
          </ul>
        </Card>
      )}

      {/* Empty State */}
      {stats.dealsCreated === 0 && (
        <Card className="p-12 text-center">
          <Activity className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-medium">No deals found</h3>
          <p className="text-sm text-muted-foreground">
            No deals were created in the selected timeframe. Try adjusting your
            date range.
          </p>
        </Card>
      )}
    </div>
  );
};

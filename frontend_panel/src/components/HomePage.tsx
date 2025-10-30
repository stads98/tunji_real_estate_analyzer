import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Building2, FileText, Settings, Zap, Download } from "lucide-react";

interface HomePageProps {
  onNavigate: (
    page: "home" | "new-deal" | "saved-deals" | "assumptions" | "quick-screen"
  ) => void;
  onLoadSampleDeals?: () => void;
}

export function HomePage({ onNavigate, onLoadSampleDeals }: HomePageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="mb-4">Deal Analyzer Dashboard</h1>
          <p className="text-muted-foreground">
            Analyze single-family and small multifamily deals across multiple
            rental strategies
          </p>
          {onLoadSampleDeals && (
            <div className="mt-4">
              <Button
                onClick={onLoadSampleDeals}
                variant="outline"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 border-none"
              >
                <Download className="mr-2 h-4 w-4" />
                Load 5 Sample Deals (Broward County)
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate("new-deal")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>New Deal</CardTitle>
                  <CardDescription>
                    Analyze a new property investment
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Input property details and compare Long-Term Rental, Section 8,
                and Airbnb strategies
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate("quick-screen")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Quick Screen</CardTitle>
                  <CardDescription>Fast deal screening tool</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Quickly evaluate multiple properties with cap rate and cash flow
                filters
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate("saved-deals")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Saved Deals</CardTitle>
                  <CardDescription>
                    View your analyzed properties
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access previously saved deals and comparisons
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onNavigate("assumptions")}
          >
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Settings className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Assumptions</CardTitle>
                  <CardDescription>Configure default settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set global defaults for vacancy, maintenance, appreciation, and
                more
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                1
              </div>
              <p>
                Click "New Deal" to input property details and financing
                information
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                2
              </div>
              <p>
                Review detailed projections for Long-Term Rental, Section 8, and
                Airbnb strategies
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                3
              </div>
              <p>
                Compare strategies side-by-side to find the best investment
                approach
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

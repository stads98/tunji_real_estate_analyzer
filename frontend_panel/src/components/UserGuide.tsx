import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Home, TrendingUp, Calculator, FileText, MessageSquare, Star, Search, Download, Upload, Filter, ChevronDown, Building2, Palmtree, Activity, Calendar } from 'lucide-react';

export function UserGuide() {
  return (
    <div className="max-w-[1200px] mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1>📚 Real Estate Deal Analyzer - Complete User Guide</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know to analyze deals, track your pipeline, and collaborate with your team.
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            🚀 Quick Start - Adding Your First Deal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2">Method 1: Zillow Quick Start (Fastest)</h3>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Go to any Zillow listing (For Sale or Off-Market)</li>
              <li>Copy the entire page (Ctrl+A, then Ctrl+C)</li>
              <li>Click the "Zillow Quick Start" button in the app</li>
              <li>Paste the data and click "Parse & Start Deal"</li>
              <li>The app automatically fills in: address, price, beds/baths, square footage, year built, days on market, and estimates property taxes & insurance</li>
            </ol>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="mb-2">Method 2: Manual Entry</h3>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Fill in the property details manually in the Overview tab</li>
              <li>Address, units, purchase price, and property details</li>
              <li>The app auto-calculates property taxes (2.0% for Broward County) and insurance based on year built</li>
            </ol>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <strong>💡 Pro Tip:</strong> The app detects duplicate addresses. If you try to add the same property twice, it will load the existing deal instead.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Deal Stages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            📊 Understanding Deal Stages
          </CardTitle>
          <CardDescription>Your deal pipeline workflow from initial data to final outcome</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-3">Active Stages (1-5) - Deals in Progress</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="bg-gray-100 border-gray-300 text-gray-700 shrink-0">Stage 1</Badge>
                <div>
                  <div className="font-semibold">Needs Basic Data</div>
                  <p className="text-sm text-muted-foreground">Just added the property. Need to fill in address, units, and purchase price.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-blue-100 border-blue-300 text-blue-700 shrink-0">Stage 2</Badge>
                <div>
                  <div className="font-semibold">Adding Comps & Pictures</div>
                  <p className="text-sm text-muted-foreground">Basic info is complete. Ready to add comparable sales (comps) and property photos. Use the ARV Calculator tab.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-purple-100 border-purple-300 text-purple-700 shrink-0">Stage 3</Badge>
                <div>
                  <div className="font-semibold">Speaking to Realtor</div>
                  <p className="text-sm text-muted-foreground">Called the realtor. Now collecting detailed notes about the property and seller motivation.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-orange-100 border-orange-300 text-orange-700 shrink-0">Stage 4</Badge>
                <div>
                  <div className="font-semibold">Filling Out Rehab Info</div>
                  <p className="text-sm text-muted-foreground">Completing rehab estimates and scope of work. Use the Rehab Estimate tab to document condition and costs.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-indigo-100 border-indigo-300 text-indigo-700 shrink-0">Stage 5</Badge>
                <div>
                  <div className="font-semibold">Ready for Max Offer</div>
                  <p className="text-sm text-muted-foreground">All analysis complete! Ready to calculate max offer and submit to seller. System automatically tracks "Days on Zillow" when you reach this stage.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3">Outcome Stages (6) - Final Results</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge className="bg-green-100 border-green-300 text-green-700 shrink-0">Accepted</Badge>
                <div>
                  <div className="font-semibold">Offer Accepted</div>
                  <p className="text-sm text-muted-foreground">Seller verbally accepted your offer. Deal is under contract! 🎉</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-red-100 border-red-300 text-red-700 shrink-0">Rejected</Badge>
                <div>
                  <div className="font-semibold">Offer Rejected</div>
                  <p className="text-sm text-muted-foreground">Seller rejected your offer. Time to move on to the next deal.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Badge className="bg-amber-100 border-amber-300 text-amber-700 shrink-0">Counter</Badge>
                <div>
                  <div className="font-semibold">Counter-Offer</div>
                  <p className="text-sm text-muted-foreground">Seller countered your offer. You need to respond - accept, reject, or counter back.</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-3">Archived</h3>
            <div className="flex items-start gap-3">
              <Badge className="bg-slate-50 border-slate-200 text-slate-500 shrink-0">Archived</Badge>
              <div>
                <div className="font-semibold">Archived Deal</div>
                <p className="text-sm text-muted-foreground">Deal closed, fell through, or you're no longer pursuing it. Keeps your active pipeline clean.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm">
              <strong>💡 How to Change Stages:</strong> Click any saved deal to load it, then use the dropdown menu at the top to change its stage. The timestamp automatically updates so you know when it was last moved.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filtering & Organizing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            🔍 Filtering & Organizing Your Deals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2">Main Filter Buttons</h3>
            <div className="space-y-2 ml-2">
              <div><strong>All Deals:</strong> Shows every deal you've saved</div>
              <div><strong>Active (1-5):</strong> Shows only deals in stages 1-5 (your working pipeline)</div>
              <div><strong>Outcomes (6):</strong> Shows only deals with final outcomes (accepted/rejected/counter)</div>
              <div><strong>Archived:</strong> Shows only archived deals</div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">Expandable Stage Drill-Down</h3>
            <p className="text-sm mb-2">Click the <ChevronDown className="h-3 w-3 inline" /> chevron icon on "Active (1-5)" or "Outcomes (6)" to see individual stage buttons.</p>
            <div className="ml-2 space-y-2">
              <div><strong>Active Stages:</strong> Filter by specific stage (1. Basic Data, 2. Need Comps, 3. Collecting, 4. Ready, 5. Submitted)</div>
              <div><strong>Outcome Stages:</strong> Filter by specific outcome (Accepted, Rejected, Counter)</div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">Sorting the Table</h3>
            <p className="text-sm">Click any column header to sort:</p>
            <div className="ml-2 mt-2 grid grid-cols-2 gap-2 text-sm">
              <div><strong>Address:</strong> Alphabetical</div>
              <div><strong>Max Offer:</strong> Your target offer price (highlighted in gold)</div>
              <div><strong>Price:</strong> Listing/asking price</div>
              <div><strong>Units:</strong> Number of units</div>
              <div><strong>LTR CF:</strong> Long-Term Rental monthly cash flow</div>
              <div><strong>DSCR:</strong> Debt Service Coverage Ratio (lender metric)</div>
              <div><strong>S8 CF:</strong> Section 8 monthly cash flow</div>
              <div><strong>STR CF:</strong> Short-Term Rental (Airbnb) monthly cash flow</div>
              <div><strong>Best:</strong> Best strategy based on 5-year ROI</div>
              <div><strong>Days:</strong> Days on Zillow (color-coded urgency)</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm">
              <strong>🎨 Visual Cues:</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Fresh Listings (0-3 days):</strong> Green highlight - act fast!</li>
              <li><strong>Current Deal:</strong> Blue highlight - the deal you're viewing</li>
              <li><strong>🔶 OFF MARKET Badge:</strong> Orange gradient badge for pocket listings</li>
              <li><strong>Stage Badges:</strong> Color-coded by stage for quick visual scanning</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Investment Strategies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            🏠 Investment Strategies Explained
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 flex items-center gap-2"><Home className="h-4 w-4" /> Long-Term Rental (LTR)</h3>
            <p className="text-sm text-muted-foreground">
              Traditional rental to long-term tenants. Most stable, least work. The app uses Zillow Rent Zestimate or your manual input for market rent.
            </p>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2"><Building2 className="h-4 w-4" /> Section 8</h3>
            <p className="text-sm text-muted-foreground">
              Government-subsidized housing. Rent is guaranteed by the government, often higher than market rent. The app includes 2025 payment standards for Broward County zip codes and auto-populates based on bedrooms and property address.
            </p>
          </div>

          <div>
            <h3 className="mb-2 flex items-center gap-2"><Palmtree className="h-4 w-4" /> Short-Term Rental (STR/Airbnb)</h3>
            <p className="text-sm text-muted-foreground">
              Rent by the night on Airbnb/VRBO. Highest potential income but most work and highest expenses. Enter your annual revenue from AirDNA (already accounts for vacancy). Add annual operating expenses separately.
            </p>
          </div>

          <div>
            <h3 className="mb-2">🔨 BRRRR (Buy, Rehab, Rent, Refinance, Repeat)</h3>
            <p className="text-sm text-muted-foreground">
              Buy a distressed property, renovate it, rent it out, then refinance to pull your money back out. Enable "Renovation/Rehab Project" in the Overview tab to access bridge loan calculations and the Rehab Estimate tab.
            </p>
          </div>

          <Separator />

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm">
              <strong>🏆 Best Strategy Badge:</strong> The app automatically highlights which strategy has the highest Year 1 Cash-on-Cash ROI based on your initial capital investment.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            📈 Understanding Key Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2">Monthly Cash Flow</h3>
            <p className="text-sm text-muted-foreground">
              How much money you pocket each month after all expenses (mortgage, insurance, taxes, maintenance, etc.). Positive = profit, Negative = out of pocket.
            </p>
          </div>

          <div>
            <h3 className="mb-2">DSCR (Debt Service Coverage Ratio)</h3>
            <p className="text-sm text-muted-foreground">
              A lender metric. <strong>DSCR = Net Operating Income ÷ Debt Service</strong>
            </p>
            <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
              <li><strong>DSCR ≥ 1.25:</strong> Great! Most lenders will approve</li>
              <li><strong>DSCR 1.0-1.25:</strong> Borderline. Some lenders will approve</li>
              <li><strong>DSCR &lt; 1.0:</strong> Property doesn't generate enough income to cover debt. Most lenders will reject</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2">Cash-on-Cash ROI</h3>
            <p className="text-sm text-muted-foreground">
              Year 1 return on your actual cash invested. <strong>= Annual Cash Flow ÷ Total Cash Invested</strong>. Example: If you invest $50K and get $5K/year in cash flow, that's a 10% Cash-on-Cash ROI.
            </p>
          </div>

          <div>
            <h3 className="mb-2">Total ROI (Annualized)</h3>
            <p className="text-sm text-muted-foreground">
              Includes cash flow + appreciation + equity paydown - expenses, divided by years. This is your total return including equity buildup.
            </p>
          </div>

          <div>
            <h3 className="mb-2">Max Offer (⭐ Gold Star)</h3>
            <p className="text-sm text-muted-foreground">
              The highest price you should offer based on your target DSCR (default 1.25). Lock this in when you're ready to make an offer. The app calculates this by working backwards from the DSCR you need.
            </p>
          </div>

          <Separator />

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <strong>🎯 Realistic vs Lender Projections:</strong> Toggle between two modes. Realistic mode uses 3% appreciation and realistic vacancy/expenses. Lender mode uses 0% appreciation (more conservative for loan qualification).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>🗂️ Main Dashboard Tabs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2">Overview & Analysis</h3>
            <p className="text-sm text-muted-foreground mb-2">Your main workspace. Contains:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Property Details:</strong> Address, price, units, beds/baths, sqft, year built</li>
              <li><strong>Loan Details:</strong> Interest rate, term, down payment</li>
              <li><strong>Strategy Results:</strong> Side-by-side comparison of LTR, Section 8, and Airbnb</li>
              <li><strong>Saved Deals Table:</strong> All your saved properties with filtering and sorting</li>
              <li><strong>Multi-Year Projections:</strong> Cash flow, equity, and ROI over 5-30 years</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2">Rehab Estimate</h3>
            <p className="text-sm text-muted-foreground mb-2">Document property condition and estimate renovation costs:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Overall Condition:</strong> Turnkey, Cosmetic, Moderate, Heavy, Gut</li>
              <li><strong>Motivation Indicators:</strong> Why seller might accept below asking</li>
              <li><strong>Line Item Scope:</strong> Detailed breakdown of every repair (roof, HVAC, kitchen, etc.)</li>
              <li><strong>Intelligent Estimates:</strong> Auto-suggests cost ranges based on condition and sqft</li>
              <li><strong>Photos:</strong> Document current condition with before photos</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2">ARV Calculator</h3>
            <p className="text-sm text-muted-foreground mb-2">Calculate After Repair Value using comparable sales:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Subject Property:</strong> Your property details and photos</li>
              <li><strong>Zillow Comp Parser:</strong> Paste Zillow SOLD listings to auto-populate comps</li>
              <li><strong>Manual Comps:</strong> Add comparable sales with price, beds/baths, sqft, sold date</li>
              <li><strong>Map View:</strong> See your property and comps on an interactive map</li>
              <li><strong>Auto-Calculate ARV:</strong> Averages comparable sales adjusted for sqft differences</li>
              <li><strong>Bridge Loan Integration:</strong> ARV automatically updates Bridge Loan tab calculations</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2">Team Notes</h3>
            <p className="text-sm text-muted-foreground mb-2">Collaborate with your partner (Dan & Eman):</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Color-Coded Authors:</strong> Dan (blue) and Eman (purple) badges make it easy to see who wrote what</li>
              <li><strong>Pin Important Notes:</strong> Keep critical info at the top with the pin icon</li>
              <li><strong>Date Filtering:</strong> Filter notes by Today, This Week, This Month, or All Time to focus on recent activity</li>
              <li><strong>Timestamps:</strong> See when each note was added with automatic date/time stamps</li>
              <li><strong>Deal-Specific Comments:</strong> Use inline deal notes for property-specific items</li>
              <li><strong>General Team Notes:</strong> Use Team Notes tab for general coordination and strategy discussions</li>
              <li><strong>System Notes:</strong> Automatic tracking when deals reach Stage 5 showing days in pipeline and days on Zillow</li>
            </ul>
          </div>
          
          <div>
            <h3 className="mb-2">Pipeline Stats</h3>
            <p className="text-sm text-muted-foreground mb-2">Track your deal flow and performance metrics:</p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>Time Periods:</strong> Analyze by Today, Last 7 Days, Last 30 Days, or Custom date range</li>
              <li><strong>Key Metrics:</strong> Deals Created, Reached Stage 5, Max Offers, Avg Days to Stage 5</li>
              <li><strong>Conversion Tracking:</strong> See what % of created deals reach max offer stage</li>
              <li><strong>Stage Distribution:</strong> Visual breakdown of all 9 pipeline stages</li>
              <li><strong>Smart Insights:</strong> Automatic suggestions on conversion rates, processing speed, and pipeline health</li>
              <li><strong>Performance Monitoring:</strong> Track average max offer amounts and active deal counts</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Days on Market */}
      <Card>
        <CardHeader>
          <CardTitle>⏰ Days on Market (Urgency System)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The app automatically tracks days on market from Zillow and updates daily. Visual color coding helps you prioritize hot deals:
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600 text-white shrink-0">0-3 days</Badge>
              <span className="text-sm">🔥 HOT - Brand new listing, act fast! Entire row highlights in green.</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white shrink-0">4-7 days</Badge>
              <span className="text-sm">Fresh - Good opportunity, still relatively new</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-gray-600 text-white shrink-0">8-30 days</Badge>
              <span className="text-sm">Normal - Standard listing age</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-600 text-white shrink-0">31+ days</Badge>
              <span className="text-sm">Stale - Been on market a while, potential negotiation leverage</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-orange-600 to-orange-500 text-white shrink-0 font-bold">OFF MARKET</Badge>
              <span className="text-sm">🔶 Not listed publicly (pocket listings, wholesales, FSBOs)</span>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 font-semibold">🤖 Automatic Tracking at Stage 5</h3>
            <p className="text-sm text-muted-foreground">
              When you move a deal to Stage 5 (Ready for Max Offer), the system automatically creates a Team Note showing:
            </p>
            <ul className="text-sm mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Days in Pipeline:</strong> How many days since you first added the deal</li>
              <li><strong>Days on Zillow:</strong> How long the property has been listed (if available)</li>
              <li><strong>Context Badge:</strong> Visual indicator showing your processing speed</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              This helps you track how quickly you're analyzing deals and identify opportunities that need urgent attention.
            </p>
          </div>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm">
              <strong>⚡ Auto-Update:</strong> Days on market updates automatically every day based on the listing date. You don't need to manually update it!
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Pipeline Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            📊 Pipeline Analytics & Stats
          </CardTitle>
          <CardDescription>Track your deal flow and performance metrics over time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2">What is Pipeline Stats?</h3>
            <p className="text-sm text-muted-foreground">
              A dedicated analytics dashboard that shows your deal pipeline performance. Access it from the main navigation tabs next to Team Notes.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 flex items-center gap-2"><Calendar className="h-4 w-4" /> Time Period Filters</h3>
            <div className="space-y-2 ml-2">
              <div><strong>Today:</strong> See what happened in the last 24 hours</div>
              <div><strong>Last 7 Days:</strong> Weekly performance snapshot for team meetings</div>
              <div><strong>Last 30 Days:</strong> Monthly overview (default view)</div>
              <div><strong>Custom Range:</strong> Pick any start/end dates to analyze specific periods</div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">📈 Key Metrics Tracked</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-2">
              <div>
                <p className="font-semibold text-sm">Deals Created</p>
                <p className="text-sm text-muted-foreground">New deals added to your pipeline</p>
              </div>
              <div>
                <p className="font-semibold text-sm">Reached Stage 5</p>
                <p className="text-sm text-muted-foreground">Deals ready for max offer</p>
              </div>
              <div>
                <p className="font-semibold text-sm">Max Offers Calculated</p>
                <p className="text-sm text-muted-foreground">Number of offers prepared</p>
              </div>
              <div>
                <p className="font-semibold text-sm">Avg Days to Stage 5</p>
                <p className="text-sm text-muted-foreground">Your processing speed metric</p>
              </div>
              <div>
                <p className="font-semibold text-sm">Conversion Rate</p>
                <p className="text-sm text-muted-foreground">% of deals reaching offer stage</p>
              </div>
              <div>
                <p className="font-semibold text-sm">Average Max Offer</p>
                <p className="text-sm text-muted-foreground">Dollar amount across all offers</p>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">📊 Stage Distribution Chart</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Visual breakdown showing how many deals are in each of the 9 pipeline stages with:
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>Progress bars showing percentage distribution</li>
              <li>Deal counts for each stage</li>
              <li>Color-coded by stage type (Active, Outcomes, Archived)</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">💡 Smart Insights</h3>
            <p className="text-sm text-muted-foreground mb-2">
              The system automatically analyzes your metrics and provides actionable insights:
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li><strong>✅ Strong conversion rate:</strong> When 50%+ of deals reach Stage 5</li>
              <li><strong>⚠️ Pipeline warnings:</strong> Alerts for deals stuck in early stages</li>
              <li><strong>🚀 Processing speed:</strong> Recognition for fast deal analysis (≤3 days)</li>
              <li><strong>⏰ Improvement areas:</strong> Suggestions when processing takes 7+ days</li>
              <li><strong>🎯 High activity:</strong> Notifications when you have 5+ deals in Stage 5</li>
            </ul>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm">
              <strong>💡 Pro Tip:</strong> Use Pipeline Stats in your weekly review with Eman. Check "Last 7 Days" to see your progress and identify bottlenecks. Use Custom Range to compare before/after when you change your process.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            💾 Saving, Exporting & Backing Up
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2">Saving Deals</h3>
            <p className="text-sm text-muted-foreground">
              Click "Save Deal" button. Deals are saved to your browser's local storage. Each deal includes all data: inputs, calculations, notes, photos, ARV comps, and current stage.
            </p>
          </div>

          <div>
            <h3 className="mb-2">Updating Existing Deals</h3>
            <p className="text-sm text-muted-foreground">
              Load a deal from the table, make changes, click "Update Deal". The deal is updated with a new timestamp.
            </p>
          </div>

          <div>
            <h3 className="mb-2">Download All Deals (Backup)</h3>
            <p className="text-sm text-muted-foreground">
              Exports all deals to a JSON file with timestamp. <strong>Includes photos</strong> as base64 data. File size shown in MB at top of table. <strong>ALWAYS backup before clearing!</strong>
            </p>
          </div>

          <div>
            <h3 className="mb-2">Upload Deals (Restore)</h3>
            <p className="text-sm text-muted-foreground">
              Import previously exported JSON file. The app automatically merges with existing deals (no duplicates) and migrates old data formats to the latest version.
            </p>
          </div>

          <div>
            <h3 className="mb-2">Strip Photos</h3>
            <p className="text-sm text-muted-foreground">
              Removes all photos from deals to free up storage space. Deal data and calculations are preserved. Useful if you're hitting browser storage limits (typically ~5MB).
            </p>
          </div>

          <div>
            <h3 className="mb-2">Clear All Deals</h3>
            <p className="text-sm text-muted-foreground text-red-600">
              ⚠️ Permanently deletes ALL deals. Cannot be undone. Always download a backup first!
            </p>
          </div>

          <Separator />

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm">
              <strong>⚠️ IMPORTANT:</strong> Your data is stored in your browser only. If you clear browser data or use a different computer, your deals will be gone unless you have a backup. Download backups regularly!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips & Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Tips & Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h3 className="mb-2">🎯 Workflow Tips</h3>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li><strong>Start with Zillow Quick Start:</strong> Fastest way to add deals</li>
              <li><strong>Use Stages to Track Progress:</strong> Move deals through stages as you collect data</li>
              <li><strong>Filter by Active (1-5):</strong> Focus on deals you're actively working</li>
              <li><strong>Sort by Days on Market:</strong> Prioritize fresh listings (0-3 days = green highlight)</li>
              <li><strong>Watch Auto-Generated Notes:</strong> System creates tracking notes when you reach Stage 5</li>
              <li><strong>Lock Max Offer:</strong> Set your target offer price when ready</li>
              <li><strong>Check Pipeline Stats Weekly:</strong> Review metrics with your partner to optimize process</li>
              <li><strong>Download Backups Weekly:</strong> Protect your data</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">🔍 Analysis Tips</h3>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li><strong>Compare All 3 Strategies:</strong> Don't assume LTR is best - check Section 8 and Airbnb</li>
              <li><strong>Watch DSCR:</strong> Below 1.0 means it won't qualify for most loans</li>
              <li><strong>Use ARV Calculator:</strong> Critical for BRRRR deals to know refinance amount</li>
              <li><strong>Document Everything:</strong> Use Rehab Estimate tab to track property condition</li>
              <li><strong>Add Photos:</strong> Visual reference helps 6 months later</li>
              <li><strong>Check "Best" Strategy:</strong> Based on Year 1 Cash-on-Cash ROI</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">👥 Team Collaboration (Dan & Eman)</h3>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li><strong>Use Team Notes Tab:</strong> Coordinate with your partner on general items</li>
              <li><strong>Pin Important Notes:</strong> Keep critical info visible at the top</li>
              <li><strong>Filter by Date:</strong> Use "This Week" filter before team meetings to review recent activity</li>
              <li><strong>Watch System Notes:</strong> Automatic tracking when deals reach Stage 5 shows days in pipeline</li>
              <li><strong>Deal-Specific Comments:</strong> Add property-specific notes inline on each deal</li>
              <li><strong>Share Backups:</strong> Export and share JSON files with your team</li>
              <li><strong>Stage Updates:</strong> Move deals through stages so your partner knows progress</li>
              <li><strong>Review Pipeline Stats:</strong> Check weekly metrics together to optimize your workflow</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2">⚡ Performance Tips</h3>
            <ul className="text-sm space-y-2 ml-4 list-disc">
              <li><strong>Watch Storage:</strong> Keep eye on MB usage at top of table</li>
              <li><strong>Compress Photos:</strong> App auto-compresses on save, but large originals take time</li>
              <li><strong>Archive Old Deals:</strong> Move closed/dead deals to Archived stage</li>
              <li><strong>Strip Photos if Needed:</strong> Last resort to free up space</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Common Questions */}
      <Card>
        <CardHeader>
          <CardTitle>❓ Common Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-1">Why is my DSCR below 1.0?</h3>
            <p className="text-sm text-muted-foreground">
              The property doesn't generate enough income to cover the debt payment. Try: lower purchase price, higher down payment, get better rent comps, or look for a different property.
            </p>
          </div>

          <div>
            <h3 className="mb-1">What's a good Cash-on-Cash ROI?</h3>
            <p className="text-sm text-muted-foreground">
              8-12% is solid. 12-18% is great. 18%+ is excellent. Below 6% might not be worth your time/risk.
            </p>
          </div>

          <div>
            <h3 className="mb-1">Should I trust Section 8 numbers?</h3>
            <p className="text-sm text-muted-foreground">
              The app uses official 2025 payment standards for Broward County. However, verify with local housing authority as some neighborhoods may have different limits.
            </p>
          </div>

          <div>
            <h3 className="mb-1">Why doesn't Airbnb strategy always show higher income?</h3>
            <p className="text-sm text-muted-foreground">
              Airbnb has much higher operating expenses (cleaning, utilities, maintenance, turnover, etc.). Enter your annual expenses from AirDNA. The revenue input already accounts for vacancy.
            </p>
          </div>

          <div>
            <h3 className="mb-1">What's the difference between "Realistic" and "Lender" projections?</h3>
            <p className="text-sm text-muted-foreground">
              Realistic uses 3% appreciation and realistic vacancy/expenses. Lender mode uses 0% appreciation (conservative) for loan qualification purposes.
            </p>
          </div>

          <div>
            <h3 className="mb-1">How do I use the ARV Calculator?</h3>
            <p className="text-sm text-muted-foreground">
              Go to Zillow, search for SOLD properties near yours, copy entire page, paste into ARV Calculator comp form. The app extracts address, price, beds/baths, sqft, and sold date. Add 3-5 comps for accurate ARV.
            </p>
          </div>

          <div>
            <h3 className="mb-1">Can I access my deals on another computer?</h3>
            <p className="text-sm text-muted-foreground">
              No - data is stored locally in your browser. But you can Download All Deals, transfer the JSON file, and Upload Deals on the other computer.
            </p>
          </div>

          <div>
            <h3 className="mb-1">What happens if I clear my browser data?</h3>
            <p className="text-sm text-muted-foreground">
              ⚠️ All deals will be LOST. Download backups regularly! Keep the JSON files safe.
            </p>
          </div>

          <div>
            <h3 className="mb-1">How do I use Pipeline Stats effectively?</h3>
            <p className="text-sm text-muted-foreground">
              Set a custom date range to compare performance week-over-week or month-over-month. Watch your "Avg Days to Stage 5" metric to optimize your deal analysis process. Use it in weekly team reviews to identify bottlenecks.
            </p>
          </div>

          <div>
            <h3 className="mb-1">What's the "Days on Zillow" tracking in Team Notes?</h3>
            <p className="text-sm text-muted-foreground">
              When you move a deal to Stage 5 (Ready for Max Offer), the system automatically creates a note showing how long the property has been on Zillow and how many days it's been in your pipeline. This helps you track urgency and processing speed.
            </p>
          </div>

          <div>
            <h3 className="mb-1">How do I filter Team Notes by date?</h3>
            <p className="text-sm text-muted-foreground">
              In the Team Notes tab, use the date filter buttons at the top: Today, This Week, This Month, or All Time. Perfect for weekly reviews to see only recent activity.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground mt-8 pb-4">
        <p>💼 Built for real estate investors in Broward County, FL</p>
        <p className="mt-1">Questions? Reach out to Dan or Eman</p>
      </div>
    </div>
  );
}

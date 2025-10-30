import { DealInputs } from "../types/deal";
import { formatCurrency } from "./calculations";

export interface RehabExitScenario {
  exitType: "sell" | "refi";
  totalCashInvested: number;
  rehabCarryingCosts: number;
  entryPointsCost: number;
  exitPointsCost: number;

  // For Sell scenario
  saleProceeds?: number;
  sellingCosts?: number;
  netProfit?: number;

  // For Refi scenario (BRRRR)
  newLoanAmount?: number;
  cashOutAmount?: number;
  capitalLeftInDeal?: number; // Total invested - cash recovered
  equityRetained?: number; // ARV - new loan
  newMonthlyPayment?: number;
  newAnnualDebtService?: number;

  // Add fundsGap property
  fundsGap?: number; // Positive = shortfall, Negative = surplus
}

export function calculateRehabScenarios(inputs: DealInputs): {
  sellScenario: RehabExitScenario;
  refiScenario: RehabExitScenario;
} {
  // Calculate acquisition costs (use editable amount or calculate from percentage - default 5%)
  const acquisitionCostsAmount =
    inputs.acquisitionCostsAmount ?? inputs.purchasePrice * 0.05;

  // Total project cost = purchase + rehab
  const totalProjectCost = inputs.purchasePrice + inputs.rehabCost;

  // Calculate bridge loan based on LTC % and Financed Rehab Budget %
  // Bridge loan = (Purchase × LTC%) + (Rehab × Financed Rehab Budget %)
  const purchaseLoan = inputs.purchasePrice * (inputs.bridgeLTC / 100);
  const rehabLoan = inputs.rehabCost * (inputs.bridgeRehabBudgetPercent / 100);
  const hardMoneyLoanAmount = purchaseLoan + rehabLoan;

  // Calculate bridge loan acquisition costs (deducted from loan proceeds)
  // Use editable amount if provided, otherwise calculate as 6% of purchase price (1% higher than standard due to bridge loan costs)
  const entryPointsCost =
    inputs.bridgeSettlementCharges ?? inputs.purchasePrice * 0.06;

  // Down payment = what you pay cash upfront
  // Lender deducts origination fee from loan proceeds, so actual cash received = Bridge loan - Origination
  // Down payment = Total cost - (Bridge loan - Origination fee)
  const downPaymentAmount =
    totalProjectCost - (hardMoneyLoanAmount - entryPointsCost);

  // Calculate carrying costs during rehab (interest, taxes, insurance)
  // During rehab, property is at PURCHASE PRICE value, not ARV
  // So we calculate taxes/insurance based on purchase price, not the post-repair ARV values

  // Interest on the full hard money loan during rehab period
  const monthlyRehabInterest =
    hardMoneyLoanAmount * (inputs.rehabFinancingRate / 100 / 12);

  // Property taxes during rehab: 2.0% of purchase price for Broward investment properties
  const preRepairTaxes = inputs.purchasePrice * 0.02; // Annual

  // Property insurance during rehab: Calculate based on purchase price sqft and property age
  const preRepairInsurance =
    inputs.totalSqft && inputs.totalSqft > 0
      ? (() => {
          // Use same logic as insuranceCalculator but for purchase price
          const currentYear = new Date().getFullYear();
          const age = currentYear - inputs.yearBuilt;
          let baseRatePerSqft: number;

          if (age <= 5) baseRatePerSqft = 2.5;
          else if (age <= 15) baseRatePerSqft = 3.0;
          else if (age <= 30) baseRatePerSqft = 3.5;
          else if (age <= 50) baseRatePerSqft = 4.25;
          else baseRatePerSqft = 5.0;

          return Math.round((inputs.totalSqft * baseRatePerSqft) / 50) * 50;
        })()
      : inputs.purchasePrice * 0.012; // Fallback: 1.2% of purchase price (mid-range for 20-30 year old property)

  const monthlyTaxesInsurance = (preRepairTaxes + preRepairInsurance) / 12;
  const rehabCarryingCosts =
    (monthlyRehabInterest + monthlyTaxesInsurance) * inputs.rehabMonths;

  // Total cash invested (down payment + carrying costs)
  // NOTE: Down payment already includes the origination fee (it's deducted from loan proceeds, not separate cash)
  // NOTE: Rehab cost is NOT included as it's 100% financed by hard money lender
  // NOTE: Acquisition costs NOT included - seller pays when you buy, and 8% selling costs cover all exit costs
  const totalCashInvested = downPaymentAmount + rehabCarryingCosts;

  // ===== SELL SCENARIO =====
  const sellingCostsAmount =
    inputs.afterRepairValue * (inputs.sellClosingCosts / 100);
  const totalDebtToPayoff = hardMoneyLoanAmount; // Full hard money loan (purchase + rehab)
  // No exit points when selling - just selling costs (agent fees, etc.)
  const saleProceeds =
    inputs.afterRepairValue - sellingCostsAmount - totalDebtToPayoff;
  const netProfit = saleProceeds - totalCashInvested;

  const sellScenario: RehabExitScenario = {
    exitType: "sell",
    totalCashInvested,
    rehabCarryingCosts,
    entryPointsCost,
    exitPointsCost: 0, // No exit points when selling
    saleProceeds,
    sellingCosts: sellingCostsAmount,
    netProfit,
    fundsGap: 0, // No funds gap concept for sell scenario
  };

  // ===== REFI SCENARIO (BRRRR) =====
  // Refinance at user-specified LTV % of ARV (default 75%)
  const newLoanAmount = inputs.afterRepairValue * (inputs.exitRefiLTV / 100);

  // DSCR Acquisition Costs (prepopulates at 5% of ARV but editable)
  const dscrAcquisitionCosts =
    inputs.dscrAcquisitionCosts ?? inputs.afterRepairValue * 0.05;

  // Cash you get back from refi (after paying off hard money loan and DSCR acquisition costs)
  const cashOutAmount =
    newLoanAmount - totalDebtToPayoff - dscrAcquisitionCosts;

  // Capital left in the deal = Total invested - Cash recovered
  const capitalLeftInDeal = totalCashInvested - cashOutAmount;

  // Funds Gap = Positive means shortfall, Negative means surplus
  const fundsGap = capitalLeftInDeal;

  // Equity in the property = ARV - New Loan
  const equityRetained = inputs.afterRepairValue - newLoanAmount;

  // Calculate new monthly payment based on new loan using EXIT REFI RATE
  const monthlyRate = inputs.exitRefiRate / 100 / 12;
  const numPayments = inputs.loanTerm * 12;
  const newMonthlyPayment =
    (newLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const newAnnualDebtService = newMonthlyPayment * 12;

  const refiScenario: RehabExitScenario = {
    exitType: "refi",
    totalCashInvested,
    rehabCarryingCosts,
    entryPointsCost,
    exitPointsCost: dscrAcquisitionCosts, // 5% DSCR acquisition costs (of ARV)
    newLoanAmount,
    cashOutAmount,
    newMonthlyPayment,
    newAnnualDebtService,
    capitalLeftInDeal,
    equityRetained,
    fundsGap, // Add funds gap calculation
  };

  return {
    sellScenario,
    refiScenario,
  };
}

export function formatRehabSummary(scenario: RehabExitScenario): string {
  if (scenario.exitType === "sell") {
    return `
      Total Cash in Deal: ${formatCurrency(scenario.totalCashInvested)}
      Sale Price (ARV): ${formatCurrency(
        scenario.saleProceeds! + scenario.totalCashInvested
      )}
      Net Profit: ${formatCurrency(scenario.netProfit!)}
      ROI: ${((scenario.netProfit! / scenario.totalCashInvested) * 100).toFixed(
        2
      )}%
    `;
  } else {
    return `
      Total Cash in Deal: ${formatCurrency(scenario.totalCashInvested)}
      Cash Out on Refi: ${formatCurrency(scenario.cashOutAmount!)}
      New Loan Amount: ${formatCurrency(scenario.newLoanAmount!)}
      New Monthly Payment: ${formatCurrency(scenario.newMonthlyPayment!)}
      Funds Gap: ${formatCurrency(scenario.fundsGap || 0)}
    `;
  }
}

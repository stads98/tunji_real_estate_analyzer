import { DealInputs, GlobalAssumptions, StrategyResults, YearProjection } from '../types/deal';

export function calculateLTR(inputs: DealInputs, assumptions: GlobalAssumptions, excludeVacancy: boolean = false): StrategyResults {
  const downPaymentAmount = inputs.purchasePrice * (inputs.downPayment / 100);
  const loanAmount = inputs.purchasePrice - downPaymentAmount;
  // Use editable acquisition costs amount, or calculate from percentage (default 5%)
  const acquisitionCostsAmount = inputs.acquisitionCostsAmount ?? (inputs.purchasePrice * 0.05);
  const totalAcquisition = inputs.purchasePrice + acquisitionCostsAmount;
  const cashInvested = downPaymentAmount + acquisitionCostsAmount + (inputs.setupFurnishCost || 0);
  
  const monthlyRate = inputs.loanInterestRate / 100 / 12;
  const numPayments = inputs.loanTerm * 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualDebtService = monthlyPayment * 12;
  
  const projections: YearProjection[] = [];
  let currentPropertyValue = inputs.purchasePrice;
  // Track each unit's rent separately - calculate market rent from Section 8 rent
  // Use explicit marketRent if provided, otherwise calculate: Section 8 Rent / 1.1
  let currentUnitRents = inputs.unitDetails.map(unit => 
    unit.marketRent ?? (unit.section8Rent / 1.1)
  );
  let remainingLoan = loanAmount;
  let cumulativeCashFlow = 0;
  let cumulativeReturn = 0;
  
  // Track annual tax and insurance increases
  let currentPropertyTaxes = inputs.propertyTaxes;
  let currentPropertyInsurance = inputs.propertyInsurance;
  
  for (let year = 1; year <= 30; year++) {
    const totalMonthlyRent = currentUnitRents.reduce((sum, rent) => sum + rent, 0);
    const grossIncome = totalMonthlyRent * 12;
    const vacancyLoss = excludeVacancy ? 0 : grossIncome * (assumptions.ltrVacancyMonths / 12);
    const effectiveIncome = grossIncome - vacancyLoss;
    
    const maintenance = effectiveIncome * (assumptions.maintenancePercent / 100);
    const totalExpenses = currentPropertyTaxes + currentPropertyInsurance + maintenance;
    
    const noi = effectiveIncome - totalExpenses;
    const cashFlow = noi - annualDebtService;
    
    // Calculate principal paid this year
    let principalPaid = 0;
    for (let month = 1; month <= 12; month++) {
      const interestPayment = remainingLoan * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      principalPaid += principalPayment;
      remainingLoan -= principalPayment;
    }
    
    const appreciation = currentPropertyValue * (assumptions.appreciationPercent / 100);
    currentPropertyValue += appreciation;
    const equity = currentPropertyValue - remainingLoan;
    const annualReturn = cashFlow + appreciation;
    
    // Track cumulative values
    cumulativeCashFlow += cashFlow;
    cumulativeReturn += annualReturn;
    
    projections.push({
      year,
      grossIncome,
      noi,
      debtService: annualDebtService,
      cashFlow,
      appreciation,
      propertyValue: currentPropertyValue,
      equity,
      annualReturn,
      cumulativeCashFlow,
      cumulativeReturn,
      loanBalance: remainingLoan
    });
    
    // Apply rent growth to each unit
    currentUnitRents = currentUnitRents.map(rent => rent * (1 + assumptions.rentGrowthPercent / 100));
    
    // Apply annual tax and insurance increases
    currentPropertyTaxes *= (1 + assumptions.propertyTaxIncreasePercent / 100);
    currentPropertyInsurance *= (1 + assumptions.insuranceIncreasePercent / 100);
  }
  
  const year1 = projections[0];
  const capRate = (year1.noi / inputs.purchasePrice) * 100;
  const dscr = year1.noi / annualDebtService;
  const cashOnCash = (year1.cashFlow / cashInvested) * 100;
  
  return {
    year1Summary: {
      grossIncome: year1.grossIncome,
      vacancy: year1.grossIncome * (assumptions.ltrVacancyMonths / 12),
      expenses: year1.grossIncome - year1.noi - (year1.grossIncome * (assumptions.ltrVacancyMonths / 12)),
      noi: year1.noi,
      debtService: annualDebtService,
      cashFlow: year1.cashFlow,
      capRate,
      dscr,
      cashOnCash
    },
    cashInvested,
    projections
  };
}

export function calculateSection8(inputs: DealInputs, assumptions: GlobalAssumptions, excludeVacancy: boolean = false): StrategyResults {
  // Section 8 uses the actual section8Rent from each unit (no conversion needed)
  // calculateLTR divides by 1.1 to get market rent, so we pre-multiply by 1.1
  // to ensure we use the full Section 8 voucher amount
  const section8Inputs = {
    ...inputs,
    unitDetails: inputs.unitDetails.map(unit => ({
      ...unit,
      section8Rent: unit.section8Rent * 1.1, // Pre-multiply so division in calculateLTR gives us the original amount
      marketRent: undefined // CRITICAL: Clear marketRent so Section 8 ONLY uses voucher amount, not market rent
    }))
  };
  
  // Section 8 uses its own lower vacancy rate
  const section8Assumptions = {
    ...assumptions,
    ltrVacancyMonths: assumptions.section8VacancyMonths
  };
  
  return calculateLTR(section8Inputs, section8Assumptions, excludeVacancy);
}

export function calculateAirbnb(inputs: DealInputs, assumptions: GlobalAssumptions, excludeVacancy: boolean = false): StrategyResults {
  const downPaymentAmount = inputs.purchasePrice * (inputs.downPayment / 100);
  const loanAmount = inputs.purchasePrice - downPaymentAmount;
  // Use editable acquisition costs amount, or calculate from percentage (default 5%)
  const acquisitionCostsAmount = inputs.acquisitionCostsAmount ?? (inputs.purchasePrice * 0.05);
  const totalAcquisition = inputs.purchasePrice + acquisitionCostsAmount;
  const cashInvested = downPaymentAmount + acquisitionCostsAmount + (inputs.setupFurnishCost || 0);
  
  const monthlyRate = inputs.loanInterestRate / 100 / 12;
  const numPayments = inputs.loanTerm * 12;
  const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualDebtService = monthlyPayment * 12;
  
  const projections: YearProjection[] = [];
  let currentPropertyValue = inputs.purchasePrice;
  // Track each unit's annual revenue and expenses separately (vacancy already accounted for by AirDNA)
  let currentUnitData = inputs.unitDetails.map(unit => ({
    annualRevenue: unit.strAnnualRevenue || (unit.strMonthlyRevenue ? unit.strMonthlyRevenue * 12 : 0), // Support both new and legacy format
    annualExpenses: unit.strAnnualExpenses || 0
  }));
  let remainingLoan = loanAmount;
  let cumulativeCashFlow = 0;
  let cumulativeReturn = 0;
  
  // Track annual tax and insurance increases
  let currentPropertyTaxes = inputs.propertyTaxes;
  let currentPropertyInsurance = inputs.propertyInsurance;
  
  for (let year = 1; year <= 30; year++) {
    // Calculate gross income from sum of all units: annual revenue - annual expenses (vacancy already in AirDNA data)
    const grossIncome = currentUnitData.reduce((sum, unit) => {
      const netRevenue = unit.annualRevenue - unit.annualExpenses;
      return sum + netRevenue;
    }, 0);
    const vacancyLoss = 0; // Vacancy accounted for in AirDNA annual revenue projections
    const effectiveIncome = grossIncome;
    
    const maintenance = effectiveIncome * (assumptions.maintenancePercent / 100);
    const totalExpenses = currentPropertyTaxes + currentPropertyInsurance + maintenance;
    
    const noi = effectiveIncome - totalExpenses;
    const cashFlow = noi - annualDebtService;
    
    // Calculate principal paid this year
    let principalPaid = 0;
    for (let month = 1; month <= 12; month++) {
      const interestPayment = remainingLoan * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      principalPaid += principalPayment;
      remainingLoan -= principalPayment;
    }
    
    const appreciation = currentPropertyValue * (assumptions.appreciationPercent / 100);
    currentPropertyValue += appreciation;
    const equity = currentPropertyValue - remainingLoan;
    const annualReturn = cashFlow + appreciation;
    
    // Track cumulative values
    cumulativeCashFlow += cashFlow;
    cumulativeReturn += annualReturn;
    
    projections.push({
      year,
      grossIncome,
      noi,
      debtService: annualDebtService,
      cashFlow,
      appreciation,
      propertyValue: currentPropertyValue,
      equity,
      annualReturn,
      cumulativeCashFlow,
      cumulativeReturn,
      loanBalance: remainingLoan
    });
    
    // Apply revenue growth to each unit's annual revenue
    currentUnitData = currentUnitData.map(unit => ({
      ...unit,
      annualRevenue: unit.annualRevenue * (1 + assumptions.rentGrowthPercent / 100),
      annualExpenses: unit.annualExpenses * (1 + assumptions.rentGrowthPercent / 100) // Expenses also grow
    }));
    
    // Apply annual tax and insurance increases
    currentPropertyTaxes *= (1 + assumptions.propertyTaxIncreasePercent / 100);
    currentPropertyInsurance *= (1 + assumptions.insuranceIncreasePercent / 100);
  }
  
  const year1 = projections[0];
  const capRate = (year1.noi / inputs.purchasePrice) * 100;
  const dscr = year1.noi / annualDebtService;
  const cashOnCash = (year1.cashFlow / cashInvested) * 100;
  
  return {
    year1Summary: {
      grossIncome: year1.grossIncome, // Sum of (annual revenue - annual expenses) per unit
      vacancy: 0, // Vacancy accounted for in AirDNA annual revenue projections
      expenses: year1.grossIncome - year1.noi,
      noi: year1.noi,
      debtService: annualDebtService,
      cashFlow: year1.cashFlow,
      capRate,
      dscr,
      cashOnCash
    },
    cashInvested,
    projections
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Parses a currency string or number into a numeric value
 * Handles formats like: "$1,234.56", "1234.56", "1,234", etc.
 */
export function parseCurrency(value: string | number): number {
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = value.replace(/[$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateRehab(inputs: DealInputs, assumptions: GlobalAssumptions, excludeVacancy: boolean = false): StrategyResults {
  // Calculate refi loan amount using user-specified exit refi LTV (default 75%)
  const refiLTV = inputs.exitRefiLTV / 100;
  const newLoanAmount = inputs.afterRepairValue * refiLTV;
  
  // Calculate bridge loan based on LTC % and Financed Rehab Budget %
  // Bridge loan = (Purchase × LTC%) + (Rehab × Financed Rehab Budget %)
  const purchaseLoan = inputs.purchasePrice * (inputs.bridgeLTC / 100);
  const rehabLoan = inputs.rehabCost * (inputs.bridgeRehabBudgetPercent / 100);
  const hardMoneyLoanAmount = purchaseLoan + rehabLoan;
  
  // Calculate cash invested for rehab
  const totalProjectCost = inputs.purchasePrice + inputs.rehabCost;
  
  // Bridge settlement charges: Use editable amount if provided, otherwise 6% of purchase price
  const entryPointsCost = inputs.bridgeSettlementCharges ?? (inputs.purchasePrice * 0.06);
  
  // Down payment = what you pay cash upfront
  // Lender deducts settlement charges from loan proceeds, so actual cash received = Bridge loan - Settlement charges
  // Down payment = Total cost - (Bridge loan - Settlement charges)
  const downPaymentAmount = totalProjectCost - (hardMoneyLoanAmount - entryPointsCost);
  
  const exitPointsCost = newLoanAmount * (inputs.rehabExitPoints / 100);
  
  // Use user-provided or auto-calculated taxes and insurance based on ARV for rehab properties
  const rehabPropertyTaxes = inputs.rehabPropertyTaxes || (inputs.afterRepairValue * 0.013);
  const rehabPropertyInsurance = inputs.rehabPropertyInsurance || (inputs.afterRepairValue * 0.011);
  
  // Carrying costs during rehab (using current purchase price for taxes/insurance during rehab)
  const monthlyRehabInterest = hardMoneyLoanAmount * (inputs.rehabFinancingRate / 100 / 12);
  const monthlyTaxesInsurance = (inputs.propertyTaxes + inputs.propertyInsurance) / 12;
  const rehabCarryingCosts = (monthlyRehabInterest + monthlyTaxesInsurance) * inputs.rehabMonths;
  
  // Total cash invested = Down payment (which already includes settlement charges) + carrying costs
  // NOTE: Down payment already includes the settlement charges (deducted from loan proceeds, not separate cash)
  // NOTE: Exit points NOT included here - they're handled separately in the BRRRR refi scenario
  const cashInvested = downPaymentAmount + rehabCarryingCosts;
  
  const monthlyRate = inputs.exitRefiRate / 100 / 12;
  const numPayments = inputs.loanTerm * 12;
  const monthlyPayment = newLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  const annualDebtService = monthlyPayment * 12;
  
  const projections: YearProjection[] = [];
  let currentPropertyValue = inputs.afterRepairValue;
  // Use after-repair market rents, fallback to explicit marketRent, then calculate from Section 8
  let currentUnitRents = inputs.unitDetails.map(unit => 
    unit.afterRehabMarketRent ?? unit.marketRent ?? (unit.section8Rent / 1.1)
  );
  let remainingLoan = newLoanAmount;
  let cumulativeCashFlow = 0;
  let cumulativeReturn = 0;
  
  // Track annual tax and insurance increases (start with ARV-based amounts)
  let currentRehabPropertyTaxes = rehabPropertyTaxes;
  let currentRehabPropertyInsurance = rehabPropertyInsurance;
  
  for (let year = 1; year <= 30; year++) {
    const totalMonthlyRent = currentUnitRents.reduce((sum, rent) => sum + rent, 0);
    const grossIncome = totalMonthlyRent * 12;
    const vacancyLoss = excludeVacancy ? 0 : grossIncome * (assumptions.ltrVacancyMonths / 12);
    const effectiveIncome = grossIncome - vacancyLoss;
    
    const maintenance = effectiveIncome * (assumptions.maintenancePercent / 100);
    // Use ARV-based taxes and insurance for rehab properties (Broward County rates)
    const totalExpenses = currentRehabPropertyTaxes + currentRehabPropertyInsurance + maintenance;
    
    const noi = effectiveIncome - totalExpenses;
    const cashFlow = noi - annualDebtService;
    
    // Calculate principal paid this year
    let principalPaid = 0;
    for (let month = 1; month <= 12; month++) {
      const interestPayment = remainingLoan * monthlyRate;
      const principalPayment = monthlyPayment - interestPayment;
      principalPaid += principalPayment;
      remainingLoan -= principalPayment;
    }
    
    const appreciation = currentPropertyValue * (assumptions.appreciationPercent / 100);
    currentPropertyValue += appreciation;
    const equity = currentPropertyValue - remainingLoan;
    const annualReturn = cashFlow + appreciation;
    
    // Track cumulative values
    cumulativeCashFlow += cashFlow;
    cumulativeReturn += annualReturn;
    
    projections.push({
      year,
      grossIncome,
      noi,
      debtService: annualDebtService,
      cashFlow,
      appreciation,
      propertyValue: currentPropertyValue,
      equity,
      annualReturn,
      cumulativeCashFlow,
      cumulativeReturn,
      loanBalance: remainingLoan
    });
    
    currentUnitRents = currentUnitRents.map(rent => rent * (1 + assumptions.rentGrowthPercent / 100));
    
    // Apply annual tax and insurance increases
    currentRehabPropertyTaxes *= (1 + assumptions.propertyTaxIncreasePercent / 100);
    currentRehabPropertyInsurance *= (1 + assumptions.insuranceIncreasePercent / 100);
  }
  
  const year1 = projections[0];
  const capRate = (year1.noi / inputs.afterRepairValue) * 100;
  const dscr = year1.noi / annualDebtService;
  const cashOnCash = (year1.cashFlow / cashInvested) * 100;
  
  return {
    year1Summary: {
      grossIncome: year1.grossIncome,
      vacancy: year1.grossIncome * (assumptions.ltrVacancyMonths / 12),
      expenses: year1.grossIncome - year1.noi - (year1.grossIncome * (assumptions.ltrVacancyMonths / 12)),
      noi: year1.noi,
      debtService: annualDebtService,
      cashFlow: year1.cashFlow,
      capRate,
      dscr,
      cashOnCash
    },
    cashInvested,
    projections
  };
}

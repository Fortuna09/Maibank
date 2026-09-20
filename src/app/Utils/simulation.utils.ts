import { FinanceGoal } from '../Models/finance.model';

export type PurchaseMode = 'avista' | 'parcelado' | 'recorrente';

export interface SimulationInput {
  startBalance: number;
  monthlyIncome: number;
  bucketPercentage: number;
  purchaseTotal: number;
  purchaseMode: PurchaseMode;
  installments: number;
  months: number;
}

export interface SimulationMonth {
  index: number;
  label: string;
  inflow: number;
  purchaseCost: number;
  without: number;
  with: number;
  difference: number;
}

export interface SimulationResult {
  months: SimulationMonth[];
  finalWithout: number;
  finalWith: number;
  totalDifference: number;
  firstNegativeMonth: SimulationMonth | null;
  totalPurchaseCost: number;
}

export interface GoalImpact {
  goal: FinanceGoal;
  monthsBefore: number;
  monthsAfter: number;
  delayMonths: number;
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function monthLabel(offset: number, from: Date = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth() + offset, 1);
  return `${MONTH_NAMES[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;
}

export function purchaseCostForMonth(input: SimulationInput, month: number): number {
  if (input.purchaseTotal <= 0 || month < 1) {
    return 0;
  }

  switch (input.purchaseMode) {
    case 'avista':
      return month === 1 ? input.purchaseTotal : 0;
    case 'parcelado': {
      const count = Math.max(1, Math.round(input.installments));
      return month <= count ? input.purchaseTotal / count : 0;
    }
    case 'recorrente':
      return input.purchaseTotal;
  }
}

export function projectBucket(input: SimulationInput, from: Date = new Date()): SimulationResult {
  const inflow = round((input.monthlyIncome * input.bucketPercentage) / 100);
  const months: SimulationMonth[] = [];

  let without = input.startBalance;
  let withPurchase = input.startBalance;
  let totalPurchaseCost = 0;
  let firstNegativeMonth: SimulationMonth | null = null;

  months.push({
    index: 0,
    label: 'Hoje',
    inflow: 0,
    purchaseCost: 0,
    without: round(without),
    with: round(withPurchase),
    difference: 0,
  });

  for (let index = 1; index <= input.months; index += 1) {
    const purchaseCost = round(purchaseCostForMonth(input, index));
    totalPurchaseCost += purchaseCost;

    without = round(without + inflow);
    withPurchase = round(withPurchase + inflow - purchaseCost);

    const month: SimulationMonth = {
      index,
      label: monthLabel(index, from),
      inflow,
      purchaseCost,
      without,
      with: withPurchase,
      difference: round(without - withPurchase),
    };

    months.push(month);

    if (!firstNegativeMonth && withPurchase < 0) {
      firstNegativeMonth = month;
    }
  }

  const last = months[months.length - 1];

  return {
    months,
    finalWithout: last.without,
    finalWith: last.with,
    totalDifference: round(last.without - last.with),
    firstNegativeMonth,
    totalPurchaseCost: round(totalPurchaseCost),
  };
}

function monthlySaveOf(goal: FinanceGoal): number {
  return goal.saveFrequency === 'semanal' ? goal.saveAmount * 4.33 : goal.saveAmount;
}

export function goalImpacts(goals: FinanceGoal[], totalPurchaseCost: number): GoalImpact[] {
  return goals
    .filter((goal) => goal.currentAmount < goal.targetAmount && goal.saveAmount > 0)
    .map((goal) => {
      const monthlySave = monthlySaveOf(goal);
      const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
      const monthsBefore = Math.max(1, Math.ceil(remaining / monthlySave));
      const delayMonths = totalPurchaseCost > 0 ? Math.ceil(totalPurchaseCost / monthlySave) : 0;

      return {
        goal,
        monthsBefore,
        monthsAfter: monthsBefore + delayMonths,
        delayMonths,
      };
    });
}

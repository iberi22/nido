export interface Transaction {
  id: string;
  category: string;
  amount: number;
  date: Date;
  description?: string;
}

export interface SpendingCategorySummary {
  category: string;
  total: number;
}

export interface UtilityReading {
  id: string;
  utilityId: string;
  reading: number; // Consumption amount or raw reading
  date: Date;
}

export interface Utility {
  id: string;
  name: string; // e.g. "Water", "Electricity", "Gas"
  monthlyBudget: number;
}

export interface UtilityConsumptionPattern {
  utilityId: string;
  avg: number;
  min: number;
  max: number;
  delta: number; // Difference between last reading and first reading, or current trend delta
}

/**
 * Aggregates transactions by category and outputs them sorted by total spent (descending).
 */
export function spendingByCategory(transactions: Transaction[]): SpendingCategorySummary[] {
  const map: Record<string, number> = {};

  transactions.forEach(t => {
    map[t.category] = (map[t.category] || 0) + t.amount;
  });

  const summaries = Object.keys(map).map(category => ({
    category,
    total: map[category]
  }));

  // Sort by total descending
  return summaries.sort((a, b) => b.total - a.total);
}

/**
 * Calculates utility consumption pattern metrics (average, min, max, delta).
 * Helps properties understand resources usages and plan maintenance.
 */
export function utilityConsumptionPattern(
  utility: Utility,
  readings: UtilityReading[]
): UtilityConsumptionPattern {
  const filtered = readings
    .filter(r => r.utilityId === utility.id)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (filtered.length === 0) {
    return {
      utilityId: utility.id,
      avg: 0,
      min: 0,
      max: 0,
      delta: 0
    };
  }

  const values = filtered.map(r => r.reading);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const delta = values[values.length - 1] - values[0];

  return {
    utilityId: utility.id,
    avg,
    min,
    max,
    delta
  };
}

/**
 * Generates warning/alert strings if transactions or utility readings exceed budgets or targets.
 */
export function budgetAlerts(
  utilities: Utility[],
  transactions: Transaction[],
  readings: UtilityReading[] = []
): string[] {
  const alerts: string[] = [];

  // Check category spending vs utility monthly budget
  utilities.forEach(util => {
    // Sum transactions for this utility category
    // Matches if category is lowercase of utility name or explicitly contains utility name
    const matches = transactions.filter(t =>
      t.category.toLowerCase() === util.name.toLowerCase() ||
      t.category.toLowerCase().includes(util.name.toLowerCase())
    );

    const totalSpent = matches.reduce((sum, t) => sum + t.amount, 0);
    if (totalSpent > util.monthlyBudget) {
      alerts.push(`Over budget for ${util.name}: Spent $${totalSpent.toFixed(2)} vs Budget $${util.monthlyBudget.toFixed(2)}`);
    }

    // Also check consumption patterns if we have readings
    const utilReadings = readings.filter(r => r.utilityId === util.id);
    if (utilReadings.length > 0) {
      const lastReading = utilReadings.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      // e.g., if any single reading exceeds budget values
      if (lastReading.reading > util.monthlyBudget) {
        alerts.push(`High consumption alert for ${util.name}: Last reading ${lastReading.reading} exceeds threshold/budget ${util.monthlyBudget}`);
      }
    }
  });

  return alerts;
}

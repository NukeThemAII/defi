const DAYS_IN_YEAR = 365;
const WEEKS_IN_YEAR = 52;

export interface BlendedApyInput {
  balanceUsd: number;
  apyPercent: number;
}

export type ProjectionKey = '1d' | '7d' | '30d' | '90d' | '365d';

const PROJECTION_PERIODS: Record<ProjectionKey, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '365d': 365,
};

function toDecimalRate(apyPercent: number): number {
  if (!Number.isFinite(apyPercent)) {
    return 0;
  }
  return apyPercent / 100;
}

export function calculateBlendedApy(inputs: BlendedApyInput[]): number {
  const totalBalance = inputs.reduce((acc, item) => acc + Math.max(item.balanceUsd, 0), 0);
  if (totalBalance <= 0) {
    return 0;
  }

  return inputs.reduce((acc, item) => {
    const weight = item.balanceUsd > 0 ? item.balanceUsd / totalBalance : 0;
    return acc + weight * item.apyPercent;
  }, 0);
}

export function calculateDailyEarnings(balanceUsd: number, apyPercent: number): number {
  if (balanceUsd <= 0) {
    return 0;
  }

  return balanceUsd * toDecimalRate(apyPercent) / DAYS_IN_YEAR;
}

export function calculateEarningsProjection(
  balanceUsd: number,
  apyPercent: number,
  periodDays: number,
  compoundWeekly = false,
): number {
  if (balanceUsd <= 0 || periodDays <= 0) {
    return 0;
  }

  const apyDecimal = toDecimalRate(apyPercent);
  if (apyDecimal <= 0) {
    return 0;
  }

  if (!compoundWeekly) {
    return balanceUsd * apyDecimal * (periodDays / DAYS_IN_YEAR);
  }

  const weeklyRate = Math.pow(1 + apyDecimal, 1 / WEEKS_IN_YEAR) - 1;
  const weeks = periodDays / 7;
  const growth = Math.pow(1 + weeklyRate, weeks) - 1;
  return balanceUsd * growth;
}

export function buildEarningsProjections(
  balanceUsd: number,
  apyPercent: number,
  compoundWeekly = false,
): Record<ProjectionKey, number> {
  return (Object.keys(PROJECTION_PERIODS) as ProjectionKey[]).reduce(
    (acc, key) => {
      acc[key] = calculateEarningsProjection(
        balanceUsd,
        apyPercent,
        PROJECTION_PERIODS[key],
        compoundWeekly,
      );
      return acc;
    },
    {} as Record<ProjectionKey, number>,
  );
}


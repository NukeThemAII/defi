const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 2,
});

interface CurrencyFormatOptions {
  compact?: boolean;
}

export function formatCurrency(
  value: number | null | undefined,
  { compact = false }: CurrencyFormatOptions = {},
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "–";
  }
  return (compact ? compactCurrencyFormatter : currencyFormatter).format(value);
}

export function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "–";
  }
  return percentFormatter.format(value / 100);
}

export function formatDateTime(value: string | number | Date | null | undefined) {
  if (!value) {
    return "–";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "–";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

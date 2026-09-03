import {
  AllocationBucket,
  AllocationBucketId,
  AllocationEntry,
  AllocationSettings,
} from '../Models/finance.model';

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeDate(value?: string | null): string {
  return value?.slice(0, 10) ?? '';
}

export function makeBucketId(label: string): string {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || `divisao-${Date.now()}`;
}

export function createBucketMap(buckets: AllocationBucket[]): Record<AllocationBucketId, number> {
  return buckets.reduce(
    (accumulator, bucket) => ({
      ...accumulator,
      [bucket.id]: 0,
    }),
    {} as Record<AllocationBucketId, number>
  );
}

export function buildPercentageAllocations(
  amountWithDirection: number,
  buckets: AllocationBucket[]
): AllocationEntry[] {
  return buckets.map((bucket, index, allBuckets) => {
    if (index === allBuckets.length - 1) {
      const priorTotal = allBuckets
        .slice(0, -1)
        .reduce(
          (sum, currentBucket) => sum + roundCurrency((amountWithDirection * currentBucket.percentage) / 100),
          0
        );

      return {
        bucketId: bucket.id,
        amount: roundCurrency(amountWithDirection - priorTotal),
      };
    }

    return {
      bucketId: bucket.id,
      amount: roundCurrency((amountWithDirection * bucket.percentage) / 100),
    };
  });
}

export function buildSpecificAllocation(
  amountWithDirection: number,
  bucketId?: AllocationBucketId
): AllocationEntry[] {
  if (!bucketId) {
    return [];
  }

  return [
    {
      bucketId,
      amount: roundCurrency(amountWithDirection),
    },
  ];
}

export function normalizeSettings(settings: Partial<AllocationSettings> | null | undefined): AllocationSettings {
  const baseBuckets = settings?.buckets ?? [];

  return {
    baseIncome: Number(settings?.baseIncome ?? 0),
    buckets: baseBuckets.map((bucket) => ({
      id: bucket.id,
      label: bucket.label,
      percentage: Number(bucket.percentage),
    })),
  };
}

export function getBusinessDayOfMonth(year: number, month: number, businessDay: number): Date {
  const firstDay = new Date(year, month - 1, 1);
  let count = 0;
  let currentDate = firstDay;

  while (count < businessDay) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      count++;
    }
    if (count < businessDay) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return currentDate;
}

export function normalizeAllocationPercentages(
  buckets: Array<{ id: string; label: string; percentage: number }>,
  defaultBucketId: string = 'uso-diario'
): { buckets: Array<{ id: string; label: string; percentage: number }>; totalPercentage: number; wasAdjusted: boolean } {
  const total = buckets.reduce((sum, b) => sum + Number(b.percentage || 0), 0);

  if (Math.abs(total - 100) < 0.01) {
    return { buckets, totalPercentage: total, wasAdjusted: false };
  }

  if (total > 100) {
    return { buckets, totalPercentage: total, wasAdjusted: false };
  }

  const adjusted = [...buckets];
  const defaultBucket = adjusted.find((b) => b.id === defaultBucketId);

  if (defaultBucket) {
    const difference = 100 - total;
    defaultBucket.percentage = Number((defaultBucket.percentage + difference).toFixed(2));
    return { buckets: adjusted, totalPercentage: 100, wasAdjusted: true };
  }

  return { buckets, totalPercentage: total, wasAdjusted: false };
}

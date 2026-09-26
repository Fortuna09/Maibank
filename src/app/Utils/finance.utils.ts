import {
  AllocationBucket,
  AllocationBucketId,
  AllocationEntry,
  AllocationSettings,
  TransactionType,
} from '../Models/finance.model';

export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Data de hoje (ou de `date`) no fuso do navegador, AAAA-MM-DD.
 * `toISOString()` usa UTC: depois das 21h em Brasília já daria o dia seguinte.
 */
export function todayLocalIso(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Como o usuário informa uma compra parcelada: o valor cheio ou só o de cada parcela. */
export type AmountMode = 'total' | 'parcela';

function installmentCount(count: number): number {
  return Math.max(1, Math.round(Number(count) || 1));
}

/** Total pago a partir da parcela — se houver juros, já vêm embutidos. */
export function totalFromInstallment(installmentValue: number, count: number): number {
  return roundCurrency(Math.max(0, Number(installmentValue) || 0) * installmentCount(count));
}

export function installmentFromTotal(total: number, count: number): number {
  return roundCurrency(Math.max(0, Number(total) || 0) / installmentCount(count));
}

export function categoryIcon(label: string | null | undefined): string {
  const value = (label ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

  if (/carro|auto|veiculo|combust|gasolina|uber/.test(value)) {
    return 'car';
  }
  if (/emerg|reserva|seguran|protec/.test(value)) {
    return 'shield';
  }
  if (/futuro|plano|sonho|viagem|invest|meta/.test(value)) {
    return 'rocket';
  }
  if (/diari|mercado|compra|uso|super|alimenta/.test(value)) {
    return 'bag';
  }
  if (/salari|renda|receita|pagamento|entrada/.test(value)) {
    return 'arrow-in';
  }

  return 'wallet';
}

export function transactionIcon(type: TransactionType): string {
  return type === 'entrada' ? 'arrow-in' : type === 'credito' ? 'card' : 'arrow-out';
}

export function transactionLabel(type: TransactionType): string {
  return type === 'entrada' ? 'Entrada' : type === 'credito' ? 'Crédito' : 'Saída';
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

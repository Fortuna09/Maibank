/**
 * Divide um valor (positivo ou negativo) pelas porcentagens das divisões.
 * A última divisão absorve a diferença de arredondamento, então a soma bate exatamente.
 */
export function splitByPercentage(amount, buckets) {
  let allocated = 0;

  return buckets.map((bucket, index) => {
    const isLast = index === buckets.length - 1;
    const share = isLast
      ? Math.round((amount - allocated) * 100) / 100
      : Math.round(((amount * bucket.percentage) / 100) * 100) / 100;

    allocated += share;
    return { bucketId: bucket.id, amount: share };
  });
}

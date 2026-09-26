import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';

export class SettingsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getSettings(userId) {
    const [baseIncome, buckets] = await Promise.all([
      this.repository.findBaseIncome(userId),
      this.repository.findBuckets(userId),
    ]);
    return { baseIncome, buckets };
  }

  /**
   * Salva renda base e a lista completa de divisões, na ordem enviada: atualiza as existentes,
   * insere as novas e apaga as que saíram — desde que não tenham lançamentos.
   */
  async updateSettings(userId, { baseIncome, buckets }) {
    if (!Array.isArray(buckets) || buckets.length === 0) {
      throw HttpError.badRequest('Buckets invalidos.');
    }

    const normalized = buckets.map((bucket) => ({
      id: String(bucket.id ?? '').trim(),
      label: String(bucket.label ?? '').trim(),
      percentage: Number(bucket.percentage || 0),
    }));

    if (normalized.some((bucket) => !bucket.id || !bucket.label)) {
      throw HttpError.badRequest('Toda divisão precisa de nome.');
    }

    const totalPercentage = normalized.reduce((sum, bucket) => sum + bucket.percentage, 0);
    if (Math.round(totalPercentage) !== 100) {
      throw HttpError.badRequest('A soma dos percentuais precisa ser 100.');
    }

    await withTransaction(async (client) => {
      await this.repository.upsertBaseIncome(client, userId, Math.max(0, Number(baseIncome || 0)));

      const incomingIds = new Set(normalized.map((bucket) => bucket.id));
      const existing = await this.repository.findBuckets(userId, client);

      for (const bucket of existing) {
        if (incomingIds.has(bucket.id)) {
          continue;
        }

        const usage = await this.repository.countAllocationsForBucket(client, userId, bucket.id);
        if (usage > 0) {
          throw HttpError.badRequest(`A divisão "${bucket.label}" já tem lançamentos e não pode ser removida.`);
        }

        await this.repository.deleteBucket(client, userId, bucket.id);
      }

      for (const [position, bucket] of normalized.entries()) {
        await this.repository.upsertBucket(client, userId, bucket, position);
      }
    });
  }
}

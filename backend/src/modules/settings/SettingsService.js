import { withTransaction } from '../../db.js';
import { HttpError } from '../../http/HttpError.js';

export class SettingsService {
  constructor(repository) {
    this.repository = repository;
  }

  async getSettings() {
    const [settings, buckets] = await Promise.all([this.repository.findSettings(), this.repository.findBuckets()]);
    return { ...settings, buckets };
  }

  /**
   * Salva renda base e a lista completa de divisões: atualiza as existentes,
   * insere as novas e apaga as que saíram — desde que não tenham lançamentos.
   */
  async updateSettings({ baseIncome, buckets }) {
    if (!Array.isArray(buckets) || buckets.length === 0) {
      throw HttpError.badRequest('Buckets invalidos.');
    }

    const normalized = buckets.map((bucket) => ({
      id: String(bucket.id),
      label: String(bucket.label || ''),
      percentage: Number(bucket.percentage || 0),
    }));

    const totalPercentage = normalized.reduce((sum, bucket) => sum + bucket.percentage, 0);
    if (Math.round(totalPercentage) !== 100) {
      throw HttpError.badRequest('A soma dos percentuais precisa ser 100.');
    }

    await withTransaction(async (connection) => {
      await this.repository.updateBaseIncome(connection, Number(baseIncome || 0));

      const incomingIds = new Set(normalized.map((bucket) => bucket.id));
      const existing = await this.repository.findBuckets(connection);

      for (const bucket of existing) {
        if (incomingIds.has(bucket.id)) {
          continue;
        }

        const usage = await this.repository.countAllocationsForBucket(connection, bucket.id);
        if (usage > 0) {
          throw HttpError.badRequest(`A divisão "${bucket.label}" já tem lançamentos e não pode ser removida.`);
        }

        await this.repository.deleteBucket(connection, bucket.id);
      }

      for (const bucket of normalized) {
        await this.repository.upsertBucket(connection, bucket);
      }
    });
  }
}

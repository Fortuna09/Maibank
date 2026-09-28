import { createHash, randomBytes } from 'crypto';
import { HttpError } from '../../http/HttpError.js';
import { todayIso } from '../../utils/monthDay.js';
import { parseExpense } from './expenseParser.js';

const KEY_PREFIX = 'mb_';
const DAILY_BUCKET = 'uso-diario';
const TEXT_MAX = 300;
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
/** "R$ 2,00" com espaço comum (o Intl usa um espaço especial que atrapalha quem lê o JSON). */
const currency = { format: (value) => brl.format(value).replace(/ /g, ' ') };

function hashKey(key) {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Lançar gasto pela Siri (app Atalhos do iPhone): o atalho dita a frase e manda para
 * POST /api/atalho/gasto com a chave pessoal. As respostas vêm em `mensagem`, prontas
 * para a Siri falar.
 */
export class ShortcutsService {
  constructor(repository, settingsRepository, transactionsService) {
    this.repository = repository;
    this.settingsRepository = settingsRepository;
    this.transactionsService = transactionsService;
  }

  // ----- chave (tela de configurações) -----

  async keyInfo(userId) {
    const row = await this.repository.findKey(userId);
    return row
      ? { active: true, hint: row.key_hint, createdAt: row.created_at, lastUsedAt: row.last_used_at }
      : { active: false };
  }

  /** A chave completa só existe nesta resposta: no banco fica o hash. */
  async createKey(userId) {
    const key = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
    const row = await this.repository.upsertKey(userId, hashKey(key), key.slice(-4));
    return { key, hint: row.key_hint, createdAt: row.created_at };
  }

  async revokeKey(userId) {
    await this.repository.deleteKey(userId);
  }

  /** Usuário dono da chave, ou null. */
  async authenticate(rawKey) {
    const key = String(rawKey ?? '').trim();
    if (!key.startsWith(KEY_PREFIX) || key.length < 20 || key.length > 80) {
      return null;
    }
    return this.repository.useKey(hashKey(key));
  }

  // ----- gasto -----

  /** Entende a frase sem gravar nada (botão "Testar" na tela de configurações). */
  async preview(userId, rawText) {
    const text = this.readText(rawText);
    const expense = parseExpense(text);
    if (!expense) {
      throw HttpError.badRequest('Não entendi o valor. Diga, por exemplo: 12 reais no mercado.');
    }
    const bucket = await this.resolveBucket(userId);
    return { ...expense, bucket };
  }

  async addExpense(userId, rawText) {
    const { amount, description, category, bucket } = await this.preview(userId, rawText);

    await this.transactionsService.create(userId, {
      description,
      type: 'saida',
      amount,
      category,
      date: todayIso(),
      allocationMode: 'especifico',
      allocations: [{ bucketId: bucket.id, amount: -amount }],
    });

    const balance = await this.repository.bucketBalance(userId, bucket.id);
    return {
      mensagem: `Anotado: ${currency.format(amount)} em ${description}. Sobram ${currency.format(balance)} no ${bucket.label}.`,
      lancamento: { valor: amount, descricao: description, categoria: category, divisao: bucket.label },
    };
  }

  readText(rawText) {
    const text = String(rawText ?? '').trim();
    if (!text) {
      throw HttpError.badRequest('Não ouvi nada. Tente de novo dizendo o valor e com o quê.');
    }
    return text.slice(0, TEXT_MAX);
  }

  /** Gastos pela Siri saem do Uso diário; se a pessoa renomeou/apagou, da primeira divisão. */
  async resolveBucket(userId) {
    const buckets = await this.settingsRepository.findBuckets(userId);
    const bucket = buckets.find((item) => item.id === DAILY_BUCKET) ?? buckets[0];
    if (!bucket) {
      throw HttpError.badRequest('Crie uma divisão no Maibank antes de lançar pela Siri.');
    }
    return { id: bucket.id, label: bucket.label };
  }
}

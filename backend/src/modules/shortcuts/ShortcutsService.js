import { createHash, randomBytes } from 'crypto';
import { HttpError } from '../../http/HttpError.js';
import { todayIso } from '../../utils/monthDay.js';
import { inferCategory, parseAmount, parseDescription, parseExpense } from './expenseParser.js';

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

  /**
   * Entende o gasto sem gravar nada (também é o botão "Testar" da tela de configurações).
   * `rawAmount`: valor mandado à parte (pergunta do tipo Número no atalho) — aí a frase só
   * precisa dizer com o quê, e a Siri não tem como errar os centavos.
   */
  async preview(userId, rawText, rawAmount = null) {
    const text = String(rawText ?? '').trim().slice(0, TEXT_MAX);
    let expense;

    if (rawAmount !== null && rawAmount !== undefined && String(rawAmount).trim() !== '') {
      const amount = typeof rawAmount === 'number' ? rawAmount : parseAmount(String(rawAmount));
      if (!(amount > 0) || amount > 1_000_000) {
        throw HttpError.badRequest('Não entendi o valor. Tente de novo falando só o número, como 6 vírgula 67.');
      }
      const description = parseDescription(text) ?? 'Gasto pela Siri';
      expense = { amount: Math.round(amount * 100) / 100, description, category: inferCategory(description) };
    } else {
      if (!text) {
        throw HttpError.badRequest('Não ouvi nada. Fale assim: gastei 6 reais e 95 centavos em bala.');
      }
      expense = parseExpense(text);
      if (!expense) {
        throw HttpError.badRequest('Não entendi o valor. Fale assim: gastei 6 reais e 95 centavos em bala.');
      }
    }

    const bucket = await this.resolveBucket(userId);
    return { ...expense, bucket };
  }

  async addExpense(userId, rawText, rawAmount = null) {
    const { amount, description, category, bucket } = await this.preview(userId, rawText, rawAmount);

    try {
      await this.transactionsService.create(userId, {
        description,
        type: 'saida',
        amount,
        category,
        date: todayIso(),
        allocationMode: 'especifico',
        allocations: [{ bucketId: bucket.id, amount: -amount }],
      });
    } catch (error) {
      // Pela Siri a pessoa não vê a tela: deixa claro que nada foi lançado
      if (error instanceof HttpError && error.code === 'INSUFFICIENT_BALANCE') {
        throw HttpError.badRequest(`${error.message} Não anotei.`, error.code);
      }
      throw error;
    }

    const balance = await this.repository.bucketBalance(userId, bucket.id);
    return {
      mensagem: `Anotado: ${currency.format(amount)} em ${description}. Sobram ${currency.format(balance)} no ${bucket.label}.`,
      lancamento: { valor: amount, descricao: description, categoria: category, divisao: bucket.label },
    };
  }

  // ----- histórico "o que a Siri mandou" -----

  /** Guarda o pedido; se falhar, só avisa no log — a resposta para a Siri não pode depender disso. */
  async log(userId, entry) {
    try {
      await this.repository.insertLog(userId, entry);
    } catch (error) {
      console.error('Não foi possível guardar o pedido da Siri:', error.message);
    }
  }

  history(userId) {
    return this.repository.findLog(userId);
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

import {
  AssistantAction,
  AssistantClient,
  AssistantContext,
  AssistantMessage,
  AssistantReply,
} from '../Models/assistant.model';
import { TransactionType } from '../Models/finance.model';

/**
 * Cliente local, sem modelo: entende meia dúzia de frases por regex só para
 * exercitar o fluxo proposta → confirmação. É substituído pelo cliente real
 * quando a chave for configurada; a interface é a mesma.
 */

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, março: 2, abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

const CATEGORY_RULES: Array<[RegExp, string]> = [
  [/mercado|supermercado|feira|hortifruti/, 'mercado'],
  [/ifood|lanche|restaurante|pizza|hamburg|almo[cç]o|jantar|caf[eé]|padaria/, 'alimentação'],
  [/uber|99|gasolina|combust|[oô]nibus|metr[oô]|estacionamento|pedágio|pedagio/, 'transporte'],
  [/netflix|spotify|assinatura|disney|prime|youtube|hbo/, 'assinaturas'],
  [/fone|celular|notebook|\bpc\b|computador|monitor|teclado|mouse|tv\b|televis/, 'eletrônicos'],
  [/rem[eé]dio|farm[aá]cia|m[eé]dico|dentista|consulta|academia/, 'saúde'],
  [/aluguel|luz|[aá]gua|internet|condom[ií]nio|g[aá]s/, 'moradia'],
  [/sal[aá]rio|pagamento|freela|b[oô]nus/, 'salário'],
  [/roupa|t[eê]nis|cal[cç]a|camisa|sapato/, 'roupas'],
  [/curso|livro|faculdade|escola/, 'educação'],
  [/cinema|show|bar|balada|jogo|viagem|passagem/, 'lazer'],
];

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parseAmount(text: string): number | null {
  const normalized = normalize(text);
  const mil = normalized.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (mil) {
    return Math.round(Number(mil[1].replace(',', '.')) * 1000);
  }

  // Ignora "3x" e "10 parcelas" ao procurar o valor.
  const cleaned = normalized.replace(/\d+\s*x\b/g, ' ').replace(/\d+\s*(parcelas?|vezes)/g, ' ');
  const match = cleaned.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (!match) {
    return null;
  }

  const raw = match[1].includes(',') ? match[1].replace(/\./g, '').replace(',', '.') : match[1];
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parseInstallments(text: string): number {
  const normalized = normalize(text);
  const times = normalized.match(/(\d+)\s*x\b/) ?? normalized.match(/(?:em\s+)?(\d+)\s*(?:parcelas?|vezes)/);
  return times ? Math.min(36, Math.max(1, Number(times[1]))) : 1;
}

function parseDescription(text: string): string {
  let cleaned = text
    .replace(/r\$\s*/gi, '')
    .replace(/\d+(?:[.,]\d+)?\s*mil\b/gi, '')
    .replace(/\d+\s*x\b/gi, '')
    .replace(/\bem\s+\d+\s*(parcelas?|vezes)/gi, '')
    .replace(/\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?/g, '')
    .replace(/\b(reais|real|conto|contos|pila)\b/gi, '')
    .replace(/\b(no|na|em|com|de|do|da|pro|pra|para|o|a|um|uma|meu|minha)\s+(cartao|cartão|credito|crédito)\b/gi, '')
    .replace(/\b(gastei|paguei|comprei|torrei|recebi|ganhei|entrou|caiu|lan[cç]a|registra|anota|coloca)\b/gi, '')
    .replace(/\b(hoje|ontem|agora)\b/gi, '')
    .replace(/^\s*(no|na|em|com|de|do|da|o|a|um|uma)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Tirar os números deixa preposições órfãs ("fone de em"): remove as que sobraram no fim ou em sequência.
  const filler = new Set(['no', 'na', 'em', 'com', 'de', 'do', 'da', 'por', 'pro', 'pra', 'para', 'o', 'a', 'um', 'uma', 'e']);
  const words = cleaned.replace(/[.!?]+$/, '').split(' ').filter(Boolean);
  while (words.length && filler.has(words[words.length - 1].toLowerCase())) {
    words.pop();
  }
  while (words.length && filler.has(words[0].toLowerCase())) {
    words.shift();
  }
  const compact = words.filter((word, index) => !(filler.has(word.toLowerCase()) && filler.has((words[index + 1] ?? '').toLowerCase())));

  cleaned = compact.join(' ').trim();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Lançamento';
}

function inferCategory(description: string, type: TransactionType): string {
  const normalized = normalize(description);
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(normalized)) {
      return category;
    }
  }
  return type === 'entrada' ? 'outros' : 'outros';
}

function parseDueDate(text: string, today: Date): string | null {
  const normalized = normalize(text);
  const match = normalized.match(/ate\s+(?:o\s+)?(?:fim\s+de\s+|final\s+de\s+)?([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (!match || MONTHS[match[1]] === undefined) {
    return null;
  }

  const month = MONTHS[match[1]];
  let year = match[2] ? Number(match[2]) : today.getFullYear();
  if (!match[2] && month < today.getMonth()) {
    year += 1;
  }
  const lastDay = new Date(year, month + 1, 0);
  return lastDay.toISOString().slice(0, 10);
}

function monthsUntil(dueDate: string, today: Date): number {
  const [year, month] = dueDate.split('-').map(Number);
  return Math.max(1, (year - today.getFullYear()) * 12 + (month - 1 - today.getMonth()));
}

function lastUserText(history: AssistantMessage[]): string {
  return [...history].reverse().find((message) => message.role === 'user')?.text ?? '';
}

function bucketLabel(context: AssistantContext, bucketId: string): string {
  return context.buckets.find((bucket) => bucket.id === bucketId)?.label ?? bucketId;
}

export class MockAssistantClient implements AssistantClient {
  async reply(history: AssistantMessage[], context: AssistantContext): Promise<AssistantReply> {
    // Pequena pausa para o indicador de "pensando" aparecer, como será com o modelo real.
    await new Promise((resolve) => window.setTimeout(resolve, 650 + Math.random() * 500));

    const text = lastUserText(history);
    const normalized = normalize(text);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);

    if (/^(oi|ola|e ai|eai|bom dia|boa tarde|boa noite|hey|opa)\b/.test(normalized)) {
      return {
        text: `Oi${context.userName ? `, ${context.userName}` : ''}. Me diz um gasto, uma entrada, uma meta ou uma compra pra simular que eu preparo pra você confirmar.`,
      };
    }

    if (/\b(simul\w*|e se eu|se eu comprar|quanto fica|vale a pena|compensa)\b/.test(normalized)) {
      const total = parseAmount(text);
      if (!total) {
        return { text: 'Quanto custa essa compra? Com o valor eu abro a simulação.' };
      }
      const installments = parseInstallments(text);
      const mode = installments > 1 ? 'parcelado' : /todo mes|mensal|por mes/.test(normalized) ? 'recorrente' : 'avista';
      const description = parseDescription(text.replace(/\b(simul\w*|e se eu|se eu comprar|quanto fica|vale a pena|compensa)\b/gi, ''));
      const action: AssistantAction = {
        payload: { type: 'simulate_purchase', data: { description, total, mode, installments, bucketId: 'uso-diario' } },
        summary: [
          { label: 'Compra', value: description },
          { label: 'Valor', value: currency.format(total) },
          { label: 'Forma', value: mode === 'parcelado' ? `${installments}x de ${currency.format(total / installments)}` : mode === 'recorrente' ? 'todo mês' : 'à vista' },
          { label: 'Sai de', value: bucketLabel(context, 'uso-diario') },
        ],
        status: 'pending',
      };
      return { text: 'Preparei a simulação. Confirma que eu abro com os números preenchidos.', action };
    }

    if (/\b(meta|juntar|guardar|economizar|poupar)\b/.test(normalized)) {
      const target = parseAmount(text);
      if (!target) {
        return { text: 'Qual o valor que você quer juntar? Com ele eu monto a meta.' };
      }
      const dueDate = parseDueDate(text, today);
      const titleMatch = text.match(/\b(?:pra|para|de|da|do)\s+(?:a|o|uma|um)?\s*([^,.]+?)(?:\s+ate\b|\s+até\b|$)/i);
      const title = titleMatch ? titleMatch[1].trim().replace(/^\w/, (c) => c.toUpperCase()) : 'Nova meta';
      const saveAmount = dueDate
        ? Math.ceil(target / monthsUntil(dueDate, today))
        : Math.max(50, Math.round(context.monthlyIncome * 0.1));

      const action: AssistantAction = {
        payload: {
          type: 'create_goal',
          data: { title, targetAmount: target, currentAmount: 0, saveAmount, saveFrequency: 'mensal', dueDate },
        },
        summary: [
          { label: 'Meta', value: title },
          { label: 'Alvo', value: currency.format(target) },
          { label: 'Guardar', value: `${currency.format(saveAmount)} por mês` },
          { label: 'Prazo', value: dueDate ?? 'sem prazo' },
        ],
        status: 'pending',
      };
      return {
        text: dueDate
          ? `Pra chegar em ${currency.format(target)} até ${dueDate.slice(0, 7)}, dá ${currency.format(saveAmount)} por mês.`
          : `Sugeri ${currency.format(saveAmount)} por mês (10% da renda). Ajusta depois se quiser.`,
        action,
      };
    }

    const isIncome = /\b(recebi|ganhei|entrou|caiu|recebimento|renda)\b/.test(normalized);
    const isCredit = /\b(cartao|credito|parcel|\d+\s*x)\b/.test(normalized);
    const isExpense = /\b(gastei|paguei|comprei|torrei|saiu|gasto|conta|lanc\w*|registra|anota)\b/.test(normalized);

    if (isIncome || isCredit || isExpense) {
      const amount = parseAmount(text);
      if (!amount) {
        return { text: 'Entendi o lançamento, só faltou o valor. Quanto foi?' };
      }

      const type: TransactionType = isIncome ? 'entrada' : isCredit ? 'credito' : 'saida';
      const description = parseDescription(text);
      const category = inferCategory(description, type);
      const installments = type === 'credito' ? parseInstallments(text) : 1;
      const distribute = type === 'entrada' && /salario|distribu/.test(normalized);

      const action: AssistantAction = {
        payload: {
          type: 'add_transaction',
          data: {
            description,
            type,
            amount,
            category,
            date: todayIso,
            allocationMode: distribute ? 'percentual' : 'especifico',
            bucketId: 'uso-diario',
            installments,
          },
        },
        summary: [
          { label: 'Tipo', value: type === 'entrada' ? 'Entrada' : type === 'credito' ? 'Crédito' : 'Saída' },
          { label: 'Descrição', value: description },
          { label: 'Valor', value: installments > 1 ? `${currency.format(amount)} em ${installments}x` : currency.format(amount) },
          { label: 'Categoria', value: category },
          { label: type === 'credito' ? 'Fatura' : distribute ? 'Destino' : 'Divisão', value: type === 'credito' ? 'cartão de crédito' : distribute ? 'distribuir entre todas' : bucketLabel(context, 'uso-diario') },
        ],
        status: 'pending',
      };

      return {
        text: type === 'credito'
          ? 'Vai pra fatura do cartão, sem mexer no saldo. Confere e confirma.'
          : 'Montei o lançamento com a data de hoje. Confere e confirma.',
        action,
      };
    }

    if (/\b(fatura|cartao)\b/.test(normalized)) {
      return {
        text: `Sua fatura aberta${context.credit.openInvoiceLabel ? ` (${context.credit.openInvoiceLabel})` : ''} está em ${currency.format(context.credit.openInvoiceTotal)}. Fecha dia ${context.credit.closingDay} e vence dia ${context.credit.dueDay}.`,
      };
    }

    if (/\b(saldo|quanto (eu )?tenho|quanto sobra|como (eu )?to|como estou)\b/.test(normalized)) {
      const daily = context.buckets.find((bucket) => bucket.id === 'uso-diario');
      return {
        text: `Você tem ${currency.format(context.saldoTotal)} no total${daily ? `, sendo ${currency.format(daily.balance)} no ${daily.label}` : ''}.`,
      };
    }

    if (/\b(meta|metas)\b/.test(normalized) && context.goals.length) {
      const lines = context.goals.map((goal) => `${goal.title}: ${currency.format(goal.currentAmount)} de ${currency.format(goal.targetAmount)}`);
      return { text: lines.join('. ') + '.' };
    }

    return {
      text: 'Ainda estou no modo local, sem modelo conectado — entendo frases simples como "gastei 50 no mercado", "comprei um fone de 300 em 3x no cartão", "quero juntar 5 mil pra viagem até dezembro" ou "simula um notebook de 4 mil em 10x".',
    };
  }
}

import { CreditConfig, FinanceTransaction } from '../Models/finance.model';

export type InvoiceStatus = 'aberta' | 'fechada' | 'vencida' | 'paga' | 'futura';

export interface InvoiceItem {
  transactionId: string;
  description: string;
  category: string;
  date: string;
  amount: number;
  installment: number;
  installments: number;
}

export interface CreditInvoice {
  /** Mês de vencimento no formato YYYY-MM — é a chave que liga fatura e pagamento. */
  key: string;
  label: string;
  closingDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  total: number;
  items: InvoiceItem[];
  paymentTransactionId: string | null;
}

export const DEFAULT_CREDIT_CONFIG: CreditConfig = { id: 1, closingDay: 25, dueDay: 5 };

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function invoiceLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]}/${String(year).slice(2)}`;
}

/** Data de fechamento da fatura em que uma compra feita em `date` cai. */
export function closingDateFor(date: Date, config: CreditConfig, monthOffset = 0): Date {
  const rollsToNext = date.getDate() >= config.closingDay ? 1 : 0;
  return new Date(date.getFullYear(), date.getMonth() + rollsToNext + monthOffset, config.closingDay);
}

export function dueDateFor(closingDate: Date, config: CreditConfig): Date {
  const sameMonth = config.dueDay > config.closingDay ? 0 : 1;
  return new Date(closingDate.getFullYear(), closingDate.getMonth() + sameMonth, config.dueDay);
}

/** Divide o total em parcelas iguais; a última absorve a diferença de arredondamento. */
export function installmentAmounts(total: number, count: number): number[] {
  const parts = Math.max(1, Math.round(count));
  const base = round(total / parts);
  const amounts = Array.from({ length: parts }, () => base);
  amounts[parts - 1] = round(total - base * (parts - 1));
  return amounts;
}

export function buildInvoices(
  transactions: FinanceTransaction[],
  config: CreditConfig,
  today: Date = new Date()
): CreditInvoice[] {
  const now = startOfDay(today);
  const byKey = new Map<string, CreditInvoice>();

  const ensure = (closingDate: Date): CreditInvoice => {
    const dueDate = dueDateFor(closingDate, config);
    const key = monthKey(dueDate);
    let invoice = byKey.get(key);
    if (!invoice) {
      invoice = {
        key,
        label: invoiceLabel(key),
        closingDate,
        dueDate,
        status: 'futura',
        total: 0,
        items: [],
        paymentTransactionId: null,
      };
      byKey.set(key, invoice);
    }
    return invoice;
  };

  // A fatura aberta sempre existe, mesmo vazia.
  const openInvoice = ensure(closingDateFor(now, config));

  for (const transaction of transactions) {
    if (transaction.type !== 'credito') {
      continue;
    }

    const purchaseDate = parseLocalDate(transaction.date);
    const amounts = installmentAmounts(transaction.amount, transaction.installments);

    amounts.forEach((amount, index) => {
      const invoice = ensure(closingDateFor(purchaseDate, config, index));
      invoice.items.push({
        transactionId: transaction.id,
        description: transaction.description,
        category: transaction.category,
        date: transaction.date,
        amount,
        installment: index + 1,
        installments: amounts.length,
      });
      invoice.total = round(invoice.total + amount);
    });
  }

  const payments = new Map<string, string>();
  for (const transaction of transactions) {
    if (transaction.type === 'saida' && transaction.paidInvoice) {
      payments.set(transaction.paidInvoice, transaction.id);
    }
  }

  const invoices = [...byKey.values()].sort((left, right) => left.key.localeCompare(right.key));

  for (const invoice of invoices) {
    invoice.items.sort((left, right) => right.date.localeCompare(left.date));
    invoice.paymentTransactionId = payments.get(invoice.key) ?? null;

    if (invoice.paymentTransactionId) {
      invoice.status = 'paga';
    } else if (invoice.key === openInvoice.key) {
      invoice.status = 'aberta';
    } else if (invoice.key < openInvoice.key) {
      invoice.status = now > invoice.dueDate ? 'vencida' : 'fechada';
    } else {
      invoice.status = 'futura';
    }
  }

  return invoices;
}

export interface CreditProjectionRow {
  key: string;
  label: string;
  dueDate: Date;
  existing: number;
  added: number;
  total: number;
}

export interface CreditProjection {
  rows: CreditProjectionRow[];
  peak: CreditProjectionRow | null;
  averageTotal: number;
  installmentAmount: number;
}

/** Projeta as próximas faturas somando uma compra hipotética às parcelas já comprometidas. */
export function projectInvoices(
  invoices: CreditInvoice[],
  purchase: { total: number; installments: number; date: Date },
  config: CreditConfig,
  minMonths = 6,
  today: Date = new Date()
): CreditProjection {
  const now = startOfDay(today);
  const existing = new Map(
    invoices.filter((invoice) => invoice.status !== 'paga').map((invoice) => [invoice.key, invoice.total])
  );

  const added = new Map<string, number>();
  const amounts = purchase.total > 0 ? installmentAmounts(purchase.total, purchase.installments) : [];
  amounts.forEach((amount, index) => {
    const key = monthKey(dueDateFor(closingDateFor(purchase.date, config, index), config));
    added.set(key, round((added.get(key) ?? 0) + amount));
  });

  const firstClosing = closingDateFor(now, config);
  const horizon = Math.max(minMonths, amounts.length + 1);
  const rows: CreditProjectionRow[] = [];

  for (let offset = 0; offset < horizon; offset += 1) {
    const closingDate = new Date(firstClosing.getFullYear(), firstClosing.getMonth() + offset, config.closingDay);
    const dueDate = dueDateFor(closingDate, config);
    const key = monthKey(dueDate);
    const existingTotal = existing.get(key) ?? 0;
    const addedTotal = added.get(key) ?? 0;

    rows.push({
      key,
      label: invoiceLabel(key),
      dueDate,
      existing: existingTotal,
      added: addedTotal,
      total: round(existingTotal + addedTotal),
    });
  }

  const peak = rows.reduce<CreditProjectionRow | null>(
    (best, row) => (best === null || row.total > best.total ? row : best),
    null
  );

  return {
    rows,
    peak,
    averageTotal: rows.length ? round(rows.reduce((sum, row) => sum + row.total, 0) / rows.length) : 0,
    installmentAmount: amounts[0] ?? 0,
  };
}

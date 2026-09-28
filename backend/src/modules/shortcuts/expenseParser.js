/**
 * Lê um gasto falado para a Siri: "gastei 2 reais com bala", "R$ 35,90 no mercado",
 * "cento e vinte reais de gasolina". Mesma ideia do modo local da Mai
 * (src/app/Services/assistant-mock.client.ts), só que no servidor e só para saídas.
 */

const CATEGORY_RULES = [
  [/mercado|supermercado|feira|hortifruti|acougue/, 'mercado'],
  [/ifood|lanche|restaurante|pizza|hamburg|almoco|jantar|cafe|padaria|bala|doce|chocolate|sorvete|salgado|acai/, 'alimentação'],
  [/uber|\b99\b|gasolina|combust|onibus|metro|estacionamento|pedagio/, 'transporte'],
  [/netflix|spotify|assinatura|disney|prime|youtube|hbo/, 'assinaturas'],
  [/fone|celular|notebook|\bpc\b|computador|monitor|teclado|mouse|\btv\b|televis/, 'eletrônicos'],
  [/remedio|farmacia|medico|dentista|consulta|academia/, 'saúde'],
  [/aluguel|\bluz\b|conta de agua|internet|condominio|\bgas\b/, 'moradia'],
  [/roupa|tenis|calca|camisa|sapato/, 'roupas'],
  [/curso|livro|faculdade|escola/, 'educação'],
  [/cinema|show|\bbar\b|balada|jogo|viagem/, 'lazer'],
];

const NUMBER_WORDS = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
  dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
  sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200,
  duzentas: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600,
  setecentos: 700, oitocentos: 800, novecentos: 900,
};

/** Palavras de comando, verbo de gasto, moeda e tempo: saem da descrição. */
const NOISE = new Set([
  'ei', 'ai', 'siri', 'fala', 'diz', 'avisa', 'mai', 'maibank', 'que', 'eu', 'gastei', 'paguei', 'comprei',
  'torrei', 'foi', 'lanca', 'registra', 'anota', 'coloca', 'reais', 'real', 'conto', 'contos', 'pila',
  'centavo', 'centavos', 'hoje', 'agora', 'so',
]);

/** Preposições e artigos: ficam no meio ("conta de luz"), saem das pontas. */
const FILLER = new Set(['no', 'na', 'nos', 'nas', 'em', 'com', 'de', 'do', 'da', 'dos', 'das', 'por', 'pro', 'pra', 'para', 'o', 'a', 'os', 'as', 'um', 'uma', 'e']);

export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(raw) {
  const value = Number(raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw);
  return Number.isFinite(value) ? value : null;
}

const isNumberWord = (word) => word === 'mil' || NUMBER_WORDS[word] !== undefined;

/** Lê números por extenso a partir de `start`: "cento e vinte e cinco" → { value: 125, end }. */
function readSpelled(words, start) {
  let total = 0;
  let current = 0;
  let end = start;
  for (let index = start; index < words.length; index++) {
    const word = words[index];
    if (word === 'e' && isNumberWord(words[index + 1] ?? '')) {
      continue;
    }
    if (word === 'mil') {
      total += (current || 1) * 1000;
      current = 0;
    } else if (NUMBER_WORDS[word] !== undefined) {
      current += NUMBER_WORDS[word];
    } else {
      break;
    }
    end = index + 1;
  }
  return end > start ? { value: total + current, end } : null;
}

/** "cinquenta reais", "dois reais e cinquenta centavos", "dez e noventa" (dez reais e noventa). */
function spelledAmount(normalized) {
  const words = normalized.split(' ');
  const start = words.findIndex(isNumberWord);
  if (start < 0) {
    return null;
  }
  const reais = readSpelled(words, start);
  if (!reais) {
    return null;
  }

  // Tudo junto e terminando em "centavos": "dez e noventa centavos" = 10,90, mas
  // "vinte e cinco centavos" = 0,25 (dezena + unidade é um número só).
  if (/^centavos?$/.test(words[reais.end] ?? '')) {
    const run = words.slice(start, reais.end);
    const lastE = run.lastIndexOf('e');
    const before = lastE > 0 ? readSpelled(run.slice(0, lastE), 0) : null;
    const after = lastE > 0 ? readSpelled(run.slice(lastE + 1), 0) : null;
    const compound = before && after && after.value < 10 && before.value % 10 === 0 && before.value >= 20 && before.value <= 90;
    if (before && after && !compound && after.value < 100) {
      return before.value + after.value / 100;
    }
    return reais.value < 100 ? reais.value / 100 : reais.value;
  }

  let cursor = reais.end;
  const saidReais = /^reais?$/.test(words[cursor] ?? '');
  if (saidReais) {
    cursor += 1;
  }
  if (words[cursor] === 'e') {
    const cents = readSpelled(words, cursor + 1);
    const saidCents = /^centavos?$/.test(words[cents?.end ?? -1] ?? '');
    if (cents && cents.value < 100 && (saidReais || saidCents)) {
      return reais.value + cents.value / 100;
    }
  }
  return reais.value;
}

export function parseAmount(text) {
  const normalized = normalize(text);

  const withCents = normalized.match(/(\d+)\s*reais?\s*e\s*(\d{1,2})\s*centavos?/);
  if (withCents) {
    return Number(withCents[1]) + Number(withCents[2]) / 100;
  }

  const thousands = normalized.match(/(\d+(?:[.,]\d+)?)\s*mil\b/);
  if (thousands) {
    return Math.round(toNumber(thousands[1]) * 1000 * 100) / 100;
  }

  const digits = normalized.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/);
  if (digits) {
    const value = toNumber(digits[1]);
    return value && value > 0 ? value : null;
  }

  const spelled = spelledAmount(normalized);
  return spelled && spelled > 0 ? spelled : null;
}

/**
 * Descrição = o que sobra tirando números, moeda, verbos e o comando para a Siri.
 * Guarda a palavra original (com acento) ao lado da normalizada.
 */
export function parseDescription(text) {
  const tokens = String(text ?? '')
    .replace(/r\$/gi, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/^[.,!?;:"']+|[.,!?;:"']+$/g, ''))
    .filter(Boolean)
    .map((original) => ({ original, norm: normalize(original) }));

  const kept = [];
  let gap = false;
  for (const token of tokens) {
    const isAmount = /^\d/.test(token.norm) || isNumberWord(token.norm);
    if (isAmount || NOISE.has(token.norm)) {
      gap = true;
      continue;
    }
    kept.push({ ...token, afterGap: gap });
    gap = false;
  }

  // Preposição que ficou encostada em outra por causa do que saiu ("bala de [2 reais] com chocolate")
  const words = kept.filter((token, index) => {
    const next = kept[index + 1];
    return !(FILLER.has(token.norm) && next && FILLER.has(next.norm) && next.afterGap);
  });
  while (words.length && FILLER.has(words[0].norm)) {
    words.shift();
  }
  while (words.length && FILLER.has(words[words.length - 1].norm)) {
    words.pop();
  }

  if (!words.length) {
    return null;
  }
  const label = words.map((token) => token.original.toLowerCase()).join(' ').slice(0, 120);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function inferCategory(description) {
  const normalized = normalize(description);
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(normalized)) {
      return category;
    }
  }
  return 'outros';
}

/** { amount, description, category } ou null se não achou um valor. */
export function parseExpense(text) {
  const amount = parseAmount(text);
  if (!amount || amount > 1_000_000) {
    return null;
  }
  const description = parseDescription(text) ?? 'Gasto pela Siri';
  return { amount: Math.round(amount * 100) / 100, description, category: inferCategory(description) };
}

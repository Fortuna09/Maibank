import { AssistantContext } from '../Models/assistant.model';

/**
 * Prompt de papel da assistente (role prompting) + definição das ferramentas.
 *
 * Pensado para o Claude via Messages API: `system` recebe `buildSystemPrompt(context)`
 * e `tools` recebe `ASSISTANT_TOOLS`. Cada `tool_use` que o modelo devolver vira uma
 * `AssistantAction` pendente na tela — o usuário sempre confirma antes de executar.
 *
 * A parte fixa (papel, regras, ferramentas) fica no início para aproveitar cache de prompt;
 * o contexto financeiro, que muda a cada mensagem, vem por último.
 */

export const ASSISTANT_NAME = 'Mai';

const ROLE_PROMPT = `Você é a Mai, assistente financeira pessoal dentro do Maibank — um app de finanças de uso próprio, feito por uma única pessoa para controlar o próprio dinheiro. Você conversa em português do Brasil, de forma direta, curta e sem formalidade excessiva. Você fala como uma amiga que entende de dinheiro, não como um banco.

## O que você faz
Você ajuda a pessoa a:
1. **Registrar lançamentos** (entradas, saídas e compras no crédito) a partir de frases soltas como "gastei 50 no mercado" ou "comprei um fone de 300 em 3x no cartão".
2. **Criar metas** de economia ("quero juntar 5 mil pra viagem até dezembro").
3. **Rodar simulações** de compra ("e se eu comprar um notebook de 4 mil parcelado em 10x?") e interpretar o resultado.
4. **Responder perguntas** sobre a situação financeira atual usando o contexto fornecido (saldo, divisões, metas, fatura do cartão, lançamentos recentes).

## Como o dinheiro funciona aqui
- O saldo é dividido em **divisões** por porcentagem da renda (ex.: Uso diário, Reserva de emergência, Carro, Planos futuros). Toda saída sai de uma divisão específica, e "Uso diário" é a padrão para gastos do dia a dia.
- Entradas podem ir para uma divisão só ou ser **distribuídas** entre todas pelas porcentagens (é o que acontece com o salário).
- **Crédito não mexe no saldo**: a compra entra na fatura do cartão e só vira saída de verdade quando a fatura é paga. Parcelas caem uma em cada fatura seguinte.
- Metas têm valor alvo, valor atual, aporte periódico (mensal ou semanal) e prazo opcional.
- Valores são sempre em reais (R$). Datas no formato AAAA-MM-DD.

## Regras de comportamento
- **Nunca execute nada sozinha.** Para registrar, criar ou simular, use a ferramenta correspondente; o app mostra um cartão de confirmação e a pessoa decide. Depois da ferramenta, escreva no máximo uma frase curta — o cartão já mostra os detalhes.
- Se faltar informação essencial (valor, ou para meta o valor alvo), **pergunte** em uma linha. Não invente valores. Para o resto, use padrões sensatos e diga qual usou: data = hoje, tipo = saída, divisão = Uso diário, categoria deduzida da descrição, parcelas = 1.
- Quando a pessoa citar "cartão", "crédito", "parcelado" ou "Nx", o lançamento é do tipo crédito.
- Categorias são curtas e minúsculas: alimentação, mercado, transporte, lazer, saúde, moradia, salário, assinaturas, eletrônicos, roupas, educação, outros.
- Ao responder perguntas sobre a situação, use os números do contexto e seja objetiva. Se não houver dado suficiente, diga isso em vez de estimar.
- Pode alertar quando uma compra deixaria uma divisão negativa ou uma fatura muito alta em relação à renda, mas sem sermão: uma frase.
- Não dê conselhos de investimento nem recomende produtos financeiros.
- Respostas curtas. Nada de listas longas, títulos ou emojis. Use no máximo dois parágrafos, a não ser que a pessoa peça detalhes.
`;

/** Ferramentas no formato do Messages API (`tools`). Cada uma vira um cartão de confirmação no app. */
export const ASSISTANT_TOOLS = [
  {
    name: 'add_transaction',
    description:
      'Propõe registrar um lançamento (entrada, saída ou compra no crédito). O usuário confirma antes de salvar. Use quando a pessoa descrever um gasto, um recebimento ou uma compra no cartão.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        description: { type: 'string', description: 'Descrição curta, como a pessoa falou (ex.: "mercado", "fone bluetooth").' },
        type: { type: 'string', enum: ['entrada', 'saida', 'credito'], description: 'entrada = dinheiro que entra; saida = gasto à vista/débito; credito = compra no cartão de crédito.' },
        amount: { type: 'number', description: 'Valor total em reais, positivo.' },
        category: { type: 'string', description: 'Categoria curta em minúsculas.' },
        date: { type: 'string', description: 'Data AAAA-MM-DD. Padrão: hoje.' },
        allocationMode: { type: 'string', enum: ['especifico', 'percentual'], description: 'especifico = uma divisão; percentual = distribui entre todas (só faz sentido para entradas tipo salário). Ignorado para crédito.' },
        bucketId: { type: 'string', description: 'Id da divisão de origem/destino (ver contexto). Padrão: uso-diario.' },
        installments: { type: 'integer', minimum: 1, maximum: 36, description: 'Só para crédito: número de parcelas. 1 = à vista.' },
      },
      required: ['description', 'type', 'amount', 'category', 'date', 'allocationMode', 'bucketId', 'installments'],
    },
    strict: true,
  },
  {
    name: 'create_goal',
    description: 'Propõe criar uma meta de economia. O usuário confirma antes de salvar.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string', description: 'Nome da meta (ex.: "Viagem", "Trocar de PC").' },
        targetAmount: { type: 'number', description: 'Valor alvo em reais.' },
        currentAmount: { type: 'number', description: 'Quanto já tem guardado. Padrão: 0.' },
        saveAmount: { type: 'number', description: 'Aporte por período em reais. Se a pessoa não disser, calcule pelo prazo ou sugira 10% da renda mensal.' },
        saveFrequency: { type: 'string', enum: ['mensal', 'semanal'] },
        dueDate: { type: ['string', 'null'], description: 'Prazo AAAA-MM-DD ou null.' },
      },
      required: ['title', 'targetAmount', 'currentAmount', 'saveAmount', 'saveFrequency', 'dueDate'],
    },
    strict: true,
  },
  {
    name: 'simulate_purchase',
    description:
      'Abre a tela de simulação já preenchida com uma compra hipotética, para ver o saldo da divisão nos próximos 6 meses comprando vs. não comprando. Nada é salvo.',
    input_schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        description: { type: 'string' },
        total: { type: 'number', description: 'Valor total em reais.' },
        mode: { type: 'string', enum: ['avista', 'parcelado', 'recorrente'], description: 'avista = paga tudo no mês 1; parcelado = divide em N meses; recorrente = paga o valor todo mês.' },
        installments: { type: 'integer', minimum: 1, maximum: 36, description: 'Parcelas quando mode = parcelado. Caso contrário 1.' },
        bucketId: { type: 'string', description: 'Divisão de onde sai. Padrão: uso-diario.' },
      },
      required: ['description', 'total', 'mode', 'installments', 'bucketId'],
    },
    strict: true,
  },
] as const;

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Bloco volátil: vai depois do papel/ferramentas para não invalidar o cache do prefixo. */
export function buildContextBlock(context: AssistantContext): string {
  const buckets = context.buckets
    .map((bucket) => `- ${bucket.label} (id: ${bucket.id}, ${bucket.percentage}% da renda): ${currency.format(bucket.balance)}`)
    .join('\n');

  const goals = context.goals.length
    ? context.goals
        .map(
          (goal) =>
            `- ${goal.title}: ${currency.format(goal.currentAmount)} de ${currency.format(goal.targetAmount)}, guardando ${currency.format(goal.saveAmount)} por ${goal.saveFrequency === 'semanal' ? 'semana' : 'mês'}${goal.dueDate ? `, prazo ${goal.dueDate}` : ''}`
        )
        .join('\n')
    : '- nenhuma meta cadastrada';

  const recent = context.recentTransactions.length
    ? context.recentTransactions
        .map((item) => `- ${item.date} · ${item.type} · ${item.description} (${item.category}) · ${currency.format(item.amount)}`)
        .join('\n')
    : '- nenhum lançamento ainda';

  return `## Contexto de hoje (${context.today})
Pessoa: ${context.userName || 'sem nome cadastrado'}
Renda mensal: ${currency.format(context.monthlyIncome)}
Saldo total: ${currency.format(context.saldoTotal)}

Divisões e saldo atual:
${buckets}

Metas:
${goals}

Cartão de crédito: fecha dia ${context.credit.closingDay}, vence dia ${context.credit.dueDay}. Fatura aberta${context.credit.openInvoiceLabel ? ` (${context.credit.openInvoiceLabel})` : ''}: ${currency.format(context.credit.openInvoiceTotal)}

Últimos lançamentos:
${recent}`;
}

export function buildSystemPrompt(context: AssistantContext): string {
  return `${ROLE_PROMPT}\n${buildContextBlock(context)}`;
}

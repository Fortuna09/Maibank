export interface TourStep {
  title: string;
  text: string;
  /** Seletor do elemento destacado (atributo `data-tour`). Sem alvo, o balão fica no centro. */
  target?: string;
  /** Tela onde o alvo está; o tour navega até ela antes de destacar. */
  route?: string;
}

/**
 * Tour de boas-vindas: mostrado na primeira entrada e reaberto pelo botão "?" ou em
 * Configurações > Ajuda. Os alvos são marcados no HTML com `data-tour="..."`.
 */
export const WELCOME_TOUR: TourStep[] = [
  {
    title: 'Bem-vindo ao Maibank',
    text: 'Aqui você registra seu dinheiro à mão — nada é puxado do banco. Em um minuto eu mostro onde fica cada coisa.',
  },
  {
    title: 'Seu dinheiro, dividido',
    text: 'Toda entrada é repartida em divisões (Uso diário, Reserva…). O número grande é o que sobra no Uso diário: o quanto dá para gastar no dia a dia. Ao lado, o saldo somando todas as divisões e a fatura atual do cartão.',
    target: '[data-tour="home-balance"]',
    route: '/',
  },
  {
    title: 'Registrar um lançamento',
    text: 'Entradas, gastos e compras no cartão começam aqui. Você escolhe de qual divisão o dinheiro sai — ou, numa entrada, se ele é repartido entre todas.',
    target: '[data-tour="new-transaction"]',
    route: '/',
  },
  {
    title: 'Lançamentos',
    text: 'O resumo de cada divisão e o histórico completo, com busca e gráfico. Para apagar um lançamento, passe o mouse sobre ele.',
    target: '[data-tour="nav-lancamentos"]',
  },
  {
    title: 'Metas',
    text: 'Diga quanto quer juntar e quanto vai guardar por mês ou semana: o app mostra quando você chega lá.',
    target: '[data-tour="nav-metas"]',
  },
  {
    title: 'Crédito',
    text: 'Compra no cartão não sai do saldo na hora: vai para a fatura, e as parcelas caem nas faturas seguintes. Quando pagar a fatura, registre o pagamento — aí sim o dinheiro sai.',
    target: '[data-tour="nav-credito"]',
  },
  {
    title: 'Simulação',
    text: 'Antes de comprar, veja como ficam seu saldo ou suas faturas nos próximos meses. Nada do que você simula é salvo.',
    target: '[data-tour="nav-simulacao"]',
  },
  {
    title: 'Mai, sua assistente',
    text: 'Escreva algo como "gastei 50 no mercado" e ela prepara o lançamento — você só confirma. Atalho: Ctrl+I.',
    target: '[data-tour="nav-mai"]',
  },
  {
    title: 'Comece pelas Configurações',
    text: 'Ajuste as divisões e suas porcentagens, ative o salário automático e informe o fechamento do cartão. Com isso, o resto do app passa a fazer sentido.',
    target: '[data-tour="nav-config"]',
  },
  {
    title: 'Ficou com dúvida?',
    text: 'Este botão abre o tour de novo. Em Configurações > Ajuda estão as explicações de cada parte.',
    target: '[data-tour="nav-help"]',
  },
];

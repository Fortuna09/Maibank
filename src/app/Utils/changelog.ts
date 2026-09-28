export type ChangeKind = 'novo' | 'melhoria' | 'correcao';

export interface Release {
  /** Versão semântica: novidade sobe o meio (1.2.0), correção sobe o fim (1.1.1). */
  version: string;
  /** Data do deploy, AAAA-MM-DD. */
  date: string;
  title: string;
  changes: Array<{ kind: ChangeKind; text: string }>;
}

/**
 * Histórico de versões mostrado para quem usa o app. A mais nova vem PRIMEIRO.
 *
 * Toda entrega que muda algo para o usuário ganha uma entrada aqui, escrita para
 * quem usa — não para quem programa. Quem entrar depois do deploy vê as novidades
 * uma vez; o histórico completo fica em Configurações > Novidades.
 */
export const CHANGELOG: Release[] = [
  {
    version: '2.2.1',
    date: '2026-09-28',
    title: 'Siri mais esperta com centavos',
    changes: [
      {
        kind: 'correcao',
        text: 'Gastos pela Siri: "seis e sessenta e sete", "6 e 67" e "67 centavos" agora viram o valor certo, com centavos.',
      },
      {
        kind: 'melhoria',
        text: 'Siri e atalhos: o atalho agora se chama "Anotar gasto" (a Siri confundia "Mai" com "mãe"), e há um jeito de perguntar o valor à parte para os centavos nunca errarem.',
      },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-09-28',
    title: 'Cromado escuro',
    changes: [
      {
        kind: 'novo',
        text: 'Modo escuro novo, no mesmo estilo cromado: grafite escovado, metal escuro polido e o M em prata. Escolha em Configurações > Aparência > Tema.',
      },
      {
        kind: 'melhoria',
        text: 'Os temas agora são Claro (o cromado de sempre, padrão) e Escuro. O cinza e o branco antigos saíram — quem usava o escuro antigo já abre no escuro cromado.',
      },
    ],
  },
  {
    version: '2.1.1',
    date: '2026-09-27',
    title: 'Ajuste no atalho da Siri',
    changes: [
      {
        kind: 'correcao',
        text: 'O atalho da Siri agora aceita o campo do corpo escrito como "Texto" ou "texto", do jeito que o app Atalhos gravar — antes a Siri respondia "não ouvi nada".',
      },
      {
        kind: 'melhoria',
        text: 'O passo a passo em Siri e atalhos agora usa "Pedir Entrada" em vez de "Ditar Texto" (que pela Siri dava erro de ajustes ou região) e avisa sobre o erro mais comum ao montar.',
      },
      {
        kind: 'melhoria',
        text: 'Voltando para o app depois de lançar pela Siri, os lançamentos se atualizam sozinhos.',
      },
    ],
  },
  {
    version: '2.1.0',
    date: '2026-09-27',
    title: 'Gastos pela Siri',
    changes: [
      {
        kind: 'novo',
        text: 'No iPhone, lance gastos falando com a Siri: "E aí Siri, Mai" e depois "2 reais de bala". Entra na hora como saída do Uso diário, sem abrir o app. Para ativar: Configurações > Siri e atalhos.',
      },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-09-27',
    title: 'Maibank Cromado',
    changes: [
      {
        kind: 'novo',
        text: 'Visual novo: o Maibank agora é cromado, com a cara da nova logo — metal escovado, detalhes polidos e um brilho holográfico. Prefere o escuro ou o claro? Estão em Configurações > Aparência.',
      },
      {
        kind: 'novo',
        text: 'Ícone novo do app. No iPhone, para ele aparecer, remova o Maibank da Tela de Início e adicione de novo.',
      },
      { kind: 'novo', text: 'Entrar e Criar conta também ganharam o visual cromado.' },
      {
        kind: 'novo',
        text: 'O Maibank agora pode te mandar recados: quando tiver uma mensagem para você, ela aparece ao abrir o app.',
      },
      {
        kind: 'melhoria',
        text: 'No celular, a barra de cima desceu um pouco (sai do desfoque do iPhone) e a de baixo ficou mais baixa, sem faixa vazia.',
      },
      {
        kind: 'melhoria',
        text: 'Ficou muito tempo sem abrir? As novidades mostram só a versão mais nova; as anteriores estão em Configurações > Novidades.',
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-09-27',
    title: 'Tema Cromado (em teste)',
    changes: [
      {
        kind: 'novo',
        text: 'Tema Cromado, inspirado na nova logo: fundo de metal escovado, detalhes cromados e um brilho holográfico discreto. Ainda em teste — escolha em Configurações > Aparência > Tema.',
      },
      { kind: 'melhoria', text: 'No celular, sem barra de rolagem aparecendo: é só rolar.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-27',
    title: 'Celular mais arrumado',
    changes: [
      {
        kind: 'novo',
        text: 'No celular, o Histórico ganhou o botão Filtrar: busca, data e agora também o tipo (entradas, saídas ou crédito), num pop-up com "Limpar filtros".',
      },
      {
        kind: 'melhoria',
        text: 'No celular, o botão + de novo lançamento foi para a linha das abas e não cobre mais a lista.',
      },
      {
        kind: 'melhoria',
        text: 'No celular, o Início ficou mais enxuto: uso diário e saldo total lado a lado, a fatura numa linha só e as metas logo abaixo.',
      },
      { kind: 'melhoria', text: 'No celular, "Saldos por tipo" em Lançamentos abre num pop-up, só quando você quiser ver.' },
      { kind: 'melhoria', text: 'O ícone de Configurações agora é uma engrenagem.' },
    ],
  },
  {
    version: '1.1.1',
    date: '2026-09-27',
    title: 'Ajustes no celular',
    changes: [
      {
        kind: 'melhoria',
        text: 'Configurações no celular agora é uma lista com todas as opções à vista — toque numa delas e use o ‹ lá em cima para voltar.',
      },
      { kind: 'melhoria', text: 'O app instalado não dá mais zoom com dois dedos nem com toque duplo.' },
      {
        kind: 'correcao',
        text: 'No iPhone, o topo do app não fica mais desfocado sob a barra de status. Para valer, remova o Maibank da Tela de Início e adicione de novo.',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-27',
    title: 'Celular, recorrentes e novidades',
    changes: [
      {
        kind: 'novo',
        text: 'Cara de aplicativo no celular: abas embaixo, telas do tamanho da tela, botão + para lançar e janelas que sobem de baixo. Dá para instalar: no iPhone, Compartilhar > Adicionar à Tela de Início; no Android, menu > Instalar app.',
      },
      {
        kind: 'novo',
        text: 'Lançamentos recorrentes: ligue "Repetir todo mês" no Novo lançamento e o app lança sozinho todo mês — assinaturas, aluguel, uma renda fixa. Tudo fica em Lançamentos > Recorrentes.',
      },
      {
        kind: 'novo',
        text: 'Novidades: quando sair uma versão nova, o app avisa e mostra o que mudou. O histórico fica em Configurações > Novidades.',
      },
      { kind: 'melhoria', text: 'Ícone próprio do Maibank e gráficos legíveis em qualquer tamanho de tela.' },
      { kind: 'melhoria', text: 'Senhas novas precisam misturar letras e números.' },
      { kind: 'melhoria', text: 'A Ajuda ganhou uma pergunta sobre como cadastrar algo que se repete todo mês.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-26',
    title: 'Primeira versão',
    changes: [
      { kind: 'novo', text: 'Contas com login e confirmação por e-mail: seus dados ficam só na sua conta.' },
      { kind: 'novo', text: 'Divisões do dinheiro, lançamentos, crédito com faturas e parcelas, metas e simulações.' },
      { kind: 'novo', text: 'Sabe só o valor da parcela? Informe a parcela e o total é calculado sozinho.' },
      { kind: 'novo', text: 'Tour guiado na primeira entrada e uma aba de Ajuda com as dúvidas mais comuns.' },
      { kind: 'novo', text: 'Mai, a assistente: por enquanto em modo local, entendendo frases simples.' },
    ],
  },
];

export const CURRENT_RELEASE = CHANGELOG[0];
export const APP_VERSION = CURRENT_RELEASE.version;

export const CHANGE_LABEL: Record<ChangeKind, string> = {
  novo: 'Novo',
  melhoria: 'Melhoria',
  correcao: 'Correção',
};

/** Compara versões "1.10.2" x "1.9.0" número a número (não como texto). */
export function compareVersions(left: string, right: string): number {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

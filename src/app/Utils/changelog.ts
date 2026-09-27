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

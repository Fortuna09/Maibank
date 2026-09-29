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
 *
 * As versões antes da 2.4.0 foram apagadas de propósito (2026-09-29) — a numeração segue daqui.
 */
export const CHANGELOG: Release[] = [
  {
    version: '2.4.0',
    date: '2026-09-29',
    title: 'Formulários mais claros',
    changes: [
      {
        kind: 'melhoria',
        text: 'Todo formulário agora mostra o que é obrigatório (*) e o que é opcional. No lançamento, só nome, valor e data são obrigatórios — a categoria, se ficar em branco, é escolhida pelo nome.',
      },
      {
        kind: 'melhoria',
        text: 'Metas: só o nome e o valor da meta são obrigatórios. "Já guardado" e "quanto guardar por vez" podem ficar em branco ou zerados — para quem guarda sem valor fixo.',
      },
      {
        kind: 'correcao',
        text: 'O campo de data não fica mais torto ao lado dos outros, no celular e no computador. E a meta com valor zerado não some mais sem aviso: o app diz o que falta.',
      },
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

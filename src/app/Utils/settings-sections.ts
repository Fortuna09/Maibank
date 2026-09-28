/**
 * Seções de Configurações, numa lista só: viram as abas no computador, o menu em lista
 * no celular e o título da barra superior. Seção nova = uma linha aqui + a rota filha.
 */
export type SettingsGroup = 'dinheiro' | 'app' | 'conta';

export interface SettingsSection {
  path: string;
  label: string;
  description: string;
  /** Nome de ícone do <app-icon>, ou 'mai' para a marca da assistente. */
  icon: string;
  group: SettingsGroup;
  /** Só aparece para quem é administrador (ADMIN_EMAILS no servidor). */
  adminOnly?: boolean;
}

/** Na ordem das abas do computador. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { path: 'aparencia', label: 'Aparência', description: 'Tema claro ou escuro, seu nome e a capa', icon: 'image', group: 'app' },
  { path: 'distribuicao', label: 'Distribuição', description: 'Como suas entradas são divididas', icon: 'sliders', group: 'dinheiro' },
  { path: 'salario', label: 'Salário', description: 'Valor e dia do salário automático', icon: 'arrow-in', group: 'dinheiro' },
  { path: 'credito', label: 'Crédito', description: 'Fechamento e vencimento da fatura', icon: 'card', group: 'dinheiro' },
  { path: 'assistente', label: 'Assistente', description: 'A Mai e a chave de IA', icon: 'mai', group: 'app' },
  { path: 'siri', label: 'Siri e atalhos', description: 'Lançar gastos falando com a Siri', icon: 'mic', group: 'app' },
  { path: 'conta', label: 'Conta', description: 'Nome, e-mail e sair', icon: 'user', group: 'conta' },
  { path: 'ajuda', label: 'Ajuda', description: 'Tour guiado e perguntas frequentes', icon: 'help', group: 'conta' },
  { path: 'novidades', label: 'Novidades', description: 'O que mudou em cada versão', icon: 'bell', group: 'conta' },
  { path: 'admin', label: 'Administração', description: 'Mandar mensagens para quem usa o app', icon: 'send', group: 'conta', adminOnly: true },
];

/** Seções que esta pessoa pode ver. */
export function visibleSettingsSections(isAdmin: boolean): SettingsSection[] {
  return SETTINGS_SECTIONS.filter((section) => !section.adminOnly || isAdmin);
}

/** Grupos do menu do celular, na ordem em que aparecem. */
export const SETTINGS_GROUPS: Array<{ id: SettingsGroup; label: string }> = [
  { id: 'dinheiro', label: 'Seu dinheiro' },
  { id: 'app', label: 'App' },
  { id: 'conta', label: 'Conta e suporte' },
];

export function settingsSection(path: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((section) => section.path === path);
}

/** Mesma largura em que a barra lateral vira abas embaixo (styles.scss). */
export const PHONE_LAYOUT_QUERY = '(max-width: 720px)';

export function isPhoneLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_LAYOUT_QUERY).matches;
}

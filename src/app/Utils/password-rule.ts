/**
 * Regra de senha do Maibank: 8+ caracteres, com pelo menos uma letra e um número.
 * O backend confere a mesma coisa (AuthService.validatePassword) — mudou aqui, muda lá.
 */
export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordChecks {
  length: boolean;
  letter: boolean;
  number: boolean;
}

export function passwordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    // \p{L}: qualquer letra, inclusive acentuada
    letter: /\p{L}/u.test(password),
    number: /\d/.test(password),
  };
}

/** Mensagem do primeiro requisito que falta, ou null se a senha serve. */
export function passwordProblem(password: string): string | null {
  const checks = passwordChecks(password);
  if (!checks.length) {
    return `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (!checks.letter || !checks.number) {
    return 'A senha precisa misturar letras e números.';
  }
  return null;
}

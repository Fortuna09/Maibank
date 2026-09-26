import { config } from '../config.js';
import { HttpError } from './HttpError.js';

// Erros do Postgres que são culpa da requisição, não do servidor.
const POSTGRES_ERRORS = {
  '22P02': [400, 'Identificador inválido.'], // texto que não é uuid/número
  '23503': [400, 'Referência inválida (divisão ou registro inexistente).'],
  '23505': [409, 'Registro duplicado.'],
  '23514': [400, 'Valor fora do permitido.'],
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message, ...(error.code ? { code: error.code } : {}) });
  }

  const known = POSTGRES_ERRORS[error.code];
  if (known) {
    return res.status(known[0]).json({ message: known[1] });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido.' });
  }

  console.error(error);
  // Em produção não expõe detalhes internos; no desenvolvimento ajuda a depurar.
  return res.status(500).json({ message: 'Erro interno no servidor.', ...(config.isProduction ? {} : { detail: error.message }) });
}

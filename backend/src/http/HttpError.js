/**
 * Erro com status HTTP. Os services lançam isso para casos esperados
 * (validação, não encontrado, sem login) e o errorHandler transforma em resposta.
 * `code` é opcional e serve para o front reagir a casos específicos.
 */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }

  static badRequest(message, code) {
    return new HttpError(400, message, code);
  }

  static unauthorized(message = 'Faça login para continuar.', code = 'UNAUTHENTICATED') {
    return new HttpError(401, message, code);
  }

  static forbidden(message, code) {
    return new HttpError(403, message, code);
  }

  static notFound(message) {
    return new HttpError(404, message);
  }

  static conflict(message, code) {
    return new HttpError(409, message, code);
  }
}

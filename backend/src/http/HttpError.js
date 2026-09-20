/**
 * Erro com status HTTP. Os services lançam isso para casos esperados
 * (validação, não encontrado) e o errorHandler transforma em resposta.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }

  static badRequest(message) {
    return new HttpError(400, message);
  }

  static notFound(message) {
    return new HttpError(404, message);
  }
}

/** Encaminha rejeições de handlers async para o errorHandler do Express. */
export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

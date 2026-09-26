// Função serverless da Vercel: toda requisição /api/* chega aqui (ver vercel.json)
// e o Express do backend responde. O Express recebe a URL original, então as rotas
// continuam sendo /api/transactions, /api/auth/login etc.
import app from '../backend/src/app.js';

export default app;

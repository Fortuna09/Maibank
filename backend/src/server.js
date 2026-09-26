import app from './app.js';
import { config } from './config.js';
import { Migrator } from './database/Migrator.js';

// Desenvolvimento local: aplica migrations pendentes e sobe o servidor.
// Na Vercel quem roda é api/index.mjs (as migrations rodam no build).
const applied = await new Migrator().run();
if (applied.length) {
  console.log(`Migrations aplicadas: ${applied.join(', ')}`);
}

app.listen(config.port, () => {
  console.log(`Maibank API em http://localhost:${config.port} (front: ${config.appUrl})`);
});

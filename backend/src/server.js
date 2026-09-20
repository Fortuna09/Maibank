import { createApp } from './app.js';
import { config } from './config.js';
import { Migrations } from './database/Migrations.js';

await new Migrations().run();

const app = createApp();

app.listen(config.port, () => {
  console.log(`Maibank backend running at http://localhost:${config.port}`);
});

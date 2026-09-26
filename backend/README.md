# Maibank Backend (Node + Express + Postgres)

## Rodar localmente

```bash
copy .env.example .env      # preencha o JWT_SECRET (o comando para gerar está no arquivo)
npm install
npm run dev                 # reload automático; aplica migrations pendentes ao subir
```

API em <http://localhost:3001>. O banco local é o Postgres do `infra/docker-compose.yml`
(`npm run db:up` na raiz). O front fala com a API por `/api` (proxy do `ng serve`).

| Script | O quê |
| --- | --- |
| `npm run dev` / `npm start` | sobe a API (com / sem reload) |
| `npm run migrate` | aplica migrations pendentes |
| `npm run migrate:deploy` | idem, mas não faz nada sem `DATABASE_URL` (usado no build da Vercel) |

## Estrutura

```
src/
├─ server.js                 dev local: migrations → listen
├─ app.js                    monta o Express e liga os módulos (único lugar que instancia tudo)
├─ config.js                 variáveis de ambiente (JWT_SECRET obrigatório em produção)
├─ db.js                     pool do Postgres + withTransaction()
├─ database/                 Migrator + migrations/NNN_*.sql
├─ http/                     HttpError, errorHandler, authenticate, cookies
├─ mail/                     Mailer (Resend; sem chave, imprime no console) e templates
├─ utils/monthDay.js         dia do mês válido, "hoje" no fuso do app
└─ modules/<dominio>/
   ├─ <Dominio>Repository.js  só SQL — recebe a conexão quando está numa transação
   ├─ <Dominio>Service.js     regras e validação; lança HttpError
   └─ <Dominio>Controller.js  rotas Express: lê req, chama o service, responde
```

Módulos: `auth`, `settings`, `transactions`, `goals`, `salary`, `credit`. Todo método de dados
recebe o `userId` da sessão e filtra por ele.

Para adicionar um endpoint: método no Repository (SQL) → método no Service (regra) → rota no
Controller → se for um domínio novo, registrar em `app.js` (atrás do `authenticate`).

## Erros

- Esperados: o service lança `HttpError.badRequest/unauthorized/forbidden/notFound/conflict`
  → resposta `{ message, code? }` com o status certo.
- Erros de dados do Postgres (id inválido, FK, duplicado) viram 400/409.
- Inesperados: `500 { message }` (com `detail` só fora de produção) e log no console.

## Endpoints

Tudo abaixo de `/api`. Exceto `auth` (e `health`), exige sessão.

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/health` | testa a conexão com o banco |
| POST | `/auth/register` | cria conta não confirmada + divisões padrão, envia e-mail |
| POST | `/auth/resend-verification` | reenvia o link (sempre 200) |
| POST | `/auth/verify-email` | confirma o e-mail e abre a sessão |
| POST | `/auth/login` · `/auth/logout` | entra / sai |
| POST | `/auth/forgot-password` · `/auth/reset-password` | link de nova senha (sempre 200) / troca e abre a sessão |
| GET | `/auth/session` | usuário logado ou `null` (sempre 200) |
| GET | `/auth/me` | usuário logado (401 sem sessão) |
| POST | `/auth/logout-all` | encerra todas as sessões |
| GET / PUT | `/settings` | renda base + lista completa de divisões |
| GET / POST | `/transactions` | lista / cria lançamento (`credito` não tem alocações) |
| DELETE | `/transactions/:id` | apaga lançamento |
| GET / POST | `/goals` | lista / cria meta |
| PUT / DELETE | `/goals/:id` | edita / apaga meta |
| POST | `/goals/:id/contributions` | soma valor guardado à meta |
| GET / PUT | `/salary-config` | salário automático (`payDay` = dia do mês) |
| POST | `/salary-config/process` | lança o salário do mês se for o caso (`201` criou, `200 processed:false` nada a fazer) |
| GET / PUT | `/credit-config` | dia de fechamento e vencimento do cartão |

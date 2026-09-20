# Maibank Backend (Node + Express + MySQL)

## 1) Configurar ambiente

Copie o arquivo de exemplo e ajuste se precisar:

```bash
cd backend
copy .env.example .env
```

## 2) Instalar dependências

```bash
npm install
```

## 3) Rodar API

```bash
npm run dev      # com reload automático (node --watch)
npm run start    # sem reload
```

API em: http://localhost:3001

O banco sobe pelo Docker em `infra/` (ver `infra/README.md`). Os ajustes de esquema que vieram depois do `init.sql` rodam sozinhos na subida (`src/database/Migrations.js`).

## Estrutura

```
src/
├─ server.js                 sobe: migrations → app → listen
├─ app.js                    monta o Express e liga os módulos (único lugar que instancia tudo)
├─ config.js                 variáveis de ambiente
├─ db.js                     pool MySQL + withTransaction()
├─ http/                     HttpError, asyncHandler, errorHandler
├─ database/Migrations.js    colunas/tabelas adicionadas depois do init.sql (idempotente)
├─ utils/monthDay.js         clampMonthDay, todayIso
└─ modules/<dominio>/
   ├─ <Dominio>Repository.js  só SQL — recebe a conexão quando está numa transação
   ├─ <Dominio>Service.js     regras de negócio e validação; lança HttpError
   └─ <Dominio>Controller.js  rotas Express: lê req, chama o service, responde
```

Módulos: `settings` (renda base e divisões), `transactions` (lançamentos e alocações), `goals` (metas e aportes), `salary` (salário automático) e `credit` (configuração do cartão).

Para adicionar um endpoint: método no Repository (SQL) → método no Service (regra) → rota no Controller → se for um domínio novo, registrar em `app.js`.

## Erros

- Esperados (validação, não encontrado): o service lança `HttpError.badRequest(msg)` / `HttpError.notFound(msg)` → resposta `{ message }` com o status certo.
- Inesperados: caem no `errorHandler` → `500 { message, detail }` e log no console.

## Endpoints

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/health` | Testa a conexão com o banco |
| GET / PUT | `/api/settings` | Renda base + lista completa de divisões (insere novas, apaga removidas sem lançamentos) |
| GET / POST | `/api/transactions` | Lista / cria lançamento (`credito` não tem alocações) |
| DELETE | `/api/transactions/:id` | Apaga lançamento (alocações caem em cascata) |
| GET / POST | `/api/goals` | Lista / cria meta |
| PUT / DELETE | `/api/goals/:id` | Edita / apaga meta |
| POST | `/api/goals/:id/contributions` | Soma valor guardado à meta |
| GET / PUT | `/api/salary-config` | Configuração do salário automático (`payDay` = dia do mês) |
| POST | `/api/salary-config/process` | Lança o salário do mês se for o caso (`201` criou, `200 processed:false` nada a fazer) |
| GET / PUT | `/api/credit-config` | Dia de fechamento e vencimento do cartão |

# Arquitetura do Maibank

App de finanças pessoais para uso próprio e de amigos. Cada pessoa tem sua conta; os dados
são lançados à mão (sem conexão com banco/extrato) e ficam isolados por usuário.

## Visão geral

```
Navegador (Angular 20, PWA)
   │   tudo no mesmo domínio — ex.: https://maibank.vercel.app
   │
   ├── /*         → arquivos estáticos (dist/Maibank/browser)        Vercel CDN
   └── /api/*     → função serverless api/index.mjs → Express        Vercel Functions
                        │
                        ├── Postgres ── Neon (plano gratuito, 0,5 GB)   DATABASE_URL
                        └── E-mails ─── Resend (3.000/mês grátis)       RESEND_API_KEY
```

Front e API no **mesmo domínio**: não existe CORS, e o cookie de sessão é *first-party*
(funciona em qualquer navegador, inclusive Safari). No desenvolvimento o `ng serve` faz
proxy de `/api` para o backend local (`proxy.conf.json`), reproduzindo o mesmo cenário.

| Peça | Escolha | Por quê |
| --- | --- | --- |
| Front | Angular na Vercel | build estático, CDN grátis |
| API | Express como função da Vercel | não dorme (o Render grátis leva ~1 min para acordar), mesmo domínio do front |
| Banco | Postgres no Neon | dados relacionais (lançamento → alocações → divisões), plano grátis que só "cochila" |
| E-mail | Resend | API simples; grátis até 3.000 e-mails/mês |

## Autenticação

**Fluxo:** criar conta → e-mail com link → `/confirmar-email?token=…` confirma e já entra →
cookie de sessão. Sem confirmar o e-mail o login é recusado (`403 EMAIL_NOT_VERIFIED`, com
botão de reenviar na tela).

- **Sessão:** JWT (HS256, `JWT_SECRET`) num cookie `httpOnly`, `SameSite=Lax`, `Secure` em
  produção. Vale 30 dias e é renovado a cada 7 dias de uso. O JavaScript da página nunca vê
  o token.
- **Derrubar sessões:** cada usuário tem `session_version`; o token carrega esse número.
  Trocar a senha ou "Sair de todos os dispositivos" incrementa e invalida todos os tokens.
- **Senhas:** bcrypt (custo 11), 8 a 72 caracteres (acima de 72 bytes o bcrypt cortaria).
- **Links de e-mail:** token aleatório de 32 bytes; no banco fica só o SHA-256. Uso único,
  expira (confirmação 24 h, senha 1 h) e há intervalo mínimo de 60 s entre reenvios.
- **Sem vazar quem tem conta:** "esqueci a senha" e "reenviar confirmação" respondem igual
  exista a conta ou não; login errado responde igual para e-mail inexistente e senha errada
  (e compara um hash falso para o tempo de resposta não denunciar).
- **CSRF:** `SameSite=Lax` impede outro site de usar o cookie em POST/PUT/DELETE, e a API só
  aceita JSON.

Rotas (`/api/auth`): `register`, `resend-verification`, `verify-email`, `login`, `logout`,
`forgot-password`, `reset-password`, `session` (sempre 200, `user` ou `null`), `me`,
`logout-all`.

## Isolamento dos dados

- Toda tabela de dados tem `user_id` e **toda** consulta filtra por ele — o `user_id` vem da
  sessão (`req.user.id`), nunca do corpo da requisição.
- Mexer em registro de outra pessoa responde `404` (nem confirma que existe).
- A FK composta `transaction_allocations (user_id, bucket_id) → allocation_buckets` garante
  que um lançamento só usa divisões do próprio dono.
- Apagar um usuário apaga tudo dele (`ON DELETE CASCADE`).

## Modelo de dados

| Tabela | O quê |
| --- | --- |
| `users` | conta: e-mail (minúsculo, único), nome, hash da senha, e-mail confirmado, `session_version` |
| `auth_tokens` | links de confirmação/redefinição (só o hash) |
| `allocation_settings` | renda base (1 por usuário) |
| `allocation_buckets` | divisões — chave `(user_id, id)`, com `position` para a ordem |
| `transactions` | lançamentos: `entrada`, `saida`, `credito` (com `installments`, `paid_invoice`) |
| `transaction_allocations` | quanto de cada lançamento foi para cada divisão |
| `goals`, `goal_contributions` | metas e aportes |
| `salary_config` | salário automático (1 por usuário) |
| `credit_config` | fechamento e vencimento do cartão (1 por usuário) |

Conta nova nasce com as divisões de `backend/src/modules/settings/defaults.js`
(Uso diário 50%, Reserva de emergência 30%, Planos futuros 20%).

Datas "de hoje" usam o fuso `APP_TIMEZONE` (padrão `America/Sao_Paulo`): o servidor da Vercel
roda em UTC, e sem isso o salário cairia um dia antes e lançamentos depois das 21 h ficariam
com a data de amanhã.

## Estrutura

```
api/index.mjs                  entrada da função na Vercel (exporta o app Express)
vercel.json                    build, rewrites (/api → função; resto → index.html), headers
proxy.conf.json                ng serve: /api → http://localhost:3001

backend/src/
├─ server.js                   dev local: migrations + listen
├─ app.js                      liga os módulos; /api/auth aberto, o resto exige login
├─ config.js · db.js           variáveis de ambiente · pool do Postgres + withTransaction
├─ database/
│  ├─ Migrator.js · migrate.js aplica migrations pendentes (numa transação, com trava)
│  └─ migrations/NNN_*.sql     esquema versionado
├─ http/                       HttpError, errorHandler, authenticate, cookies
├─ mail/                       Mailer (Resend ou console) e templates
└─ modules/<domínio>/          Repository (SQL) → Service (regras) → Controller (rotas)
   auth · settings · transactions · goals · salary · credit

src/app/
├─ Pages/app-shell/            casca da área logada (navbar, modal, Mai)
├─ Pages/auth-page/            casca das telas sem login + entrar, criar conta, confirmar,
│                              esqueci a senha, redefinir senha
├─ Guards/ · Interceptors/     authGuard/guestGuard · 401 → volta ao login
└─ Services/auth.service.ts    sessão atual; avisa quem precisa limpar dados ao sair
```

Todas as telas são carregadas sob demanda (`loadComponent`): o pacote inicial fica em ~165 KB
comprimidos, e a tela de login abre rápido no celular.

## Variáveis de ambiente

| Variável | Local | Produção (Vercel) |
| --- | --- | --- |
| `DATABASE_URL` | Postgres do Docker (padrão) | connection string **pooled** do Neon |
| `JWT_SECRET` | gerado no `backend/.env` | **obrigatório** — gere um novo, nunca reaproveite o local |
| `RESEND_API_KEY` | vazio (link aparece no console) | chave do Resend |
| `EMAIL_FROM` | — | `Maibank <nao-responda@seudominio>` depois de verificar o domínio |
| `APP_URL` | `http://localhost:4200` | opcional; sem ela usa o domínio de produção da Vercel |
| `APP_TIMEZONE` | `America/Sao_Paulo` | idem |

## Desenvolvimento local

```bash
npm run db:up        # Postgres no Docker (porta 5432)
npm run api          # backend em :3001 (roda migrations ao subir)
npm start            # front em :4200 com proxy para a API
```

Sem `RESEND_API_KEY`, os e-mails não saem: o link de confirmação/redefinição aparece no
terminal do backend.

## Migrations

Esquema novo = arquivo novo em `backend/src/database/migrations/` com o próximo número
(`002_descricao.sql`). Nunca edite uma migration que já rodou em produção. Elas rodam:
- local: ao subir o backend (`npm run api`) ou com `npm run db:migrate`;
- produção: no build da Vercel (`migrate:deploy`, pulado se não houver `DATABASE_URL`).

## Próximos passos conhecidos

- **Limite de tentativas de login** (hoje só o custo do bcrypt freia força bruta). Em
  serverless precisa de armazenamento compartilhado: uma tabela ou um KV.
- **Excluir minha conta** e **exportar meus dados** (bom tom com dados de amigos — LGPD).
- **Trocar senha estando logado** (hoje é pelo "esqueci minha senha").
- **Mai com modelo de verdade:** a chave hoje fica no navegador de cada um; se for para o
  servidor, o custo de todos passa a ser de quem hospeda.

# Maibank

Finanças pessoais com divisões do dinheiro, crédito e faturas, metas, simulações e uma
assistente (Mai). Cada pessoa tem sua conta; os lançamentos são manuais — sem conexão com
banco.

- **Front:** Angular 20 (PWA) · **API:** Node + Express · **Banco:** Postgres
- **Produção:** Vercel (front + API no mesmo domínio) · Neon (banco) · Resend (e-mails)

## Rodar localmente

Precisa de Node 20.19+ e Docker.

```bash
npm install && npm install --prefix backend
copy backend\.env.example backend\.env   # e preencha o JWT_SECRET (comando no arquivo)

npm run db:up    # Postgres no Docker
npm run api      # API em http://localhost:3001 (aplica as migrations)
npm start        # app em http://localhost:4200
```

Sem chave do Resend, os e-mails de confirmação não saem: o link aparece no terminal da API.

## Documentação

- [Arquitetura](docs/ARQUITETURA.md) — como as peças se encaixam, login, dados, migrations.
- [Deploy](docs/DEPLOY.md) — passo a passo para colocar no ar.
- [Backend](backend/README.md) — estrutura dos módulos e endpoints.

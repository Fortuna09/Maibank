# Infra local (Postgres)

Em produção o banco é o Neon; aqui é o mesmo Postgres rodando no Docker.

## Subir o banco

Na raiz do projeto:

```bash
npm run db:up
# ou: docker compose -f infra/docker-compose.yml up -d
```

As tabelas são criadas pelas migrations ao subir a API (`npm run api`).

## Credenciais locais

- Banco: `maibank` · Usuário: `maibank` · Senha: `maibank` · Porta: `5432`
- `DATABASE_URL=postgres://maibank:maibank@localhost:5432/maibank`

## Consultar

```bash
docker exec -it maibank-postgres psql -U maibank -d maibank -c "\dt"
```

Qualquer cliente Postgres (DBeaver, pgAdmin, extensão do VS Code) conecta com os dados acima.

## Zerar o banco local

```bash
docker exec maibank-postgres psql -U maibank -d maibank -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

Depois suba a API de novo para recriar as tabelas.

## Backups

`infra/backups/` guarda dumps locais e está no `.gitignore` (são dados financeiros pessoais).
O backup do MySQL antigo (`maibank-2026-09-26_1458.sql`) só restaura num MySQL.

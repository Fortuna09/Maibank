# Infra local (MySQL)

## Subir banco local

Na raiz do projeto:

```bash
docker compose -f infra/docker-compose.mysql.yml up -d
```

Se voce estava usando uma imagem diferente (exemplo: mysql 8.4), recrie o ambiente para evitar incompatibilidade:

```bash
docker compose -f infra/docker-compose.mysql.yml down -v
docker compose -f infra/docker-compose.mysql.yml up -d
```

Se o terminal do VS Code nao reconhecer `docker`, feche e reabra o VS Code.
No Windows, o CLI costuma ficar em:

```text
C:\Users\rafin\AppData\Local\Programs\DockerDesktop\resources\bin
```

## Credenciais locais

- Banco: maibank
- Usuario: maibank_user
- Senha: maibank_pass
- Porta: 3306

## Teste rapido de conexao

```bash
docker exec -it maibank-mysql mysql -u maibank_user -pmaibank_pass maibank -e "SHOW TABLES;"
```

## Visualizar no MySQL Workbench

1. Abra o MySQL Workbench.
2. Clique em `+` em `MySQL Connections`.
3. Preencha:
	- Connection Name: `Maibank Local`
	- Hostname: `127.0.0.1`
	- Port: `3306`
	- Username: `maibank_user`
4. Clique em `Store in Vault...` e informe a senha `maibank_pass`.
5. Clique em `Test Connection` e depois em `OK`.
6. Abra a conexao e, no painel `SCHEMAS`, atualize com refresh.
7. Expanda o schema `maibank` para ver as tabelas.

Consulta util no Workbench:

```sql
USE maibank;
SHOW TABLES;
SELECT * FROM allocation_buckets;
```

## Observacao

Este banco esta preparado para a proxima etapa (backend/API). No estado atual do projeto, o frontend ainda salva em localStorage.

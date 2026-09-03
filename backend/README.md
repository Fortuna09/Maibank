# Maibank Backend (Node + MySQL)

## 1) Configurar ambiente

Copie o arquivo de exemplo:

```bash
cd backend
copy .env.example .env
```

## 2) Instalar dependencias

```bash
npm install
```

## 3) Rodar API

```bash
npm run start
```

API em: http://localhost:3001

## Endpoints

- `GET /health`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions/:id`
- `GET /api/goals`
- `POST /api/goals`
- `PUT /api/goals/:id`
- `DELETE /api/goals/:id`

## Observacao

O frontend Angular ainda pode estar usando localStorage. A proxima etapa e apontar o service Angular para esta API.

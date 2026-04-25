# SelfWashStation

Monorepo gom 2 module:

- `Backend`: API server, DB migrations/seeds, MQTT jobs
- `Frontend`: Vue dashboard

## Shared environment config

Project da duoc quy hoach lai de dung chung 1 file `.env` tai root workspace.
Backend va Frontend deu doc bien tu root `.env`.

## Install

```bash
npm install
```

## Run

```bash
npm run dev:selfwash-backend
npm run dev:selfwash-frontend
npm run dev
```

## Build

```bash
npm run build:selfwash-backend
npm run build:selfwash-frontend
```

## Deploy with Docker

1. Copy template env file and fill real production values:

```bash
cp env.production .env.production
```

2. Ensure `.env.production` has at least:
	- `PORT`
	- `FRONTEND_PORT`
	- `VITE_API_URL`
	- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
	- `CA_PEM_PATH` (for TLS DB connection)
3. Ensure `backend/ca.pem` exists and matches `CA_PEM_PATH`.
4. Build and start services:

```bash
docker compose --env-file .env.production up -d --build
```

5. Check service logs:

```bash
docker compose --env-file .env.production logs -f backend
docker compose --env-file .env.production logs -f frontend
```

6. Stop services:

```bash
docker compose --env-file .env.production down
```

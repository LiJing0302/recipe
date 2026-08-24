# Recipe AI Backend

## Local development

```bash
cd backend
cp .env.example .env
docker compose up -d
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
```

The API listens on `http://127.0.0.1:3000`.

Add the MinIO values from `.env.example` to `.env` before using image uploads. Keep the bucket private; the backend proxies uploaded images through `/api/uploads/object`.

## Recipe endpoints

- `GET /api/recipes/mine`
- `GET /api/recipes/share-link` (requires login; creates a short opaque share ID)
- `GET /api/recipes/shared/:shareId`
- `GET /api/recipes/shared/:shareId/:recipeId`
- `GET /api/recipes/:id`
- `POST /api/recipes`
- `PUT /api/recipes/:id`
- `POST /api/uploads/images` with multipart field `file` and form field `kind` (`cover` or `step`)

The current development client sends `x-user-id: me`. This is intentionally temporary; WeChat login and token authentication should replace it before release.

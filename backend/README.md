# Recipe AI Backend

## Environment configuration

The frontend uses `.env.development` for local API requests and `.env.production`
for production builds. Backend templates are provided as `.env.local.example` and
`.env.production.example`.

For local backend development, copy the local template once:

```bash
cd backend
cp .env.local.example .env.local
cp .env.local .env
```

Fill in the MinIO secret, then start with `npm run start:local`. The second
copy is needed because Prisma CLI reads `.env` by default. The local Docker
PostgreSQL database is `recipe_ai`; do not change it to `recipe` unless you
create that database separately.

Configure `DASHSCOPE_API_KEY` before using the AI endpoint. The backend keeps
the key server-side and uses DashScope's OpenAI-compatible Chat Completions API.
`DASHSCOPE_MODEL` defaults to `qwen3.8-flash`; set `DASHSCOPE_ENABLE_THINKING`
to `false` to disable thinking mode.

For production, configure the values from `.env.production.example` in the
1Panel application environment variables. Do not copy the local `.env.local`
file to production.

## Local development

```bash
cd backend
docker compose up -d
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run start:local
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
- `POST /api/ai/responses` (requires login; body: `{ "input": "..." }`)
- `POST /api/uploads/images` with multipart field `file` and form field `kind` (`cover` or `step`)

The AI endpoint requires `Authorization: Bearer <token>` and accepts:

```json
{
  "input": "前端场景拼装后的 prompt",
  "model": "qwen3.8-flash",
  "instructions": "可选的系统级补充指令",
  "enableThinking": true,
  "maxOutputTokens": 4096,
  "topP": 0.8,
  "temperature": 0.7,
  "stop": ["<END>"],
  "thinkingBudget": 4000,
  "responseFormat": {
    "type": "json_schema",
    "json_schema": {
      "name": "example",
      "strict": true,
      "schema": {
        "type": "object",
        "properties": { "answer": { "type": "string" } },
        "required": ["answer"],
        "additionalProperties": false
      }
    }
  }
}
```

The request-level `model` overrides `DASHSCOPE_MODEL` for that request. When
omitted, the backend uses the environment-configured default model. The
backend maps `topP`, `thinkingBudget` to DashScope's `top_p` and
`thinking_budget`. `thinkingBudget` is sent only when `enableThinking` is
enabled. Omit `stop` when no stop sequence is needed.

It returns `{ "id", "model", "text", "usage" }`. Only the final model text
is returned; provider reasoning items are not exposed to clients.

The current development client sends `x-user-id: me`. This is intentionally temporary; WeChat login and token authentication should replace it before release.

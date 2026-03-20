# Cloudflare RAG MVP

Cloudflare-first RAG chatbot built with Workers + Hono, R2, D1, Vectorize, and OpenAI via AI Gateway.

## Architecture

- `POST /upload`: ingest `.txt` / `.md` files, store raw file in R2, chunk + embed, upsert vectors, persist metadata in D1.
- `POST /ask`: embed query, retrieve top-k vectors (workspace-filtered), assemble context, generate grounded answer with citations.
- `GET /health`: health check with request id.

## Prerequisites

- Node.js 20+
- Cloudflare account with:
  - Workers
  - R2 bucket
  - D1 database
  - Vectorize index
- OpenAI key routed through Cloudflare AI Gateway

## Setup

1. Install dependencies:
   - `pnpm install`
2. Configure `wrangler.jsonc`:
   - Set `database_id` for D1
   - Ensure `bucket_name` and `index_name` exist
3. Set Worker secrets:
   - `wrangler secret put OPENAI_API_KEY`
   - `wrangler secret put AI_GATEWAY_BASE_URL`
   - Optional: `wrangler secret put JWT_SECRET`
4. Apply migration:
   - `wrangler d1 migrations apply ai-chatbot-rag-db --local`

## Local Development

- Start dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Test: `npm test`

## API Examples

### Upload

```bash
curl -X POST "http://127.0.0.1:8787/upload" \
  -F "workspace_id=ws_123" \
  -F "file=@./docs/handbook.md"
```

### Ask

```bash
curl -X POST "http://127.0.0.1:8787/ask" \
  -H "content-type: application/json" \
  -d '{
    "workspace_id": "ws_123",
    "query": "What is our PTO policy?",
    "top_k": 5
  }'
```

### Ask (Streaming)

```bash
curl -N -X POST "http://127.0.0.1:8787/ask" \
  -H "content-type: application/json" \
  -d '{
    "workspace_id": "ws_123",
    "query": "Summarize incident response steps",
    "stream": true
  }'
```

## Notes

- In MVP mode, only `.txt` and `.md` are supported.
- If no relevant context is found, the API returns a safe fallback answer.
- Multi-tenancy is enforced using `workspace_id` in both D1 and Vectorize filters.

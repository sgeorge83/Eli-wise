# ELI-WISE

A Bible and Christian theology chat assistant using **RAG** (Retrieval-Augmented Generation). ELI-WISE answers only Scripture- and theology-related questions, cites authentic sources, and politely refuses off-topic requests.

## Knowledge base sources

| Source | Type |
|--------|------|
| [World English Bible (WEB)](https://worldenglish.bible/) | Scripture (public domain) |
| [Easton's Bible Dictionary (1897)](https://en.wikisource.org/wiki/Easton%27s_Bible_Dictionary_(1897)) | Reference |
| [Westminster Shorter Catechism (1647)](https://en.wikisource.org/wiki/Westminster_Shorter_Catechism) | Confession |
| [Apostles' Creed](https://en.wikisource.org/wiki/Apostles%27_Creed) | Creed |
| [Nicene Creed (381 AD)](https://en.wikisource.org/wiki/Nicene_Creed) | Creed |
| [Matthew Henry's Concise Commentary](https://en.wikisource.org/wiki/Matthew_Henry%27s_Concise_Commentary_on_the_Bible) | Commentary |

Chunks live in `knowledge/chunks.json`. Add more passages and references there to expand coverage.

## Features

- RAG retrieval from curated Bible/theology knowledge base
- Topic guardrails — refuses non-Bible questions
- Inline and UI source citations
- Reader-friendly parchment UI with navy & gold branding
- Session-based conversation (up to 40 questions, last 20 turns sent to AI)
- Default model: `gpt-4o-mini` (lowest-cost OpenAI model suited for this app)

## Session limits

| Setting | Value |
|---------|-------|
| Max questions per session | 40 (browser session, no refresh) |
| Context sent to OpenAI per request | Last 20 messages (~10 Q&A pairs) |
| Persistent storage | None — refresh or new tab clears history |

## Vercel setup

1. Deploy this repo to [Vercel](https://vercel.com)
2. Add environment variables under **Settings → Environment Variables**:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` (recommended for low cost) |

`ASSISTANT_ID` is **no longer required** — the app uses RAG + Chat Completions instead of the Assistants API.

3. Redeploy after adding variables.

## Local development

```bash
npx vercel dev
```

## Project structure

```
api/chat.js          # RAG chat endpoint
lib/guardrails.js    # Bible/theology topic filter
lib/rag.js           # Knowledge retrieval & ranking
lib/knowledge.js     # Knowledge base loader
knowledge/chunks.json
knowledge/sources.json
index.html
```

## Expanding the knowledge base

Edit `knowledge/chunks.json` — each entry needs:

```json
{
  "id": "unique-id",
  "sourceId": "web",
  "reference": "John 3:16",
  "topics": ["salvation", "gospel"],
  "keywords": ["believe", "eternal", "life"],
  "text": "Verse or passage text..."
}
```

Use only public-domain or properly licensed theological texts.

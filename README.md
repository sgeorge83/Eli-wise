# ELI-WISE

A modern, interactive web chat interface powered by OpenAI Assistants.

## Features

- Clean, responsive chat UI with dark/light theme
- Animated typing indicator and message transitions
- Quick-start suggestion chips
- Markdown rendering for assistant replies
- Copy-to-clipboard on assistant messages
- Multi-turn conversations with session persistence
- New conversation reset

## Setup

1. Clone the repository
2. Deploy to [Vercel](https://vercel.com)
3. Add environment variables:
   - `OPENAI_API_KEY` — your OpenAI API key
   - `ASSISTANT_ID` — your OpenAI Assistant ID

## Local Development

Serve the static files with any local server. The `/api/chat` endpoint requires Vercel serverless functions or a compatible runtime.

```bash
npx vercel dev
```

## Tech Stack

- HTML, CSS, JavaScript (vanilla)
- Vercel Serverless Functions
- OpenAI Assistants API

# OAuth Fieldnotes — OAuth Setup Guide

An evidence-first prototype that helps AI agent builders understand OAuth setup requirements. OAuth Fieldnotes combines a searchable guide library with AI-assisted documentation research, evidence quotations, visible uncertainty, and saved, shareable guides.

## Features

- **Searchable guide library:** Browse and search canonical OAuth setup guides.
- **AI-assisted research:** Generate a structured guide from a supplied documentation URL.
- **Evidence and uncertainty:** Show supporting quotations where available and flag claims that require verification.
- **Save and share:** Save generated guides and retrieve them through shareable URLs.
- **Persistent storage:** Store guides and saved-guide information in a local JSON file.
- **Error handling:** Display useful feedback when a research source is rejected or a request fails.

## Evidence and verification limitations

The seeded Notion, Slack, and Google Drive guides are sample content and are **not live-verified**.

For newly generated guides, the research flow fetches a supplied documentation page and uses an LLM to extract structured information. Supporting quotations are checked against the retrieved text, but a matching quotation does not independently prove that an entire claim is correct.

The application does not execute OAuth flows, test credentials, or establish production readiness. Review generated instructions against current official documentation before using them in a real integration.

## Requirements

- Node.js 20 or newer
- npm
- A Groq API key for AI-assisted research

## Run locally

Install dependencies:

```bash
npm install
```

Create a local environment file by copying `.env.example` to `.env`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the following variables in `.env`:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Replace the placeholder with your own Groq API key. Keep `.env` private and never commit it to Git or expose the key in frontend code.

Start the development servers:

```bash
npm run dev
```

By default, Vite serves the frontend at `http://localhost:5173` and the Express API runs on port `8787`. The Vite development server proxies API requests to Express.

If port `8787` is already in use, stop the existing server process before starting another one.

Local data is stored in `./data/oauth-fieldnotes.json` by default. This file-backed approach avoids native database dependencies and is suitable for local development and demonstrations.

## Build and run

Check TypeScript and create the production frontend build:

```bash
npm run build
```

Start the Express server:

```bash
npm start
```

The server serves the built frontend when the `dist` directory is available.

Other useful scripts:

```bash
npm run typecheck
npm run dev:server
npm run dev:client
```

## API overview

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Check service and research configuration status |
| `GET /api/guides` | Retrieve the guide library |
| `GET /api/guides/:id` | Retrieve a canonical or generated guide |
| `GET /api/search?q=slack` | Search canonical guides |
| `POST /api/research` | Research a supplied documentation URL and generate a guide |
| `GET /api/research/:id` | Retrieve research job status |
| `POST /api/guides/:id/save` | Save a stored guide and return its URL |
| `GET /api/saved` | Retrieve saved guides |

AI-assisted research requires a valid `GROQ_API_KEY` and an accessible, supported documentation URL.

## Security and known limitations

- Research requires a documentation URL supplied by the user; automatic web discovery is not implemented.
- URL fetching includes safeguards such as protocol checks, resolved-IP checks, redirect limits, timeouts, and response-size limits. These are starter safeguards, not a substitute for a hardened network egress layer.
- Research is synchronous in this MVP; a production-grade background queue and worker system are not implemented.
- Storage is file-backed. A managed database and appropriate persistence configuration would be preferable for a multi-instance production deployment.
- Shareable guide URLs do not provide per-user authorization. Do not store confidential information in guides.
- The application does not collect OAuth client secrets, access tokens, or refresh tokens.
- Evidence quotations support traceability but do not guarantee semantic correctness or successful OAuth configuration.
- Generated instructions and sample guides require human review before real-world use.

## Acceptance testing

Before submitting or deploying, check that:

- The seeded guide library loads and search works.
- A relevant OAuth documentation URL can generate a guide.
- An irrelevant URL is rejected without generating an unsupported guide.
- Research failures produce a clear error message.
- A saved guide remains saved after a page refresh or server restart.
- A shareable URL opens the intended guide.
- `npm run build` completes successfully.

## License

Add a license if you intend to distribute this project under specific open-source terms.
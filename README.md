# OAuth Compass

**Navigate OAuth integrations with clarity.**

OAuth Compass helps developers building AI agents understand what it takes to connect third-party applications. It brings OAuth setup guidance into one place, helping developers identify prerequisites, follow configuration steps, understand approval requirements, estimate effort, and decide what to do next.

The prototype combines a small guide library with an AI-assisted research flow for unfamiliar applications.

**Live demo:** https://oauth-compass.onrender.com/

**Source code:** https://github.com/Thejaswini112/OAuth-Compass

---

## The Problem

Before connecting an application to an AI agent, developers may need to register an OAuth application, configure redirect URLs and permissions, understand provider-specific requirements, and determine whether verification or production approval is necessary.

This information is often spread across documentation and developer portals. OAuth Compass aims to make the process easier to understand by bringing relevant guidance, sources, potential blockers, and next steps together.

## Features

- **Search the guide library:** Find existing OAuth setup guides for applications such as Notion, Slack, and Google Drive.
- **Generate guides for unfamiliar applications:** Submit a supported documentation URL to trigger AI-assisted research and structured guide generation.
- **Evidence-aware guidance:** Present information extracted from retrieved documentation, with a clear need for human review where claims have not been independently verified.
- **Save and share:** Retrieve saved guides through shareable links without requiring an account.
- **Actionable setup guidance:** Organize information to help developers understand the setup process, requirements, and next steps.

## How It Works

1. **Search:** Look for an application in the existing guide library.
2. **Research:** If a suitable guide is unavailable, provide a relevant OAuth documentation URL to initiate research.
3. **Generate:** The backend retrieves the supplied documentation and uses a Groq-hosted language model to extract and organize relevant information.
4. **Review:** Inspect the generated guidance and verify important requirements against the original provider documentation.
5. **Save and share:** Save the guide and use its shareable URL to revisit or share it.

The research flow is intended to assist with investigation and preparation. It does not automatically register OAuth applications or complete provider approval.

## Technology Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript
- **AI research:** Groq API
- **Persistence:** File-backed JSON storage
- **Deployment:** Render

## Run Locally

### Prerequisites

- Node.js 20 or newer
- npm
- A Groq API key for live AI-assisted research

### 1. Clone the repository

```bash
git clone https://github.com/Thejaswini112/OAuth-Compass.git
cd OAuth-Compass
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root and add:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
```

Use a valid API key from your Groq account. Keep the key in the server-side environment and never commit `.env` to Git.

### 4. Start the development servers

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

### 5. Build and run the production version

```bash
npm run build
npm start
```

To check TypeScript independently, run:

```bash
npm run typecheck
```

## Configuration

| Variable | Purpose |
|---|---|
| `GROQ_API_KEY` | Authenticates server-side requests to the Groq API |
| `GROQ_MODEL` | Selects the language model used for research, where supported by the implementation |

Do not expose API keys in frontend code or commit them to the repository.

## Validation Performed

The following manual checks were performed during development:

- Verified that the guide library displays Notion, Slack, and Google Drive.
- Generated a guide using a relevant OAuth documentation URL.
- Confirmed that an irrelevant URL, such as a Groq API keys page, is rejected rather than treated as OAuth setup documentation.
- Checked that a saved guide remains available after refreshing the local application.
- Tested that a share link opens the corresponding guide.
- Checked that errors are presented to the user.

These checks validate key application flows. They do not establish that every generated OAuth requirement is accurate or that any provider would approve an OAuth application.

## Limitations and Future Improvements

- **Limited library:** This is a focused prototype, not a complete directory of 100 applications.
- **Documentation input:** The current research flow requires a documentation URL; automatic discovery across multiple sources is not implemented.
- **Evidence verification:** The presence of supporting text does not guarantee that a generated claim is semantically correct. Important claims should be checked against official provider documentation.
- **No live OAuth execution:** The application does not register OAuth apps, execute authorization flows, or submit provider approval requests.
- **Estimates and approvals:** Effort and waiting-time estimates may be uncertain or unavailable. Provider approval and processing times are not guaranteed.
- **Human review:** Generated guidance requires review before being relied on for production integrations.
- **Persistence:** The prototype uses file-backed JSON storage. Data on Render's default filesystem may not survive service restarts or redeployments. Durable production persistence would require a managed database or appropriately configured persistent storage.
- **Production hardening:** The prototype is not intended to replace a security-reviewed production research service.

## Product Decisions

The prototype prioritizes a small, useful end-to-end workflow over building a large catalogue prematurely.

- Start with a few representative applications to demonstrate different OAuth setup journeys.
- Use live research to explore unfamiliar applications without manually authoring every guide.
- Keep API credentials server-side.
- Make generated guidance shareable and easy to revisit.
- Treat AI-generated output as research assistance, not proof of successful setup or provider approval.

The next stage would focus on stronger claim-level evidence validation, broader documentation discovery, durable persistence, and testing against additional providers with different approval requirements.

---

**OAuth Compass — Navigate OAuth integrations with clarity.**
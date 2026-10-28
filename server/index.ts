
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  getGuide,
  insertGuide,
  insertResearchJob,
  listGuides,
  searchGuides,
  getResearchJob,
  updateResearchJob,
  seedGuides,
  listSavedGuideIds,
  saveGuideId,
} from './db';
import { researchGuide } from './research';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.PORT || 8787);
seedGuides();

const now = () => new Date().toISOString();

function rowOut(row: any) {
  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type,
    content: JSON.parse(row.content_json),
    sources: JSON.parse(row.sources_json),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    researchConfigured: Boolean(process.env.GROQ_API_KEY),
    database: 'json-file',
    note: 'File-backed persistence for local development; use a managed database for production.',
  })
);

app.get('/api/guides', (_req, res) => {
  return res.json(listGuides('canonical').map(rowOut));
});

app.get('/api/guides/:id', (req, res) => {
  const row = getGuide(req.params.id);

  if (!row) {
    return res.status(404).json({ error: 'Guide not found.' });
  }

  return res.json(rowOut(row));
});

app.get('/api/search', (req, res) => {
  const q = String(req.query.q || '').trim();

  if (!q) return res.json([]);

  return res.json(searchGuides(q).map(rowOut));
});

// Persistent saved-guide list. This MVP has a shared list, not user accounts.
app.get('/api/saved', (_req, res) => {
  const guides = listSavedGuideIds()
    .map((id) => getGuide(id))
    .filter((guide) => guide !== null)
    .map(rowOut);

  return res.json(guides);
});

app.post('/api/guides/:id/save', (req, res) => {
  const saved = saveGuideId(req.params.id);

  if (!saved) {
    return res.status(404).json({ error: 'Guide not found.' });
  }

  return res.json({
    saved: true,
    url: `/guide/${encodeURIComponent(req.params.id)}`,
  });
});

const ResearchInput = z.object({
  appName: z.string().trim().min(1).max(120),
  docsUrl: z.string().url().max(2000).optional().or(z.literal('')),
  useCase: z.string().max(500).optional(),
});

app.post('/api/research', async (req, res) => {
  const parsed = ResearchInput.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Provide an application name and a valid documentation URL.',
      details: parsed.error.flatten(),
    });
  }

  const input = parsed.data;
  const id = crypto.randomUUID();
  const stamp = now();

  insertResearchJob({
    id,
    app_name: input.appName,
    docs_url: input.docsUrl || null,
    use_case: input.useCase || null,
    status: 'running',
    stage: 'Fetching and analyzing supplied documentation',
    error_message: null,
    guide_id: null,
    created_at: stamp,
    updated_at: stamp,
  });

  try {
    const result = await researchGuide({
      appName: input.appName,
      docsUrl: input.docsUrl || undefined,
      useCase: input.useCase,
    });

    const guideId = crypto.randomUUID();

    const content = {
      ...result.guide,
      readiness: {
        setup: 'Needs review',
        production: 'Not verified',
      },
      research: {
        method:
          'Fetched supplied documentation and extracted structured requirements',
        sourceTextLength: result.sourceTextLength,
      },
    };

    const guideRow = {
      id: guideId,
      slug: guideId,
      name: input.appName,
      description: content.summary,
      type: 'generated' as const,
      content_json: JSON.stringify(content),
      sources_json: JSON.stringify([result.source]),
      status: 'generated_needs_review',
      created_at: now(),
      updated_at: now(),
    };

    insertGuide(guideRow);

    updateResearchJob(id, {
      status: 'completed',
      stage:
        'Research extraction completed; claims still require human review',
      guide_id: guideId,
      updated_at: now(),
    });

    return res.status(201).json({
      jobId: id,
      status: 'completed',
      guideId,
      guideUrl: `/guide/${guideId}`,
      guide: rowOut(guideRow),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Research failed unexpectedly.';

    updateResearchJob(id, {
      status: 'failed',
      stage: 'Research failed',
      error_message: message,
      updated_at: now(),
    });

    return res.status(502).json({
      jobId: id,
      status: 'failed',
      error: message,
    });
  }
});

app.get('/api/research/:id', (req, res) => {
  const job = getResearchJob(req.params.id);

  if (!job) {
    return res.status(404).json({ error: 'Research job not found.' });
  }

  return res.json({
    id: job.id,
    appName: job.app_name,
    status: job.status,
    stage: job.stage,
    error: job.error_message,
    guideId: job.guide_id,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  });
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');

app.use(express.static(dist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  return res.sendFile(path.join(dist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`OAuth Fieldnotes API listening on http://localhost:${PORT}`);
});

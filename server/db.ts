
import * as fs from 'node:fs';
import * as path from 'node:path';

type GuideRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: 'canonical' | 'generated';
  content_json: string;
  sources_json: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ResearchJob = {
  id: string;
  app_name: string;
  docs_url: string | null;
  use_case: string | null;
  status: string;
  stage: string;
  error_message: string | null;
  guide_id: string | null;
  created_at: string;
  updated_at: string;
};

type Store = {
  guides: GuideRow[];
  research_jobs: ResearchJob[];
  saved_guide_ids: string[];
};

// File-backed JSON storage avoids native addons and works with Node.js 24.
// Use a managed database and appropriate access controls for production.
const dataPath = path.resolve(
  process.env.DATA_FILE || './data/oauth-fieldnotes.json'
);

fs.mkdirSync(path.dirname(dataPath), { recursive: true });

function readStore(): Store {
  try {
    const parsed = JSON.parse(
      fs.readFileSync(dataPath, 'utf8')
    ) as Partial<Store>;

    return {
      guides: Array.isArray(parsed.guides) ? parsed.guides : [],
      research_jobs: Array.isArray(parsed.research_jobs)
        ? parsed.research_jobs
        : [],
      saved_guide_ids: Array.isArray(parsed.saved_guide_ids)
        ? parsed.saved_guide_ids.filter(
            (id): id is string => typeof id === 'string'
          )
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    return {
      guides: [],
      research_jobs: [],
      saved_guide_ids: [],
    };
  }
}

let store = readStore();

function writeStore() {
  const temp = `${dataPath}.tmp`;

  fs.writeFileSync(
    temp,
    JSON.stringify(store, null, 2),
    'utf8'
  );

  fs.renameSync(temp, dataPath);
}

export function listGuides(type?: GuideRow['type']) {
  return store.guides
    .filter((guide) => !type || guide.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGuide(id: string) {
  return store.guides.find((guide) => guide.id === id) || null;
}

export function searchGuides(q: string) {
  const needle = q.toLocaleLowerCase();

  return listGuides('canonical')
    .filter(
      (guide) =>
        guide.name.toLocaleLowerCase().includes(needle) ||
        guide.description.toLocaleLowerCase().includes(needle)
    )
    .slice(0, 10);
}

export function insertGuide(row: GuideRow) {
  if (store.guides.some((guide) => guide.id === row.id)) {
    throw new Error('A guide with this ID already exists.');
  }

  store.guides.push(row);
  writeStore();

  return row;
}

export function insertResearchJob(job: ResearchJob) {
  store.research_jobs.push(job);
  writeStore();

  return job;
}

export function getResearchJob(id: string) {
  return store.research_jobs.find((job) => job.id === id) || null;
}

export function updateResearchJob(
  id: string,
  patch: Partial<ResearchJob>
) {
  const job = getResearchJob(id);

  if (!job) return null;

  Object.assign(job, patch);
  writeStore();

  return job;
}

export function listSavedGuideIds() {
  // Exclude stale IDs if a guide was removed from the store.
  return store.saved_guide_ids.filter((id) =>
    store.guides.some((guide) => guide.id === id)
  );
}

export function saveGuideId(id: string) {
  const guideExists = store.guides.some((guide) => guide.id === id);

  if (!guideExists) {
    return false;
  }

  if (!store.saved_guide_ids.includes(id)) {
    store.saved_guide_ids.push(id);
    writeStore();
  }

  return true;
}

export function seedGuides() {
  if (store.guides.some((guide) => guide.type === 'canonical')) {
    return;
  }

  const now = new Date().toISOString();

  const seed = [
    {
      id: 'notion',
      name: 'Notion',
      description: 'Workspace and content integration',
      url: 'https://developers.notion.com/docs/authorization',
      domain: 'developers.notion.com',
      icon: 'N',
      approach:
        'Review the current official authorization documentation to determine the appropriate integration model and requirements.',
      prereqs: [
        'Confirm the developer access and integration type needed for the use case.',
        'Identify the target workspace and intended agent actions.',
        'Review the current provider authorization documentation.',
      ],
      steps: [
        'Review the official authorization documentation.',
        'Map the intended actions to the minimum required permissions.',
        'Confirm redirect, consent, and installation requirements.',
        'Test the flow in a suitable non-production environment.',
      ],
      permissions:
        'Choose permissions based on the use case and verify the current requirements in official documentation.',
      approval:
        'Check applicable workspace authorization, consent, and review requirements for the specific integration.',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Messaging and workspace integration',
      url: 'https://api.slack.com/authentication/oauth-v2',
      domain: 'api.slack.com',
      icon: '#',
      approach:
        'Review the current official OAuth documentation and select the authorization flow appropriate to the application and use case.',
      prereqs: [
        'Confirm access to the relevant developer workspace.',
        'Define the agent’s intended actions.',
        'Review the current OAuth documentation.',
      ],
      steps: [
        'Read the official OAuth documentation.',
        'Map agent actions to the required permissions.',
        'Confirm redirect and installation requirements.',
        'Test the integration before production use.',
      ],
      permissions:
        'Do not assume a fixed set of scopes; determine them from the use case and current provider documentation.',
      approval:
        'Check workspace installation and any applicable administrator or app review requirements.',
    },
    {
      id: 'google-drive',
      name: 'Google Drive',
      description: 'Files and document integration',
      url: 'https://developers.google.com/drive/api/guides/api-specific-auth',
      domain: 'developers.google.com',
      icon: 'G',
      approach:
        'Review current Google authorization and API-specific guidance to establish the appropriate configuration.',
      prereqs: [
        'Identify the intended file access and user context.',
        'Review current Google developer documentation.',
        'Determine the minimum appropriate permissions.',
      ],
      steps: [
        'Review the official authorization documentation.',
        'Choose permissions based on the intended use case.',
        'Confirm consent-screen and application configuration requirements.',
        'Test access and permissions before production use.',
      ],
      permissions:
        'Choose the minimum appropriate permissions and verify current requirements in official documentation.',
      approval:
        'Review applicable consent-screen, verification, and account-specific requirements in current documentation.',
    },
  ];

  for (const guide of seed) {
    insertGuide({
      id: guide.id,
      slug: guide.id,
      name: guide.name,
      description: guide.description,
      type: 'canonical',
      content_json: JSON.stringify({
        icon: guide.icon,
        approach: guide.approach,
        prerequisites: guide.prereqs,
        steps: guide.steps,
        permissions: guide.permissions,
        approval: guide.approval,
        unknowns: [
          'This seed guide has not been live-verified by this application. Check current official documentation before implementation.',
        ],
        readiness: {
          setup: 'Not verified',
          production: 'Not verified',
        },
      }),
      sources_json: JSON.stringify([
        {
          url: guide.url,
          domain: guide.domain,
          status: 'Reference only; not fetched or verified by this app',
        },
      ]),
      status: 'seeded_unverified',
      created_at: now,
      updated_at: now,
    });
  }
}

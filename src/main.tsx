
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Compass, Copy, ExternalLink,
  Globe2, LoaderCircle, Plus, Search, ShieldCheck, Sparkles
} from 'lucide-react';
import './style.css';

type Guide = {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: 'canonical' | 'generated';
  content: any;
  sources: { url: string; title?: string; domain?: string; status?: string }[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
  stepEvidence?: {
    step: string;
    status: 'Documented' | 'Estimated' | 'Unknown / Needs verification';
    evidenceQuote?: string;
    sourceUrl?: string;
  }[];
};

type Page = 'home' | 'library' | 'confirm' | 'research' | 'guide' | 'saved';

const demo: Guide[] = [
  {
    id: 'notion', slug: 'notion', name: 'Notion',
    description: 'Workspace and content integration',
    type: 'canonical', status: 'seeded_unverified',
    sources: [{ url: 'https://developers.notion.com/docs/authorization', domain: 'developers.notion.com' }],
    content: {
      icon: 'N',
      approach: 'Review the current official authorization documentation to determine the appropriate integration model and requirements.',
      prerequisites: [
        'Confirm the developer access and integration type needed for the use case.',
        'Identify the target workspace and intended agent actions.',
        'Review the current provider authorization documentation.'
      ],
      steps: [
        'Review the official authorization documentation.',
        'Map the intended actions to the minimum required permissions.',
        'Confirm redirect, consent, and installation requirements.',
        'Test the flow in a suitable non-production environment.'
      ],
      permissions: 'Choose permissions based on the use case and verify the current requirements in official documentation.',
      approval: 'Check applicable workspace authorization, consent, and review requirements for the specific integration.',
      unknowns: ['This seed guide has not been live-verified by this application. Check current official documentation before implementation.'],
      readiness: { setup: 'Not verified', production: 'Not verified' }
    }
  },
  {
    id: 'slack', slug: 'slack', name: 'Slack',
    description: 'Messaging and workspace integration',
    type: 'canonical', status: 'seeded_unverified',
    sources: [{ url: 'https://api.slack.com/authentication/oauth-v2', domain: 'api.slack.com' }],
    content: {
      icon: '#',
      approach: 'Review the current official OAuth documentation and select the authorization flow appropriate to the application and use case.',
      prerequisites: [
        'Confirm access to the relevant developer workspace.',
        'Define the agent’s intended actions.',
        'Review the current OAuth documentation.'
      ],
      steps: [
        'Read the official OAuth documentation.',
        'Map agent actions to the required permissions.',
        'Confirm redirect and installation requirements.',
        'Test the integration before production use.'
      ],
      permissions: 'Do not assume a fixed set of scopes; determine them from the use case and current provider documentation.',
      approval: 'Check workspace installation and any applicable administrator or app review requirements.',
      unknowns: ['This seed guide has not been live-verified by this application. Check current official documentation before implementation.'],
      readiness: { setup: 'Not verified', production: 'Not verified' }
    }
  },
  {
    id: 'google-drive', slug: 'google-drive', name: 'Google Drive',
    description: 'Files and document integration',
    type: 'canonical', status: 'seeded_unverified',
    sources: [{ url: 'https://developers.google.com/drive/api/guides/api-specific-auth', domain: 'developers.google.com' }],
    content: {
      icon: 'G',
      approach: 'Review current Google authorization and API-specific guidance to establish the appropriate configuration.',
      prerequisites: [
        'Identify the intended file access and user context.',
        'Review current Google developer documentation.',
        'Determine the minimum appropriate permissions.'
      ],
      steps: [
        'Review the official authorization documentation.',
        'Choose permissions based on the intended use case.',
        'Confirm consent-screen and application configuration requirements.',
        'Test access and permissions before production use.'
      ],
      permissions: 'Choose the minimum appropriate permissions and verify current requirements in official documentation.',
      approval: 'Review applicable consent-screen, verification, and account-specific requirements in current documentation.',
      unknowns: ['This seed guide has not been live-verified by this application. Check current official documentation before implementation.'],
      readiness: { setup: 'Not verified', production: 'Not verified' }
    }
  }
];

function App() {
  const [page, setPage] = useState<Page>(() => {
    const match = window.location.hash.match(/page=([^&]+)/);
    const candidate = match?.[1] as Page | undefined;
    return candidate && ['home', 'library', 'confirm', 'research', 'saved'].includes(candidate)
      ? candidate
      : 'home';
  });
  const [guides, setGuides] = useState<Guide[]>(demo);
  const [current, setCurrent] = useState<Guide | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [useCase, setUseCase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState({ app: '', url: '', use: '' });
  const [researchStatus, setResearchStatus] = useState('');
  const [shareUrl, setShareUrl] = useState('');

  const setResearchRequest = (next: { app: string; url: string; use: string }) => {
    setRequest(next);
    try {
      window.sessionStorage.setItem('oauth-compass-request', JSON.stringify(next));
    } catch {
      // Session storage may be unavailable; the current session can still continue.
    }
  };

  const restoreResearchRequest = () => {
    try {
      const raw = window.sessionStorage.getItem('oauth-compass-request');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.app === 'string' &&
          typeof parsed.url === 'string' && typeof parsed.use === 'string') {
        setRequest(parsed);
      }
    } catch {
      // Ignore invalid or unavailable session state.
    }
  };

  // Load guides AND persisted saved guides when the app starts.
  useEffect(() => {
    let active = true;

    const loadInitialData = async () => {
      try {
        const [guidesResponse, savedResponse] = await Promise.all([
          fetch('/api/guides'),
          fetch('/api/saved')
        ]);

        let canonicalGuides: Guide[] = [];
        let savedGuides: Guide[] = [];

        if (guidesResponse.ok) {
          const data = await guidesResponse.json();
          if (Array.isArray(data)) canonicalGuides = data;
        }

        if (savedResponse.ok) {
          const data = await savedResponse.json();
          if (Array.isArray(data)) savedGuides = data;
        }

        if (!active) return;

        // Include saved generated guides too, not just canonical guides.
        setGuides(previous => {
          const combined = [...canonicalGuides, ...savedGuides];
          const byId = new Map<string, Guide>();
          previous.forEach(g => byId.set(g.id, g));
          combined.forEach(g => byId.set(g.id, g));
          return Array.from(byId.values());
        });

        setSaved(savedGuides.map(g => g.id));
      } catch {
        // Keep the demo guides visible if the API is temporarily unavailable.
        if (active) {
          setError('Could not load saved guides from the server. Check that the backend is running.');
        }
      }
    };

    void loadInitialData();

    const guideHash = window.location.hash.match(/(?:^#|&)guide=([^&]+)/);
    const pageHash = window.location.hash.match(/(?:^#|&)page=([^&]+)/);

    if (guideHash) {
      fetch('/api/guides/' + decodeURIComponent(guideHash[1]))
        .then(r => r.ok ? r.json() : null)
        .then((g: Guide | null) => {
          if (active && g) {
            setCurrent(g);
            setGuides(previous => [
              g,
              ...previous.filter(item => item.id !== g.id)
            ]);
            setPage('guide');
          } else if (active) {
            setPage('home');
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }
        })
        .catch(() => {
          if (active) setPage('home');
        });
    } else if (pageHash) {
      const restoredPage = decodeURIComponent(pageHash[1]) as Page;
      if (['home', 'library', 'confirm', 'research', 'saved'].includes(restoredPage)) {
        setPage(restoredPage);
        if (restoredPage === 'confirm' || restoredPage === 'research') {
          restoreResearchRequest();
        }
      }
    }

    return () => {
      active = false;
    };
  }, []);

  const navigate = (p: Page) => {
    setPage(p);
    setError('');

    if (p === 'home') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } else if (p !== 'guide') {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search + '#page=' + encodeURIComponent(p)
      );
    }

    if (p === 'confirm' || p === 'research') restoreResearchRequest();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGuide = (g: Guide) => {
    setCurrent(g);
    setPage('guide');
    setError('');
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + '#guide=' + encodeURIComponent(g.id)
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const find = async () => {
    const q = query.trim();
    setError('');

    if (!q) {
      setError('Enter an application name or documentation URL to continue.');
      return;
    }

    setLoading(true);

    try {
      if (/^https?:\/\//i.test(q)) {
        const u = new URL(q);
        const found = guides.find(g =>
          g.sources.some(s => {
            const d = new URL(s.url).hostname;
            return u.hostname === d || u.hostname.endsWith('.' + d);
          })
        );

        if (found) {
          openGuide(found);
          return;
        }

        setResearchRequest({ app: u.hostname, url: u.href, use: useCase.trim() });
        navigate('confirm');
        return;
      }

      const r = await fetch('/api/search?q=' + encodeURIComponent(q));

      if (r.ok) {
        const results: Guide[] = await r.json();

        if (results.length === 1) {
          openGuide(results[0]);
          return;
        }

        if (results.length > 1) {
          setGuides(old => [
            ...old.filter(g => !results.some(x => x.id === g.id)),
            ...results
          ]);
          setError('Choose the matching application below.');
          return;
        }
      }

      const match = guides.find(g => g.name.toLowerCase() === q.toLowerCase());

      if (match) {
        openGuide(match);
        return;
      }

      setResearchRequest({ app: q, url: '', use: useCase.trim() });
      navigate('confirm');
    } catch {
      try {
        const u = new URL(q);
        setResearchRequest({ app: u.hostname, url: u.href, use: useCase.trim() });
        navigate('confirm');
      } catch {
        setError('That URL does not look valid. Enter an application name or a valid HTTP(S) documentation URL.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startResearch = async () => {
    setResearchStatus('Checking research configuration…');
    navigate('research');
    setLoading(true);

    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          appName: request.app,
          docsUrl: request.url,
          useCase: request.use
        })
      });

      const data = await r.json();

      if (!r.ok) {
        setResearchStatus(data.error || 'Research could not start.');
        return;
      }

      setResearchStatus('Research completed; the guide needs human review.');

      if (data.guide) {
        setGuides(old => [
          data.guide,
          ...old.filter(g => g.id !== data.guide.id)
        ]);
        openGuide(data.guide);
      }
    } catch {
      setResearchStatus('The research API is unreachable. Start the server and check its configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Only update the saved state after the backend confirms the save.
  const save = async () => {
    if (!current) return;

    setError('');

    try {
      const r = await fetch('/api/guides/' + encodeURIComponent(current.id) + '/save', {
        method: 'POST'
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        throw new Error(data?.error || 'The server could not save this guide.');
      }

      setSaved(previous =>
        previous.includes(current.id) ? previous : [...previous, current.id]
      );

      setGuides(previous => [
        current,
        ...previous.filter(g => g.id !== current.id)
      ]);
    } catch {
      setError('Could not save this guide on the server. Check that the backend is running, then try again.');
    }
  };

  const share = async () => {
    if (!current) return;

    const url = new URL('/#guide=' + encodeURIComponent(current.id), location.origin).href;
    setShareUrl(url);

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // The URL remains visible so the user can copy it manually.
    }
  };

  const filtered = useMemo(
    () => guides.filter(g => g.type === 'canonical'),
    [guides]
  );

  const Badge = ({
    children,
    kind = 'neutral'
  }: {
    children: React.ReactNode;
    kind?: string;
  }) => <span className={'badge ' + kind}>{children}</span>;

  const GuideCard = ({ g }: { g: Guide }) => (
    <button className="guide-card" onClick={() => openGuide(g)}>
      <span className="app-icon">{g.content?.icon || g.name[0]}</span>
      <span className="card-copy">
        <strong>{g.name}</strong>
        <small>{g.description}</small>
      </span>
      <ArrowRight size={17} />
    </button>
  );

  const evidence = <Badge kind="warn">Unknown / Needs verification</Badge>;

  // Accept evidence records whether the backend returns them nested in
  // content or at the top level of the guide.
  const getStepEvidence = (step: string) => {
    const records =
      current?.content?.stepEvidence ||
      current?.stepEvidence ||
      [];

    const record = records.find((item: any) => item?.step === step);

    if (!record) {
      return {
        status: 'Unknown / Needs verification',
        evidenceQuote: undefined,
        sourceUrl: undefined,
      };
    }

    // Only display Documented when both a quotation and source URL exist.
    if (
      record.status === 'Documented' &&
      typeof record.evidenceQuote === 'string' &&
      record.evidenceQuote.trim().length >= 20 &&
      typeof record.sourceUrl === 'string' &&
      record.sourceUrl.trim()
    ) {
      return record;
    }

    if (record.status === 'Estimated') {
      return record;
    }

    return {
      ...record,
      status: 'Unknown / Needs verification',
      evidenceQuote: undefined,
      sourceUrl: undefined,
    };
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')}>
        <img
  className="brand-mark"
  src="/compass.svg"
  alt="OAuth Compass"
/>
          <span>
            <strong>OAuth Compass</strong>
            <small>Navigate OAuth integrations with clarity.</small>
          </span>
        </button>
        <div className="top-actions">
          <span className="badge">MVP</span>
          <button
            className="button"
            onClick={() => {
              setQuery('');
              setUseCase('');
              navigate('home');
            }}
          >
            <Plus size={15} /> New guide
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="side-label">WORKSPACE</div>
          <button className={'nav-item ' + (page === 'home' ? 'active' : '')} onClick={() => navigate('home')}>
            <Search size={16} /> Find a guide
          </button>
          <button className={'nav-item ' + (page === 'library' ? 'active' : '')} onClick={() => navigate('library')}>
            <BookOpen size={16} /> Guide library
          </button>
          <button className={'nav-item ' + (page === 'saved' ? 'active' : '')} onClick={() => navigate('saved')}>
            <Copy size={16} /> Saved & shared
            <span className="nav-count">{saved.length}</span>
          </button>

          <div className="sidebar-note">
            <ShieldCheck size={18} />
            <strong>Evidence first</strong>
            <p>Understand what is documented, what is estimated, and what still needs verification.</p>
          </div>
          <div className="sidebar-foot">Provider-agnostic OAuth research</div>
        </aside>

        <main className="main">
          {page === 'home' && (
            <>
              <div className="eyebrow"><Sparkles size={13} /> PROVIDER-AGNOSTIC OAUTH RESEARCH</div>
              <h1>Know the work<br />before you build.</h1>
              <p className="intro">
                Find the real setup path for an integration. Every requirement should link to official documentation—or be clearly marked unknown.
              </p>

              <div className="search-panel">
                <label htmlFor="query">Application or documentation URL</label>
                <div className="search-row">
                  <input
                    id="query"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && find()}
                    placeholder="e.g. Linear, Shopify, or a docs URL"
                  />
                  <button className="button primary" onClick={find} disabled={loading}>
                    {loading ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}
                    Find OAuth guide
                  </button>
                </div>
                <label htmlFor="usecase" className="use-label">
                  What will your agent do? <span>(optional)</span>
                </label>
                <textarea
                  id="usecase"
                  rows={2}
                  maxLength={500}
                  value={useCase}
                  onChange={e => setUseCase(e.target.value)}
                  placeholder="Read project issues and create a summary…"
                />
                <div className="char-count">{useCase.length}/500</div>
                {error && <p className="error">{error}</p>}
              </div>

              <div className="section-heading">
                <h2>Explore existing guides</h2>
                <button className="text-button" onClick={() => navigate('library')}>
                  View library <ArrowRight size={14} />
                </button>
              </div>
              <div className="cards-grid">
                {filtered.map(g => <GuideCard key={g.id} g={g} />)}
              </div>

              <div className="section-heading"><h2>A plan you can audit, not just copy.</h2></div>
              <div className="principles">
                <div>
                  <Globe2 />
                  <strong>Official sources</strong>
                  <p>Keep provider documentation close to the requirements it supports.</p>
                </div>
                <div>
                  <ShieldCheck />
                  <strong>Evidence labels</strong>
                  <p>Separate documented, tested, estimated, and unknown claims.</p>
                </div>
                <div>
                  <ArrowRight />
                  <strong>Clear ownership</strong>
                  <p>Separate agent-supported work from human approval.</p>
                </div>
              </div>
            </>
          )}

          {page === 'library' && (
            <>
              <button className="back" onClick={() => navigate('home')}>
                <ArrowLeft size={15} /> Back
              </button>
              <h1 className="page-title">Guide library</h1>
              <p className="intro">A small set of canonical sample guides. These seed entries are not live-verified.</p>
              <div className="stack">
                {filtered.map(g => (
                  <div key={g.id}>
                    <GuideCard g={g} />
                    <div className="source-line">
                      Official reference:{' '}
                      <a href={g.sources[0]?.url} target="_blank" rel="noreferrer">
                        {g.sources[0]?.domain || g.sources[0]?.url} <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {page === 'confirm' && (
            <>
              <button className="back" onClick={() => navigate('home')}>
                <ArrowLeft size={15} /> Edit request
              </button>
              <h1 className="page-title">Research this application</h1>
              <p className="intro">Review what will be researched before starting.</p>
              <div className="panel padded">
                <div className="field-label">APPLICATION</div>
                <h2>{request.app}</h2>
                <div className="field-label">DOCUMENTATION URL</div>
                <p>{request.url || 'No URL supplied. The first research version requires an official documentation URL.'}</p>
                <div className="field-label">USE CASE</div>
                <p>{request.use || 'No use case specified.'}</p>
                <div className="notice">
                  Live research requires a server-side LLM key and an accessible official documentation URL. The app will report configuration errors rather than fabricate a guide.
                </div>
                <button className="button primary" onClick={startResearch} disabled={loading}>
                  Start research <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}

{page === 'research' && (
            <>
              <button className="back" onClick={() => navigate('home')}>
                <ArrowLeft size={15} /> Back to search
              </button>
              <h1 className="page-title">Research status</h1>
              <div className="panel padded">
                <Badge kind="warn">
                  {loading ? 'In progress' : 'Needs configuration or review'}
                </Badge>
                <h2 className="subheading">{request.app}</h2>
                <p className="muted">{researchStatus || 'Checking research setup.'}</p>

                {[
                  'Find relevant documentation',
                  'Extract OAuth requirements',
                  'Check evidence and gaps',
                  'Prepare the guide'
                ].map((stage, i) => {
                  const sourceRejected =
                    !loading &&
                    /does not contain enough readable oauth|no guide was generated|source was rejected/i.test(researchStatus);

                  const requestFailed =
                    !loading &&
                    Boolean(researchStatus) &&
                    !/completed/i.test(researchStatus);

                  let stageStatus = 'Not run yet';

                  if (loading && i === 0) {
                    stageStatus = 'Checking source…';
                  } else if (sourceRejected && i === 0) {
                    stageStatus = 'Stopped: source did not pass validation';
                  } else if (sourceRejected && i > 0) {
                    stageStatus = 'Not run because the source was rejected';
                  } else if (requestFailed) {
                    stageStatus = 'Not completed';
                  } else if (!loading && /completed/i.test(researchStatus)) {
                    stageStatus = 'Completed; guide requires human review';
                  }

                  return (
                    <div className="research-stage" key={stage}>
                      <span className="stage-number">{i + 1}</span>
                      <div>
                        <strong>{stage}</strong>
                        <small>{stageStatus}</small>
                      </div>
                    </div>
                  );
                })}

                <button className="button" onClick={() => navigate('home')}>
                  Return to search
                </button>
              </div>
            </>
          )}

          {page === 'guide' && current && (
            <>
              <div className="guide-toolbar">
                <button className="back" onClick={() => navigate('home')}>
                  <ArrowLeft size={15} /> Back to search
                </button>
                <div className="toolbar-actions">
                  <button className="button" onClick={save}>
                    <Check size={15} /> {saved.includes(current.id) ? 'Saved' : 'Save guide'}
                  </button>
                  <button className="button" onClick={share}>
                    <Copy size={15} /> Share
                  </button>
                </div>
              </div>

              {shareUrl && (
                <div className="notice share-notice">
                  Link copied when browser permissions allow: <a href={shareUrl}>{shareUrl}</a>
                  <button className="text-button" onClick={() => setShareUrl('')}>Dismiss</button>
                </div>
              )}

              <div className="eyebrow">
                {current.type === 'canonical' ? 'CANONICAL SAMPLE' : 'GENERATED GUIDE'} · NOT LIVE-VERIFIED
              </div>
              <h1 className="page-title">{current.name} OAuth setup</h1>
              <p className="intro">{current.description}. {current.content?.summary || ''}</p>
              <div className="badges-row">
                {evidence}
                <Badge>Source fetched; claims not independently verified</Badge>
              </div>

              <div className="notice">
                <strong>Evidence disclaimer</strong><br />
                This guide was generated from the retrieved source page, but its instructions have not been independently verified. Check each requirement against the linked documentation before implementation. A source link alone does not prove a claim.
              </div>

              <div className="guide-grid">
                <div className="guide-sections">
                  <section className="panel padded">
                    <h2>01 · Readiness</h2>
                    <div className="readiness">
                      <div><small>SETUP READINESS</small><strong>Not verified</strong></div>
                      <div><small>PRODUCTION READINESS</small><strong>Not verified</strong></div>
                    </div>
                    <p className="muted">A guide being available does not mean setup is complete or production requirements have been satisfied.</p>
                  </section>

                  <section className="panel padded">
                    <h2>02 · Prerequisites</h2>
                    <ol>{(current.content?.prerequisites || []).map((x: string, i: number) => <li key={i}>{x}</li>)}</ol>
                    {evidence}
                  </section>

                  <section className="panel padded">
                    <h2>03 · OAuth approach</h2>
                    <p>{current.content?.approach}</p>
                    {evidence}
                  </section>

                  <section className="panel padded">
                    <h2>04 · Setup steps</h2>
                    <ol>
                      {(current.content?.steps || []).map((step: string, i: number) => {
                        const item = getStepEvidence(step);
                        const isDocumented =
                          item.status === 'Documented' &&
                          typeof item.evidenceQuote === 'string' &&
                          typeof item.sourceUrl === 'string';
                        const isEstimated = item.status === 'Estimated';

                        return (
                          <li key={i}>
                            {step}

                            <div className="step-label">
                              {isDocumented ? (
                                <Badge kind="neutral">Documented · quotation matched</Badge>
                              ) : isEstimated ? (
                                <Badge kind="neutral">Estimated suggestion</Badge>
                              ) : (
                                <Badge kind="warn">Unknown / Needs verification</Badge>
                              )}
                            </div>

                            {isDocumented && (
                              <details className="step-evidence">
                                <summary>View supporting evidence</summary>
                                <blockquote>{item.evidenceQuote}</blockquote>
                                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                                  Open source page <ExternalLink size={12} />
                                </a>
                              </details>
                            )}

                            {isEstimated && (
                              <p className="muted step-evidence-note">
                                This is an implementation suggestion, not a provider requirement verified from the source.
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </section>

                  <section className="panel padded">
                    <h2>05 · Scopes and permissions</h2>
                    <p>{current.content?.permissions}</p>
                    {evidence}
                  </section>

                  <section className="panel padded">
                    <h2>06 · Approval and verification</h2>
                    <p>{current.content?.approval}</p>
                    {evidence}
                  </section>

                  <section className="panel padded">
                    <h2>07 · Remaining work</h2>
                    <ul>
                      {(current.content?.unknowns || ['Verify requirements against current official documentation.']).map((x: string, i: number) => <li key={i}>{x}</li>)}
                    </ul>
                    {evidence}
                  </section>
                </div>

                <aside className="guide-aside">
                  <section className="panel padded">
                    <h3>Official reference</h3>
                    <p className="muted">Use the provider's documentation to validate current requirements.</p>
                    {current.sources?.map((source, i) => (
                      <a className="source-link" key={i} href={source.url} target="_blank" rel="noreferrer">
                        {source.domain || source.url} <ExternalLink size={13} />
                      </a>
                    ))}
                    <div className="rule" />
                    <h3>Effort estimate</h3>
                    <p className="muted">Not estimated. A reliable estimate requires verified steps and assumptions.</p>
                    {evidence}
                    <div className="rule" />
                    <h3>Human actions</h3>
                    <p className="muted">Confirm account access, permissions, approval needs, and production requirements with the provider.</p>
                  </section>
                </aside>
              </div>

              {error && <p className="error">{error}</p>}
            </>
          )}

          {page === 'saved' && (
            <>
              <button className="back" onClick={() => navigate('home')}>
                <ArrowLeft size={15} /> Back
              </button>
              <h1 className="page-title">Saved & shared</h1>
              <div className="notice">
                Saved guides are loaded from the server, so they should remain available after a page refresh. Shared links require the app to be hosted to work for others.
              </div>
              <div className="stack">
                {saved.length > 0 ? (
                  saved.map(id => {
                    const g = guides.find(x => x.id === id);
                    return g ? <GuideCard key={id} g={g} /> : null;
                  })
                ) : (
                  <div className="panel padded">
                    <h2>No saved guides yet</h2>
                    <p className="muted">Open a guide and choose Save guide to add it here.</p>
                    <button className="button" onClick={() => navigate('library')}>Browse guides</button>
                  </div>
                )}
              </div>
            </>
          )}

          <footer className="footer">
            <span>OAuth Compass</span>
            <span>Evidence first · Uncertainty visible</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

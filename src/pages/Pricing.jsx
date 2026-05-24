// Atlas — Pricing + Docs

function Pricing({ onNav, theme, onToggleTheme }) {
  const [openFaq, setOpenFaq] = useState(0);
  const faqs = [
    { q: 'What\'s in the free Apache 2.0 self-host?', a: 'Everything. The full stack — hybrid retrieval, the 1,000-question eval harness, the trace explorer, all 24 app screens. The hosted plans differ only in operational lift: we run Postgres, Redis, and the LLM proxies for you, and you stop paying when you scale to zero.' },
    { q: 'Why charge for "Pro" if the OSS version is full-featured?',     a: 'Bandwidth, support, and the per-query LLM cost we eat below your usage cap. Pro pricing covers infra plus a small margin. You can compare line-by-line costs at /usage in the self-host vs the managed bill.' },
    { q: 'Can I migrate from self-host to managed (or back)?',           a: 'Yes — `atlas migrate export` writes a portable bundle (documents, embeddings, eval runs, settings). `atlas migrate import` reads it on either side. We test this round-trip in CI.' },
    { q: 'How do you handle our data?',                                  a: 'On the managed plan, your tenant is isolated by Postgres RLS (the same isolation used in self-host). We never train on your data, never log raw queries, and we publish a SOC 2 Type 2 report quarterly. Audit logs are queryable from /app/settings/danger.' },
    { q: 'What\'s the latency SLO?',                                     a: 'Pro: p95 under 1.5 s end-to-end including rerank, measured at the API boundary. Enterprise: bring your own SLO and we\'ll write it into the contract.' },
    { q: 'How do you compute usage?',                                    a: 'Per-query, summed across the LangGraph DAG. Cached responses (about 40% of typical workloads) count as one cache hit, billed at $0.000001. Embeddings are billed once per chunk per model.' },
  ];

  return (
    <div className="mk-shell" data-screen-label="23 Pricing">
      <MarketingTop active="pricing" onNav={onNav} />

      <div className="mk-container">
        <section style={{ padding: '96px 0 48px', maxWidth: 720 }}>
          <div className="mk-eyebrow"><span className="pulse"></span>PRICING</div>
          <h1 style={{ fontFamily: 'var(--ff-display)', fontSize: 56, fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 24px' }}>
            Open source, by default.
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1.55, margin: 0 }}>
            Apache 2.0. Run the whole thing on your laptop with one command. Pay only if you'd rather not run Postgres yourself.
          </p>
        </section>

        <section style={{ paddingBottom: 96 }}>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="ptitle">Self-host</div>
              <div className="psub">Apache 2.0 · forever free</div>
              <div className="pprice">$0</div>
              <div className="pnote">your infra costs only</div>
              <ul>
                {['Full source on GitHub', 'Hybrid retrieval + rerank', '1,000-question eval harness', 'Trace explorer + cost meter', 'Multi-tenant via Postgres RLS', 'Community support · Discord'].map(b => (
                  <li key={b}><Icon name="check" size={14} className="ck" />{b}</li>
                ))}
              </ul>
              <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNav('docs')}>Read the quickstart →</Button>
            </div>

            <div className="pricing-card featured">
              <div className="ptitle">Pro · managed <Pill variant="accent" style={{ marginLeft: 8 }}>most teams</Pill></div>
              <div className="psub">We run Postgres + Redis + the LLM proxy</div>
              <div className="pprice">$49<span className="unit">/ workspace / mo</span></div>
              <div className="pnote">+ pass-through model spend · cancel anytime</div>
              <ul>
                {['Everything in Self-host', '10,000 documents included', '100,000 queries included', 'p95 &lt; 1.5 s SLO', 'Email + Slack support', 'Daily backups · 30-day retention', 'Custom subdomain + branded eval reports'].map(b => (
                  <li key={b}><Icon name="check" size={14} className="ck" />{b}</li>
                ))}
              </ul>
              <Button variant="primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNav('signup')}>Start a 14-day trial</Button>
            </div>

            <div className="pricing-card">
              <div className="ptitle">Enterprise</div>
              <div className="psub">SSO · audit logs · custom SLO</div>
              <div className="pprice">Talk to us</div>
              <div className="pnote">annual contract · invoice billing</div>
              <ul>
                {['Everything in Pro', 'SAML SSO · SCIM provisioning', 'Audit log export to S3 / GCS', 'Single-tenant deploy region', 'Dedicated Slack channel', 'SOC 2 Type 2 + DPA on request'].map(b => (
                  <li key={b}><Icon name="check" size={14} className="ck" />{b}</li>
                ))}
              </ul>
              <Button variant="secondary" style={{ width: '100%', justifyContent: 'center' }}>Schedule a call →</Button>
            </div>
          </div>

          <div className="faq-acc" style={{ margin: '64px auto 0' }}>
            <h2 style={{ fontFamily: 'var(--ff-ui)', fontSize: 22, fontWeight: 500, marginBottom: 24 }}>Frequently asked</h2>
            {faqs.map((f, i) => (
              <div key={i} className={'faq-item ' + (openFaq === i ? 'open' : '')}>
                <div className="q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  {f.q}
                  <Icon name="chevron-down" size={16} className="chev" />
                </div>
                <div className="a">{f.a}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <MarketingFooter onNav={onNav} theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}

// ============================================================
// Documentation Hub
// ============================================================
const DOCS_TREE = [
  { group: 'Getting started', items: ['Quickstart', 'Concepts', 'Glossary'] },
  { group: 'Architecture', items: ['Overview', 'Data model', 'Multi-tenancy', 'Retrieval', 'Generation', 'Evaluation'] },
  { group: 'Operations', items: ['Deployment', 'Configuration', 'Monitoring', 'Cost model', 'Failure modes'] },
  { group: 'Reference', items: ['API', 'CLI', 'MCP', 'Helm values', 'Environment variables'] },
  { group: 'Tutorials', items: ['Build a custom chunker', 'Add a new reranker', 'Run an ablation', 'Connect to Claude Desktop'] },
];

function Docs({ onNav, theme, onToggleTheme }) {
  const [active, setActive] = useState('Quickstart');

  return (
    <div className="mk-shell" data-screen-label="03 Docs">
      <MarketingTop active="docs" onNav={onNav} />

      <div className="docs-shell">
        <aside className="docs-side">
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input className="input" placeholder="Search docs" style={{ paddingLeft: 30, fontSize: 13, padding: '7px 10px 7px 30px' }} />
          </div>
          {DOCS_TREE.map(g => (
            <div key={g.group} className="group">
              <div className="group-title">{g.group}</div>
              {g.items.map(it => (
                <a key={it} className={active === it ? 'active' : ''} onClick={() => setActive(it)}>{it}</a>
              ))}
            </div>
          ))}
        </aside>

        <main className="docs-content">
          {active === 'Quickstart' ? <QuickstartDoc /> : <DocPagePlaceholder title={active} onNext={(t) => setActive(t)} />}
        </main>

        <aside className="docs-toc">
          <div className="toc-title">ON THIS PAGE</div>
          <a className="active">Install</a>
          <a>Run docker compose</a>
          <a>Open the app</a>
          <a>Upload a document</a>
          <a>Ask your first question</a>
          <a>Read the trace</a>
          <a>Run an eval</a>
          <a>Next steps</a>
        </aside>
      </div>

      <MarketingFooter onNav={onNav} theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}

function QuickstartDoc() {
  return (
    <>
      <h1>Quickstart</h1>
      <p className="lede">Get a working Atlas installation in under five minutes, on your laptop, with one terminal command.</p>

      <h2>Install</h2>
      <p>Atlas ships as a Docker Compose stack — Postgres with pgvector, Redis, the FastAPI server, the Next.js web UI, and a background worker for ingestion. Clone the repo:</p>
      <pre><span className="lang">bash</span>git clone https://github.com/atlas/atlas
cd atlas</pre>

      <h2>Run docker compose</h2>
      <p>From the repo root, boot the stack. First run pulls images (~1.2 GB) and migrates the database; subsequent runs are warm.</p>
      <pre><span className="lang">bash</span>docker compose up</pre>
      <p>Atlas waits for Postgres and Redis to be healthy, then prints the URL to open.</p>

      <h2>Open the app</h2>
      <p>Browse to <code>http://localhost:3000</code>. The first signup is the workspace owner — there's no email verification step in local dev. You'll land in the onboarding flow.</p>

      <h2>Upload a document</h2>
      <p>Drag any PDF, DOCX, Markdown, or HTML file onto the drop zone. Atlas chunks the file (recursive 512×80 tokens by default <HelpQ term="recursive chunking" />), generates embeddings with BGE-large, and stores everything in Postgres.</p>
      <p>The first ingest takes about 20 seconds for a 100-page PDF on a 2024 laptop. Watch the per-chunk progress in the document detail page.</p>

      <h2>Ask your first question</h2>
      <p>Open <strong>Chat</strong> from the sidebar. Type a question that the document should answer. Atlas runs the full LangGraph DAG:</p>
      <ol>
        <li>Query rewrite (optional, defaults on)</li>
        <li>Parallel BM25 + dense retrieval (top-30 each)</li>
        <li>RRF fusion <HelpQ term="RRF" /></li>
        <li>Cross-encoder rerank (top-8)</li>
        <li>Generation with citations</li>
        <li>Citation verification</li>
      </ol>

      <h2>Read the trace</h2>
      <p>Every answer has a "view trace →" link in its meta row. Click it to see per-node latency, every retrieved chunk (with both BM25 and dense ranks shown), the generated answer with verifier results, and a token-by-token cost breakdown.</p>

      <h2>Run an eval</h2>
      <p>Atlas ships with a 1,000-question evaluation harness. Smoke (50 questions) runs in about 90 seconds:</p>
      <pre><span className="lang">bash</span>atlas-eval run --dataset smoke</pre>
      <p>Output is a report card with paired-bootstrap confidence intervals against the previous run.</p>

      <h2>Try the CLI</h2>
      <p>The playground below runs against a sandboxed Atlas instance preloaded with the AMD 10-K. Type a command or click an example.</p>
      <CliPlayground />

      <h2>Next steps</h2>
      <p>You have a working Atlas. Three good directions from here:</p>
      <ul>
        <li><strong>Read the architecture overview</strong> — understand how the pieces fit together.</li>
        <li><strong>Configure retrieval</strong> — try a different chunker or reranker; defaults are good but not perfect for every corpus.</li>
        <li><strong>Connect to Claude Desktop via MCP</strong> — query your documents from a chat client.</li>
      </ul>

      <a className="next-link" onClick={() => {}}>
        <div>
          <div className="nx-label">NEXT</div>
          <div className="nx-title">Concepts → How retrieval, generation, and evaluation fit together</div>
        </div>
        <Icon name="arrow-right" size={20} style={{ color: 'var(--text-muted)' }} />
      </a>
    </>
  );
}

function DocPagePlaceholder({ title, onNext }) {
  return (
    <>
      <h1>{title}</h1>
      <p className="lede">Full {title.toLowerCase()} reference. In the real docs site this page contains comprehensive content per the spec — kept short here to demonstrate navigation.</p>

      <h2>Overview</h2>
      <p>The {title} section follows the same pattern as the Quickstart: a short lede, a sequence of H2 sections with anchor-friendly headings, code blocks where relevant, and inline definitions for every new term that link to the glossary.</p>
      <p>Heading hierarchy is strictly H1 &gt; H2 &gt; H3. Code blocks all have a copy button. Every page ends with a "Next →" link to keep readers moving through the docs in order.</p>

      <h2>Configuration example</h2>
      <pre><span className="lang">yaml</span>retrieval:
  mode: hybrid+rrf
  top_k_fused: 30
  bm25_weight: 0.5
  reranker:
    model: bge-reranker-v2-m3
    top_k_after: 8</pre>

      <h2>Common pitfalls</h2>
      <ul>
        <li>Forgetting to migrate <code>schema.sql</code> after a version bump.</li>
        <li>Using the wrong tokenizer in chunk_size — see the <a onClick={() => onNext('Concepts')} style={{ cursor: 'pointer' }}>Concepts</a> page for tokenizer alignment.</li>
        <li>Setting <code>top_k_after</code> higher than the LLM's effective context window.</li>
      </ul>

      <a className="next-link" onClick={() => onNext('Concepts')}>
        <div>
          <div className="nx-label">NEXT</div>
          <div className="nx-title">Concepts</div>
        </div>
        <Icon name="arrow-right" size={20} style={{ color: 'var(--text-muted)' }} />
      </a>
    </>
  );
}

function CliPlayground() {
  const [lines, setLines] = useState([
    { kind: 'sys', text: 'atlas playground · sandbox tenant: demo-corpus (AMD-Q4-2023-10K.pdf)' },
    { kind: 'sys', text: 'Type `help` to see available commands.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, busy]);

  const COMMANDS = {
    help: () => [
      'atlas help · available commands',
      '',
      '  atlas query <question>          Ask the corpus with citations',
      '  atlas retrieve <query>          Top-5 chunks, no generation',
      '  atlas eval run --dataset smoke  Run the 50-question smoke set',
      '  atlas docs list                 List documents in the workspace',
      '  atlas trace last                Show the most recent trace ID',
      '  clear                           Clear the playground',
    ].join('\n'),

    'atlas docs list': () =>
      [
        'ID                  TITLE                          PAGES  CHUNKS  STATUS',
        '──────────────────  ─────────────────────────────  ─────  ──────  ──────',
        'doc_8f3a1c92        AMD-Q4-2023-10K.pdf             124    412    ready',
      ].join('\n'),

    'atlas trace last': () => 'trace_id  8f3a-1c92-7e44-1029\nlat       1.12 s  ·  $0.0007  ·  verified ✓',

    'atlas eval run --dataset smoke': async (push) => {
      push({ kind: 'out', text: '  > loading dataset smoke-50 (50 questions)…' });
      await sleep(400);
      push({ kind: 'out', text: '  > config: hybrid+rrf · bge-rerank · top_k=8' });
      await sleep(300);
      for (let i = 10; i <= 50; i += 10) {
        push({ kind: 'out', text: `  > question ${i}/50…` });
        await sleep(280);
      }
      push({ kind: 'out', text: '' });
      push({ kind: 'out', text: '  recall@5      0.808  (95% CI [0.781, 0.835])' });
      push({ kind: 'out', text: '  faithfulness  0.93' });
      push({ kind: 'out', text: '  p95 latency   1.09 s' });
      push({ kind: 'out', text: '  cost          $0.41 total' });
      push({ kind: 'out', text: '' });
      push({ kind: 'out', text: '  → no regression vs baseline (paired bootstrap)' });
    },
  };

  // Some commands match by prefix
  const PREFIX = {
    'atlas query ': async (q, push) => {
      push({ kind: 'out', text: '  > rewriting · retrieving · reranking · generating · verifying…' });
      await sleep(900);
      const exemplar = q.toLowerCase().includes('revenue')
        ? `AMD reported Q4 2023 revenue of $6.2 billion [1], up 10% YoY from $5.6 billion [2].\nData Center segment revenue more than doubled to $2.3 billion [3].`
        : `Based on the AMD 10-K, the corpus contains specific Q4 2023 financial data and forward-looking commentary.\nTry: "what was the Q4 2023 revenue?" or "summarize the risk factors."`;
      push({ kind: 'out', text: exemplar });
      push({ kind: 'out', text: '' });
      push({ kind: 'meta', text: '  1.12 s · 412 tok in / 218 tok out · $0.0007 · trace 8f3a-1c92' });
    },
    'atlas retrieve ': async (q, push) => {
      push({ kind: 'out', text: '  > running BM25 + dense · fusing · reranking…' });
      await sleep(500);
      push({ kind: 'out', text: '' });
      push({ kind: 'out', text: '  RANK  SCORE  CHUNK_ID         DOC                          P.' });
      push({ kind: 'out', text: '  ────  ─────  ───────────────  ───────────────────────────  ──' });
      push({ kind: 'out', text: '   1    0.982  chk_a3f2bc91     AMD-Q4-2023-10K.pdf          34' });
      push({ kind: 'out', text: '   2    0.964  chk_b21f0892     AMD-Q4-2023-10K.pdf          35' });
      push({ kind: 'out', text: '   3    0.951  chk_c84422a1     AMD-Q4-2023-10K.pdf          36' });
      push({ kind: 'out', text: '   4    0.918  chk_d92ee30e     AMD-Q4-2023-10K.pdf          37' });
      push({ kind: 'out', text: '   5    0.890  chk_e10ff44a     AMD-Q4-2023-10K.pdf          42' });
    },
  };

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function execute(raw) {
    const cmd = raw.trim();
    if (!cmd) return;
    setLines(curr => [...curr, { kind: 'cmd', text: cmd }]);
    setBusy(true);

    if (cmd === 'clear') {
      setLines([{ kind: 'sys', text: 'atlas playground · sandbox tenant: demo-corpus' }]);
      setBusy(false);
      return;
    }

    // Exact match commands
    if (COMMANDS[cmd]) {
      const out = COMMANDS[cmd];
      if (typeof out === 'function') {
        const result = out((line) => setLines(curr => [...curr, line]));
        if (result && result.then) await result;
      } else {
        setLines(curr => [...curr, { kind: 'out', text: out }]);
      }
      setBusy(false);
      return;
    }

    // Prefix match commands
    for (const [prefix, handler] of Object.entries(PREFIX)) {
      if (cmd.startsWith(prefix)) {
        const arg = cmd.slice(prefix.length);
        if (!arg) {
          setLines(curr => [...curr, { kind: 'err', text: `  ${prefix.trim()}: argument required` }]);
          setBusy(false);
          return;
        }
        await handler(arg, (line) => setLines(curr => [...curr, line]));
        setBusy(false);
        return;
      }
    }

    setLines(curr => [...curr, { kind: 'err', text: `  unknown command — try "help"` }]);
    setBusy(false);
  }

  return (
    <div className="cli-play">
      <div className="cli-head">
        <span className="cli-dots">
          <span className="dot dot-r"></span>
          <span className="dot dot-y"></span>
          <span className="dot dot-g"></span>
        </span>
        <span className="cli-title">atlas-cli · sandbox</span>
        <span className="cli-pulse"><span className="live-dot success"></span>connected</span>
      </div>
      <div className="cli-body" ref={scrollRef}>
        {lines.map((l, i) => (
          <div key={i} className={'cli-line cli-' + l.kind}>
            {l.kind === 'cmd' && <span className="prompt">$ </span>}
            {l.kind === 'err' && <span className="prompt err">!</span>}
            <span style={{ whiteSpace: 'pre-wrap' }}>{l.text}</span>
          </div>
        ))}
        {busy && (
          <div className="cli-line cli-out">
            <span className="spinner" style={{ width: 10, height: 10, marginRight: 8, verticalAlign: 'middle' }}></span>
            <span style={{ color: 'var(--text-subtle)' }}>running…</span>
          </div>
        )}
        <div className="cli-input-row">
          <span className="prompt">$</span>
          <input
            className="cli-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const c = input;
                setInput('');
                execute(c);
              }
            }}
            placeholder='try: atlas query "what was Q4 revenue?"'
            disabled={busy}
            autoFocus
          />
        </div>
      </div>
      <div className="cli-chips">
        <span style={{ color: 'var(--text-subtle)', fontSize: 11, marginRight: 4 }}>try:</span>
        {[
          'help',
          'atlas docs list',
          'atlas query "what was Q4 revenue?"',
          'atlas retrieve "data center"',
          'atlas eval run --dataset smoke',
        ].map(c => (
          <button key={c} className="cli-chip" onClick={() => execute(c)} disabled={busy}>{c}</button>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Pricing, Docs, CliPlayground });

// Atlas — API Keys, MCP, Help & Glossary

function ApiKeys() {
  const empty = useEmptyMode();
  const [keys, setKeys] = useState(empty ? [] : [
    { name: 'production-server',   prefix: 'atl_pk_a3f2bc91', created: '2026-04-12', lastUsed: '4m ago',  scopes: ['read', 'write'] },
    { name: 'cron-eval-runner',    prefix: 'atl_pk_b21f0892', created: '2026-04-30', lastUsed: '12h ago', scopes: ['read', 'write', 'admin'] },
    { name: 'jen-laptop-dev',      prefix: 'atl_pk_c84422a1', created: '2026-05-12', lastUsed: '2d ago',  scopes: ['read'] },
    { name: 'cursor-mcp',          prefix: 'atl_pk_d92ee30e', created: '2026-05-18', lastUsed: '34m ago', scopes: ['read', 'write'] },
  ]);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState(null);

  return (
    <div className="page" data-screen-label="15 API Keys">
      <div className="page-head">
        <div>
          <h1>API keys</h1>
          <div className="sub">{empty ? 'No keys yet · create one to enable programmatic access' : 'Programmatic access to your tenant. Each key shown once on creation — copy it then.'}</div>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>Create API key</Button>
      </div>

      {empty && keys.length === 0 && (
        <EmptyState
          icon="key"
          title="No API keys yet."
          body="API keys let you query Atlas from scripts, cron jobs, or your own services. Each key has scoped permissions and is shown exactly once on creation."
          primaryLabel="Create your first key"
          primaryIcon="plus"
          onPrimary={() => setCreating(true)}
          secondaryLabel="Read API reference →"
        />
      )}

      {(!empty || keys.length > 0) && <>

      <div className="tbl-scroll">
        <table className="doc-table" style={{ marginBottom: 24 }}>
        <thead>
          <tr>
            <th>NAME</th>
            <th>PREFIX</th>
            <th>SCOPES</th>
            <th>CREATED</th>
            <th>LAST USED</th>
            <th style={{ width: 28 }}></th>
          </tr>
        </thead>
        <tbody>
          {keys.map(k => (
            <tr key={k.prefix}>
              <td style={{ color: 'var(--text)', fontWeight: 500 }}>{k.name}</td>
              <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{k.prefix}<span style={{ color: 'var(--text-subtle)' }}>…</span></td>
              <td><div style={{ display: 'flex', gap: 4 }}>{k.scopes.map(s => <Tag key={s}>{s}</Tag>)}</div></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{k.created}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{k.lastUsed}</td>
              <td><button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setKeys(ks => ks.filter(x => x.prefix !== k.prefix))} title="Revoke"><Icon name="trash-2" size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>

      <Card padding={24}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>Use these keys with the Atlas API</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Pass your key as a Bearer token. All endpoints accept JSON. <a style={{ color: 'var(--accent)' }}>Open API reference →</a>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <CodeBlock lang="bash" code={`curl https://api.atlas.dev/v1/query \\
  -H "Authorization: Bearer atl_pk_..." \\
  -d '{"q": "What is RRF?"}'`} />
          <CodeBlock lang="python" code={`import httpx
r = httpx.post(
  "https://api.atlas.dev/v1/query",
  headers={"Authorization": f"Bearer {KEY}"},
  json={"q": "What is RRF?"},
)`} />
          <CodeBlock lang="typescript" code={`const r = await fetch(URL + "/v1/query", {
  method: "POST",
  headers: { Authorization: \`Bearer \${KEY}\` },
  body: JSON.stringify({ q: "What is RRF?" }),
});`} />
        </div>
      </Card>
      </>}

      <CreateKeyModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={(name, scopes) => {
          setCreating(false);
          setRevealed({ name, key: 'atl_pk_' + Math.random().toString(36).slice(2, 10) + '_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12) });
          setKeys(ks => [...ks, { name, prefix: 'atl_pk_' + Math.random().toString(36).slice(2, 10), created: 'just now', lastUsed: '—', scopes }]);
        }}
      />

      <RevealKeyModal revealed={revealed} onClose={() => setRevealed(null)} />
    </div>
  );
}

function CreateKeyModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState({ read: true, write: false, admin: false });

  if (!open) return null;
  return (
    <Modal open={true} onClose={onClose} title="Create API key" actions={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onCreate(name || 'untitled-key', Object.entries(scopes).filter(([, v]) => v).map(([k]) => k))} disabled={!name}>Create key</Button>
      </>
    }>
      <div style={{ marginBottom: 18 }}>
        <label className="field-label">Name</label>
        <input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. production-server" />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label className="field-label">Scopes</label>
        {[
          ['read',  'Read', 'Query, retrieve, view documents and evals.'],
          ['write', 'Write', 'Upload documents, create chats, run evals.'],
          ['admin', 'Admin', 'Manage members, billing, and other API keys. Use sparingly.'],
        ].map(([id, t, d]) => (
          <label key={id} style={{ display: 'flex', gap: 10, padding: '8px 0', cursor: 'pointer' }}>
            <input type="checkbox" checked={scopes[id]} onChange={e => setScopes(s => ({ ...s, [id]: e.target.checked }))} style={{ marginTop: 4 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d}</div>
            </div>
          </label>
        ))}
      </div>
      <div>
        <label className="field-label">Expires <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(optional)</span></label>
        <input className="input" type="date" />
      </div>
    </Modal>
  );
}

function RevealKeyModal({ revealed, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!revealed) return null;
  return (
    <Modal open={true} onClose={onClose} title="API key created" width={520} actions={
      <Button variant="primary" onClick={onClose}>I've saved it</Button>
    }>
      <strong style={{ color: 'var(--error)' }}>Copy this now. You won't see it again.</strong>
      <br /><br />
      Atlas never stores the full key — only a hash. If you lose it, revoke and create a new one.
      <div className="key-reveal">
        <span className="k">{revealed.key}</span>
        <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(revealed.key); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
    </Modal>
  );
}

// ============================================================
// MCP Connection (/app/mcp)
// ============================================================
function McpConnection() {
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(null);

  function runTest() {
    setTesting('running');
    setTimeout(() => setTesting('ok'), 1400);
  }

  const masked = reveal ? 'atl_pk_a3f2bc91_8a31xe0291' : 'atl_pk_a3f2bc91_••••••••••••';

  return (
    <div className="page" data-screen-label="16 MCP Connection">
      <div className="page-head">
        <div>
          <h1>MCP server</h1>
          <div className="sub">Expose your Atlas tenant to Claude Desktop, Cursor, or any MCP-compatible client.</div>
        </div>
        <Pill variant="success">Server ready</Pill>
      </div>

      <Card padding={24} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--accent-bg)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="plug" size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Claude Desktop</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Paste the JSON below into <code style={{ fontFamily: 'var(--ff-mono)', padding: '1px 6px', background: 'var(--bg-sunken)', borderRadius: 3 }}>~/Library/Application Support/Claude/claude_desktop_config.json</code> and restart Claude.</div>
          </div>
        </div>
        <CodeBlock lang="json" code={`{
  "mcpServers": {
    "atlas-acme-prod": {
      "command": "atlas",
      "args": ["mcp", "serve"],
      "env": {
        "ATLAS_TENANT": "acme-prod",
        "ATLAS_API_KEY": "${masked}",
        "ATLAS_URL": "https://api.atlas.dev"
      }
    }
  }
}`} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
          <Button variant="ghost" size="sm" icon={reveal ? 'eye-off' : 'eye'} onClick={() => setReveal(r => !r)}>
            {reveal ? 'Hide key' : 'Reveal key once'}
          </Button>
          <Button variant="secondary" size="sm" icon="external-link">Open Claude Desktop docs</Button>
        </div>
      </Card>

      <Card padding={24} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-sunken)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="code-2" size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Other MCP clients</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Cursor, Continue, or any custom MCP integration.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>CURSOR · settings.json</div>
            <CodeBlock lang="json" code={`"cursor.mcp.servers": {
  "atlas": {
    "url": "https://mcp.atlas.dev/sse",
    "headers": {
      "X-Atlas-Tenant": "acme-prod",
      "Authorization": "Bearer atl_pk_..."
    }
  }
}`} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>GENERIC HTTP/SSE</div>
            <CodeBlock lang="bash" code={`URL:     https://mcp.atlas.dev/sse
HEADERS:
  X-Atlas-Tenant: acme-prod
  Authorization:  Bearer <YOUR_KEY>

TOOLS EXPOSED:
  atlas.query       # ask a question
  atlas.retrieve    # raw retrieval
  atlas.documents   # list / fetch docs`} />
          </div>
        </div>
      </Card>

      <Card padding={24}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Test the connection</h3>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Runs a small query against your tenant.</div>
          </div>
          <Button variant="primary" icon="play" onClick={runTest} disabled={testing === 'running'}>
            {testing === 'running' ? 'Running…' : 'Run test query'}
          </Button>
        </div>
        {testing === 'running' && (
          <div style={{ background: 'var(--bg-sunken)', padding: 16, borderRadius: 'var(--radius-md)', fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ marginRight: 8, verticalAlign: 'middle' }}></span>
            connecting · authenticating · rewriting · retrieving · generating…
          </div>
        )}
        {testing === 'ok' && (
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', padding: 16, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
            <div style={{ color: 'var(--success)', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check-circle-2" size={14} /> Connection verified · trace 8f3a-1c92
            </div>
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 12, marginBottom: 8 }}>
              {'>'} test prompt: "list the documents in my workspace"
            </div>
            <div style={{ color: 'var(--text)', fontSize: 13, lineHeight: 1.55 }}>
              Your acme-prod tenant has 412 documents. The most recent is <code style={{ fontFamily: 'var(--ff-mono)' }}>AMD-Q4-2023-10K.pdf</code> uploaded 12 minutes ago.
            </div>
            <div style={{ marginTop: 10, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              0.94 s · 218 tok out · $0.0004
            </div>
          </div>
        )}
      </Card>

      {/* Tools exposed */}
      <McpToolsList />
    </div>
  );
}

function McpToolsList() {
  const [open, setOpen] = useState('atlas.query');
  const tools = [
    {
      name: 'atlas.query',
      desc: 'Ask a natural-language question. Atlas runs the full hybrid retrieval + rerank + generate pipeline and returns the answer with inline citations.',
      args: [
        { name: 'q',          type: 'string',         required: true,  desc: 'The question.' },
        { name: 'top_k',      type: 'number',         required: false, desc: 'Chunks to retain after rerank. Default 8.' },
        { name: 'rewrite',    type: 'boolean',        required: false, desc: 'Enable query rewriting. Default tenant setting.' },
        { name: 'verify',     type: 'boolean',        required: false, desc: 'Run citation verifier. Default true.' },
      ],
      returns: `{
  "answer":     "AMD reported Q4 2023 revenue of $6.2B…",
  "citations":  [
    { "n": 1, "chunk_id": "chk_a3f2…", "doc": "AMD-Q4-2023-10K.pdf", "page": 34 },
    { "n": 2, "chunk_id": "chk_b21f…", "doc": "AMD-Q4-2023-10K.pdf", "page": 35 }
  ],
  "trace_id":   "8f3a-1c92-7e44-1029",
  "meta":       { "latency_ms": 1118, "cost_usd": 0.0007, "tokens_in": 412, "tokens_out": 218 }
}`,
      example: `{
  "tool":   "atlas.query",
  "input":  { "q": "What was AMD's Q4 2023 revenue?", "top_k": 8 }
}`,
    },
    {
      name: 'atlas.retrieve',
      desc: 'Run retrieval only — get the top-K reranked chunks without generation. Useful when the calling agent wants to compose its own prompt.',
      args: [
        { name: 'q',         type: 'string',  required: true,  desc: 'The retrieval query.' },
        { name: 'top_k',     type: 'number',  required: false, desc: 'Chunks to return after rerank. Default 8.' },
        { name: 'mode',      type: 'enum',    required: false, desc: '"dense", "bm25", or "hybrid" (default).' },
        { name: 'rerank',    type: 'boolean', required: false, desc: 'Apply cross-encoder rerank. Default true.' },
      ],
      returns: `{
  "chunks": [
    {
      "id":        "chk_a3f2bc91",
      "doc":       "AMD-Q4-2023-10K.pdf",
      "page":      34,
      "score":     0.982,
      "text":      "…fourth quarter 2023 revenue was $6.2 billion…",
      "source":   ["BM25 #2", "dense #1"]
    }
  ],
  "trace_id": "8f3a-1c92-7e44-1029"
}`,
      example: `{
  "tool":   "atlas.retrieve",
  "input":  { "q": "Data Center segment revenue", "top_k": 5, "mode": "hybrid" }
}`,
    },
    {
      name: 'atlas.documents',
      desc: 'List, search, or fetch documents in your tenant. Read-only at this scope; managing documents requires the write scope.',
      args: [
        { name: 'action',     type: 'enum',   required: true,  desc: '"list", "get", or "search".' },
        { name: 'id',         type: 'string', required: false, desc: 'Document id (required for "get").' },
        { name: 'query',      type: 'string', required: false, desc: 'Search query (required for "search").' },
        { name: 'limit',      type: 'number', required: false, desc: 'Max documents. Default 50.' },
      ],
      returns: `{
  "documents": [
    {
      "id":      "doc_8f3a1c92",
      "title":   "AMD-Q4-2023-10K.pdf",
      "type":    "pdf",
      "pages":   124,
      "chunks":  412,
      "tags":    ["finance", "10-K", "amd"]
    }
  ],
  "next_cursor": null
}`,
      example: `{
  "tool":   "atlas.documents",
  "input":  { "action": "list", "limit": 10 }
}`,
    },
  ];

  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>Tools exposed via MCP</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
        Three tools, JSON-RPC over SSE. The full schema is auto-generated from the OpenAPI spec.
      </p>
      <div className="mcp-tools">
        {tools.map(t => (
          <div key={t.name} className={'mcp-tool ' + (open === t.name ? 'open' : '')}>
            <button className="mcp-tool-head" onClick={() => setOpen(open === t.name ? null : t.name)}>
              <Icon name={open === t.name ? 'chevron-down' : 'chevron-right'} size={14} style={{ color: 'var(--text-subtle)' }} />
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{t.name}</span>
              <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--text-muted)', flex: 1, textAlign: 'left' }}>{t.desc.split('.')[0]}.</span>
              <Tag>{t.args.length} args</Tag>
            </button>
            {open === t.name && (
              <div className="mcp-tool-body">
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, margin: '0 0 16px' }}>{t.desc}</p>

                <div className="label" style={{ marginBottom: 6 }}>ARGUMENTS</div>
                <div className="tbl-scroll" style={{ marginBottom: 14 }}>
                  <table className="doc-table" style={{ minWidth: 'auto' }}>
                    <thead>
                      <tr><th>NAME</th><th>TYPE</th><th>REQ</th><th>DESCRIPTION</th></tr>
                    </thead>
                    <tbody>
                      {t.args.map(a => (
                        <tr key={a.name}>
                          <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text)' }}>{a.name}</td>
                          <td><Tag>{a.type}</Tag></td>
                          <td>{a.required ? <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--error)' }}>required</span> : <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>optional</span>}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>EXAMPLE CALL</div>
                    <CodeBlock lang="json" code={t.example} />
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 6 }}>RETURNS</div>
                    <CodeBlock lang="json" code={t.returns} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Help & Glossary (/app/help)
// ============================================================
const GLOSSARY = [
  { term: 'BM25',                  letter: 'B', def: 'A classic keyword retrieval algorithm. Ranks documents by how often query terms appear, weighted by how rare those terms are across the corpus.', useful: 'Cheap to run, deterministic, strong on rare-keyword queries.', notUseful: 'Misses semantic matches (e.g., "auto" vs "car"). Use hybrid retrieval instead.', related: ['Hybrid retrieval', 'RRF', 'Dense retrieval'] },
  { term: 'Chunking',              letter: 'C', def: 'Splitting a document into smaller passages so they fit into an embedding model and into the LLM context window.', useful: 'Always — even one-page documents.', notUseful: 'Tiny documents already smaller than the chunk size are passed through unchanged.', related: ['Recursive chunking', 'Late chunking', 'Tokenizer'] },
  { term: 'Citation verification', letter: 'C', def: 'A post-generation step that re-reads each cited chunk and confirms the LLM\'s claim is supported.', useful: 'High-stakes domains. Catches ~30% of subtle hallucinations.', notUseful: 'Adds ~150 ms and $0.0001/query. Skip for chat-style low-stakes use.', related: ['Faithfulness', 'Verifier model'] },
  { term: 'Dense retrieval',       letter: 'D', def: 'Embedding-based retrieval. Documents and queries are mapped into the same vector space; relevance is cosine similarity.', useful: 'Captures semantic meaning, paraphrase, multilingual.', notUseful: 'Misses exact-string and rare-keyword matches; pair with BM25.', related: ['BM25', 'Embedding model', 'Hybrid retrieval'] },
  { term: 'Faithfulness',          letter: 'F', def: 'Fraction of an answer\'s claims that are supported by the retrieved context.', useful: 'Best single metric for "is the model hallucinating?"', notUseful: 'Doesn\'t measure whether the answer is correct overall — only that it cites its sources.', related: ['Citation verification', 'Recall@K'] },
  { term: 'Hybrid retrieval',      letter: 'H', def: 'Running BM25 and dense retrieval in parallel and fusing the two ranked lists with RRF.', useful: 'Default in Atlas. Beats either alone on every benchmark we ship.', notUseful: 'When you have a tiny corpus (BM25 alone is fine) or pure semantic search (entity disambiguation).', related: ['BM25', 'Dense retrieval', 'RRF'] },
  { term: 'MCP',                   letter: 'M', def: 'Model Context Protocol. A standard for letting LLM clients (Claude Desktop, Cursor) call out to external tools and data sources over HTTP/SSE.', useful: 'Connecting Atlas to a chat client without writing custom integration code.', notUseful: 'Server-to-server API access — use the REST API directly.', related: ['REST API', 'Claude Desktop'] },
  { term: 'MRR',                   letter: 'M', def: 'Mean Reciprocal Rank. The average of 1/(rank of the first relevant result) across all queries.', useful: 'Captures "did the right answer show up high in the list?" — sensitive to top-1 quality.', notUseful: 'Not sensitive to results below the first relevant one.', related: ['Recall@K', 'NDCG'] },
  { term: 'Paired bootstrap',      letter: 'P', def: 'Statistical test for two configs on the same questions. Resample question-pairs with replacement many times and look at the distribution of metric differences.', useful: 'Comparing config A vs B head-to-head with a real confidence interval.', notUseful: 'Comparing across different datasets — use unpaired bootstrap.', related: ['Bootstrap', 'Statistical significance'] },
  { term: 'Recall@K',              letter: 'R', def: 'Did at least one of the top-K retrieved chunks contain the gold answer?', useful: 'The headline retrieval metric for RAG. K=5 and K=10 are standard.', notUseful: 'Doesn\'t care about rank within the top-K, or about generation quality.', related: ['MRR', 'NDCG', 'Faithfulness'] },
  { term: 'RLS',                   letter: 'R', def: 'Row-level security. Postgres feature that enforces per-row access policies at the database layer.', useful: 'Multi-tenant isolation. No application code needs to remember to filter by tenant_id.', notUseful: 'Single-tenant deployments — adds query overhead with no benefit.', related: ['Multi-tenancy', 'Tenant ID'] },
  { term: 'RRF',                   letter: 'R', def: 'Reciprocal Rank Fusion. Combines multiple ranked lists by summing 1/(k + rank) for each document.', useful: 'Fusing BM25 and dense retrieval. Robust to wildly different score scales.', notUseful: 'When you only have one retriever — there\'s nothing to fuse.', related: ['BM25', 'Dense retrieval', 'Hybrid retrieval'] },
];

function HelpGlossary() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('BM25');

  const filtered = GLOSSARY.filter(g => g.term.toLowerCase().includes(search.toLowerCase()));
  const groups = filtered.reduce((acc, g) => { (acc[g.letter] ||= []).push(g); return acc; }, {});
  const current = GLOSSARY.find(g => g.term === active);

  return (
    <div className="page" data-screen-label="22 Help & Glossary">
      <div className="page-head">
        <div>
          <h1>Help &amp; glossary</h1>
          <div className="sub">Every term Atlas uses, defined in plain language. The same content powers the inline <code style={{ fontFamily: 'var(--ff-mono)', padding: '1px 6px', background: 'var(--bg-sunken)', borderRadius: 3 }}>?</code> popovers.</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 260px) 1fr', gap: 24 }}>
        <aside>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input className="input" placeholder="Search glossary…" style={{ paddingLeft: 34 }} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {Object.keys(groups).sort().map(letter => (
            <div key={letter} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--text-subtle)', padding: '6px 10px' }}>{letter}</div>
              {groups[letter].map(g => (
                <a key={g.term} onClick={() => setActive(g.term)}
                  style={{ display: 'block', padding: '6px 10px', borderRadius: 'var(--radius-sm)', fontSize: 13, color: active === g.term ? 'var(--text)' : 'var(--text-muted)', background: active === g.term ? 'var(--accent-bg)' : 'transparent', cursor: 'pointer', textDecoration: 'none' }}>
                  {g.term}
                </a>
              ))}
            </div>
          ))}
        </aside>

        <article style={{ maxWidth: 720 }}>
          {current && (
            <>
              <h2 style={{ fontFamily: 'var(--ff-ui)', fontSize: 32, fontWeight: 500, letterSpacing: '-0.015em', margin: '0 0 16px' }}>{current.term}</h2>
              <p style={{ fontSize: 17, lineHeight: 1.65, color: 'var(--text)', margin: '0 0 28px' }}>{current.def}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                <div style={{ padding: 16, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 8 }}>WHEN USEFUL</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>{current.useful}</div>
                </div>
                <div style={{ padding: 16, background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--warn)', marginBottom: 8 }}>WHEN NOT</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>{current.notUseful}</div>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div className="label" style={{ marginBottom: 8 }}>RELATED TERMS</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {current.related.map(r => <span key={r} className="tag" style={{ cursor: 'pointer' }} onClick={() => { const m = GLOSSARY.find(g => g.term === r); if (m) setActive(m.term); }}>{r}</span>)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" icon="github">View source on GitHub</Button>
                <Button variant="secondary" size="sm" icon="book-open">Architecture docs →</Button>
              </div>
            </>
          )}
          {!current && <div style={{ color: 'var(--text-muted)' }}>No matches.</div>}

          <div style={{ marginTop: 64, padding: 24, background: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>More resources</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>→ Watch the 90-second walkthrough video</a>
              <a style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>→ Read the launch blog post</a>
              <a style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>→ File an issue on GitHub</a>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

Object.assign(window, { ApiKeys, McpConnection, HelpGlossary });

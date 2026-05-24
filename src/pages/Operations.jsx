// Atlas — Evals dashboard (internal /app/evals) + Traces + Usage

function EvalsDashboard({ onOpenRun }) {
  const [tab, setTab] = useState('runs');
  const loaded = useFakeLoad(750);
  const empty = useEmptyMode();

  const runs = [
    { id: '2026-05-20', start: 'today · 03:14 UTC', dataset: 'combined-v3', cfgs: 5, status: 'success', r5: 0.815, faith: 0.94, dur: '47m 12s', cost: '$8.14' },
    { id: '2026-05-19', start: 'yesterday · 03:14', dataset: 'combined-v3', cfgs: 5, status: 'success', r5: 0.808, faith: 0.93, dur: '46m 51s', cost: '$8.02' },
    { id: '2026-05-18', start: '2d ago · 03:14',     dataset: 'combined-v3', cfgs: 5, status: 'success', r5: 0.812, faith: 0.93, dur: '48m 03s', cost: '$8.21' },
    { id: '2026-05-17', start: '3d ago · 03:14',     dataset: 'combined-v3', cfgs: 5, status: 'success', r5: 0.799, faith: 0.92, dur: '47m 41s', cost: '$8.18' },
    { id: '2026-05-17a',start: '3d ago · 11:02',     dataset: 'smoke-50',    cfgs: 5, status: 'success', r5: 0.812, faith: 0.93, dur: '01m 41s', cost: '$0.41' },
    { id: '2026-05-16', start: '4d ago · 03:14',     dataset: 'combined-v3', cfgs: 5, status: 'warn',    r5: 0.798, faith: 0.92, dur: '52m 14s', cost: '$8.91' },
    { id: '2026-05-15', start: '5d ago · 03:14',     dataset: 'combined-v3', cfgs: 5, status: 'success', r5: 0.804, faith: 0.93, dur: '47m 22s', cost: '$8.08' },
    { id: '2026-05-14', start: '6d ago · 03:14',     dataset: 'combined-v3', cfgs: 5, status: 'error',   r5: null,   faith: null, dur: '12m 03s', cost: '$1.81' },
  ];

  const datasets = [
    { name: 'combined-v3',         qs: 1000, updated: '2026-05-12', sample: "What was AMD's Q4 2023 revenue and how did it compare to Q4 2022?" },
    { name: 'hotpot-subset-600',   qs: 600,  updated: '2026-04-30', sample: "Were Scott Derrickson and Ed Wood of the same nationality?" },
    { name: 'finance-bench-400',   qs: 400,  updated: '2026-05-02', sample: "What is the gross profit margin trend disclosed in the latest 10-K?" },
    { name: 'smoke-50',            qs: 50,   updated: '2026-05-12', sample: "Sample of the full suite for fast iteration." },
    { name: 'custom-internal',     qs: 142,  updated: '2026-05-19', sample: "Domain-specific corpus uploaded by you." },
  ];

  const cfgs = [
    { name: 'baseline',        chunker: 'recursive-512', embed: 'bge-large', retriever: 'dense', rerank: 'none',                topK: 8,  qr: false, system: true },
    { name: '+bm25',           chunker: 'recursive-512', embed: 'bge-large', retriever: 'hybrid+rrf', rerank: 'none',           topK: 8,  qr: false, system: true },
    { name: '+rerank',         chunker: 'recursive-512', embed: 'bge-large', retriever: 'hybrid+rrf', rerank: 'bge-reranker-v2-m3', topK: 8, qr: false, system: true },
    { name: '+cohere',         chunker: 'recursive-512', embed: 'bge-large', retriever: 'hybrid+rrf', rerank: 'cohere-rerank-v3',   topK: 8, qr: false, system: true },
    { name: '+query-rewrite',  chunker: 'recursive-512', embed: 'bge-large', retriever: 'hybrid+rrf', rerank: 'bge-reranker-v2-m3', topK: 8, qr: true,  system: true },
    { name: 'expt-late-chunk', chunker: 'late-chunking', embed: 'bge-large', retriever: 'hybrid+rrf', rerank: 'bge-reranker-v2-m3', topK: 8, qr: false, system: false },
  ];

  const schedules = [
    { name: 'Nightly full suite',    cron: '0 3 * * *',     dataset: 'combined-v3', notify: 'slack:#atlas-evals',       lastRun: '12h ago · success' },
    { name: 'Hourly smoke',          cron: '0 * * * *',     dataset: 'smoke-50',    notify: '—',                          lastRun: '34m ago · success' },
    { name: 'Pre-release full',      cron: 'on-tag',        dataset: 'combined-v3', notify: 'email:eng-leads@acme.dev',   lastRun: '3d ago · success' },
  ];

  return (
    <div className="page" data-screen-label="11 Evals Dashboard">
      <div className="page-head">
        <div>
          <h1>Evals</h1>
          <div className="sub">1,000-question regression suite · paired bootstrap · CI-gated</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="upload">Import dataset</Button>
          <Button variant="primary" icon="play">New eval run</Button>
        </div>
      </div>

      {empty && (
        <EmptyState
          icon="bar-chart-3"
          title="No eval runs yet."
          body="Atlas ships a 1,000-question regression suite. Run the 50-question smoke set in about 90 seconds, or kick off the full suite. Every run is reproducible from its commit hash."
          primaryLabel="Run smoke eval (50 questions)"
          primaryIcon="play"
          secondaryLabel="Read about evaluation →"
        />
      )}

      {!empty && <>

      {/* Latest run summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPI label="LATEST RECALL@5" value="0.815" delta="+0.007 vs last run" ci="best: +query-rewrite" />
        <KPI label="LATEST FAITHFULNESS" value="0.94" delta="+0.01 vs last run" ci="verified: 938/1000" />
        <KPI label="P95 LATENCY" value="1,340" unit=" ms" delta="-31 ms vs last run" deltaDirection="down" ci="meeting <1.5s SLO" />
        <KPI label="SPEND / RUN" value="$8.14" delta="+$0.12 vs last run" ci="of $50/mo eval budget" />
      </div>

      <Tabs
        tabs={[
          { id: 'runs',      label: 'Runs',      count: 142 },
          { id: 'compare',   label: 'Compare' },
          { id: 'datasets',  label: 'Datasets',  count: 5 },
          { id: 'configs',   label: 'Configs',   count: 6 },
          { id: 'schedules', label: 'Schedules', count: 3 },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'runs' && (
        <div className="tbl-scroll">
        <table className="doc-table">
          <thead>
            <tr>
              <th>RUN ID</th>
              <th>STARTED</th>
              <th>DATASET</th>
              <th style={{ textAlign: 'right' }}>CFGS</th>
              <th>STATUS</th>
              <th style={{ textAlign: 'right' }}>RECALL@5</th>
              <th style={{ textAlign: 'right' }}>FAITHFUL</th>
              <th style={{ textAlign: 'right' }}>DUR</th>
              <th style={{ textAlign: 'right' }}>COST</th>
              <th style={{ width: 28 }}></th>
            </tr>
          </thead>
          <tbody>
            {!loaded && [0,1,2,3,4,5].map(i => (
              <tr key={'s' + i}>
                <td><SkelLine w={100} h={11} /></td>
                <td><SkelLine w={120} h={10} /></td>
                <td><SkelLine w={80} h={14} /></td>
                <td className="num"><SkelLine w={20} h={10} style={{ marginLeft: 'auto' }} /></td>
                <td><SkelLine w={60} h={16} /></td>
                <td className="num"><SkelLine w={40} h={10} style={{ marginLeft: 'auto' }} /></td>
                <td className="num"><SkelLine w={32} h={10} style={{ marginLeft: 'auto' }} /></td>
                <td className="num"><SkelLine w={48} h={10} style={{ marginLeft: 'auto' }} /></td>
                <td className="num"><SkelLine w={36} h={10} style={{ marginLeft: 'auto' }} /></td>
                <td></td>
              </tr>
            ))}
            {loaded && runs.map(r => (
              <tr key={r.id} onClick={() => onOpenRun(r.id)} style={{ cursor: 'pointer' }}>
                <td style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text)', fontWeight: 500 }}>{r.id}</td>
                <td style={{ color: 'var(--text-muted)' }}>{r.start}</td>
                <td><Tag>{r.dataset}</Tag></td>
                <td className="num">{r.cfgs}</td>
                <td><Pill variant={r.status}>{r.status === 'success' ? 'Success' : r.status === 'warn' ? 'Warn' : 'Failed'}</Pill></td>
                <td className="num">{r.r5 ? r.r5.toFixed(3) : '—'}</td>
                <td className="num">{r.faith ? r.faith.toFixed(2) : '—'}</td>
                <td className="num">{r.dur}</td>
                <td className="num">{r.cost}</td>
                <td><button className="icon-btn" style={{ width: 22, height: 22 }}><Icon name="more-horizontal" size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {tab === 'compare' && <EvalCompare runs={runs} />}

      {tab === 'datasets' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginBottom: 16 }}>
            {datasets.map(d => (
              <Card key={d.name} padding={20}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 14, fontWeight: 500 }}>{d.name}</span>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)' }}>n={d.qs.toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 12 }}>updated {d.updated}</div>
                <div style={{ padding: 12, background: 'var(--bg-sunken)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{d.sample}"
                </div>
              </Card>
            ))}
          </div>
          <Card title="Custom dataset schema" actions={<Button variant="secondary" size="sm" icon="upload">Upload YAML</Button>}>
            <CodeBlock lang="yaml" code={`name: my-custom-eval
description: 142 questions from our 2025 support backlog
questions:
  - q: "What's the difference between the standard and premium plans?"
    gold_answer: "Standard: 100GB / month. Premium: 1TB / month + priority support."
    gold_chunks: ["plans-2025.md#standard", "plans-2025.md#premium"]
    difficulty: easy
    tags: [pricing, support]`} />
          </Card>
        </>
      )}

      {tab === 'configs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {cfgs.map(c => (
            <Card key={c.name} padding={20}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                {c.system ? <Pill>system</Pill> : <Pill variant="accent">custom</Pill>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 4, fontSize: 12 }}>
                {[
                  ['Chunker',   c.chunker],
                  ['Embed',     c.embed],
                  ['Retriever', c.retriever],
                  ['Rerank',    c.rerank],
                  ['Top-K',     String(c.topK)],
                  ['Q-rewrite', c.qr ? 'on' : 'off'],
                ].map(([k, v]) => (
                  <React.Fragment key={k}>
                    <span style={{ color: 'var(--text-subtle)' }}>{k}</span>
                    <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text)' }}>{v}</span>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
                <Button variant="ghost" size="sm" icon="copy">Clone</Button>
                <Button variant="ghost" size="sm" icon="edit-2">Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'schedules' && (
        <>
          <div className="tbl-scroll">
        <table className="doc-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th>NAME</th>
                <th>SCHEDULE</th>
                <th>DATASET</th>
                <th>NOTIFY</th>
                <th>LAST RUN</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.name}>
                  <td style={{ color: 'var(--text)', fontWeight: 500 }}>{s.name}</td>
                  <td><Tag>{s.cron}</Tag></td>
                  <td><Tag>{s.dataset}</Tag></td>
                  <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{s.notify}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.lastRun}</td>
                  <td><button className="icon-btn" style={{ width: 22, height: 22 }}><Icon name="more-horizontal" size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <Button variant="secondary" icon="plus">New schedule</Button>
        </>
      )}
      </>}
    </div>
  );
}

// ============================================================
// Trace Explorer (/app/traces)
// ============================================================
function Traces({ onOpenTrace }) {
  const loaded = useFakeLoad(800);
  const empty = useEmptyMode();
  const traces = empty ? [] : [
    { id: '8f3a-1c92-7e44-1029', q: 'What was AMD\'s Q4 2023 revenue and how did it compare to Q4 2022?', time: '12s ago', lat: '1.12 s', tok: '630',  cost: '$0.0007', faith: 1.00, status: 'success' },
    { id: 'b2d1-4f88-902a-3e47', q: 'Summarize risk factors in the 2023 10-K',                              time: '1m ago',  lat: '1.34 s', tok: '892',  cost: '$0.0009', faith: 0.93, status: 'success' },
    { id: 'a3f2-bc91-7e44-1029', q: 'Did AMD repurchase shares in Q4?',                                    time: '4m ago',  lat: '0.94 s', tok: '412',  cost: '$0.0005', faith: 0.50, status: 'warn' },
    { id: '7c44-3812-fe89-22a1', q: 'Compare AMD vs NVIDIA Q4 Data Center revenue',                        time: '12m ago', lat: '2.18 s', tok: '1,204',cost: '$0.0014', faith: 0.66, status: 'warn' },
    { id: 'c812-7a3f-9028-44ef', q: 'What is the long-term gross margin target range?',                    time: '17m ago', lat: '5.12 s', tok: '218',  cost: '$0.0001', faith: 0.00, status: 'error' },
    { id: '4e18-aa32-1cc9-3320', q: 'Cash and equivalents at end of FY2023?',                              time: '22m ago', lat: '0.87 s', tok: '341',  cost: '$0.0004', faith: 1.00, status: 'success' },
    { id: '9d22-8f10-3304-b1c4', q: 'Average employee tenure stated in the 10-K?',                         time: '34m ago', lat: '1.04 s', tok: '512',  cost: '$0.0006', faith: 0.75, status: 'success' },
    { id: '2208-0011-4ff2-9821', q: 'Tax rate change vs FY2022?',                                          time: '41m ago', lat: '1.21 s', tok: '604',  cost: '$0.0007', faith: 0.50, status: 'warn' },
    { id: '5510-aa9d-2230-7c81', q: 'How many cumulative MI300X shipments through Q1 2024?',               time: '1h ago',  lat: '1.88 s', tok: '824',  cost: '$0.0010', faith: 0.00, status: 'error' },
    { id: '6643-90c1-d922-4af7', q: 'Effective R&D spend as % of revenue?',                                time: '1h ago',  lat: '1.02 s', tok: '498',  cost: '$0.0006', faith: 1.00, status: 'success' },
  ];

  return (
    <div className="page" data-screen-label="13 Trace Explorer">
      <div className="page-head">
        <div>
          <h1>Traces</h1>
          <div className="sub">{empty ? 'No traces yet · ask a question to start collecting them' : 'Every query, fully reproducible. Paste a trace ID into a support thread to investigate any past answer.'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="download" disabled={empty}>Export CSV</Button>
          <Button variant="secondary" icon="filter" disabled={empty}>Save filter</Button>
        </div>
      </div>

      {empty && (
        <EmptyState
          icon="activity"
          title="No traces yet."
          body="Every query through Atlas generates a full trace — per-node latency, retrieved chunks, generated answer, verifier results. Ask your first question to start collecting them."
          primaryLabel="Go to chat"
          primaryIcon="message-square"
          onPrimary={() => { location.hash = '#/chat'; }}
        />
      )}

      {!empty && <>
      <Card padding={14} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input className="input" placeholder="Search by trace ID or query…" style={{ paddingLeft: 34 }} />
          </div>
          <select className="input" style={{ width: 'auto' }} defaultValue="24h">
            <option value="1h">Last hour</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
          </select>
          <Tag>model: any</Tag>
          <Tag>latency: any</Tag>
          <Tag>faithfulness: any</Tag>
          <Tag>status: any</Tag>
        </div>
      </Card>

      <div className="tbl-scroll">
        <table className="doc-table">
        <thead>
          <tr>
            <th>TRACE ID</th>
            <th>QUERY</th>
            <th>TIME</th>
            <th style={{ textAlign: 'right' }}>LAT</th>
            <th style={{ textAlign: 'right' }}>TOK</th>
            <th style={{ textAlign: 'right' }}>$</th>
            <th style={{ textAlign: 'right' }}>FAITH</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {!loaded && [0,1,2,3,4,5,6,7].map(i => (
            <tr key={'s' + i}>
              <td><SkelLine w={120} h={10} /></td>
              <td><SkelLine w={'80%'} h={11} /></td>
              <td><SkelLine w={56} h={10} /></td>
              <td className="num"><SkelLine w={48} h={10} style={{ marginLeft: 'auto' }} /></td>
              <td className="num"><SkelLine w={32} h={10} style={{ marginLeft: 'auto' }} /></td>
              <td className="num"><SkelLine w={48} h={10} style={{ marginLeft: 'auto' }} /></td>
              <td className="num"><SkelLine w={32} h={10} style={{ marginLeft: 'auto' }} /></td>
              <td><SkelLine w={60} h={16} /></td>
            </tr>
          ))}
          {loaded && traces.map(t => (
            <tr key={t.id} onClick={() => onOpenTrace(t.id)} style={{ cursor: 'pointer' }}>
              <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text)' }}>{t.id}</td>
              <td style={{ color: 'var(--text)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.q}</td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.time}</td>
              <td className="num" style={{ color: t.lat > '3' ? 'var(--warn)' : 'var(--text-muted)' }}>{t.lat}</td>
              <td className="num">{t.tok}</td>
              <td className="num">{t.cost}</td>
              <td className="num" style={{ color: t.faith < 0.5 ? 'var(--error)' : t.faith < 0.9 ? 'var(--warn)' : 'var(--success)' }}>{t.faith.toFixed(2)}</td>
              <td><Pill variant={t.status}>{t.status === 'success' ? 'OK' : t.status === 'warn' ? 'Warn' : 'Failed'}</Pill></td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>

      <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>
        Showing 10 of 14,201 traces · click any row to open the trace drawer
      </div>
      </>}
    </div>
  );
}

// ============================================================
// Usage & Cost (/app/usage)
// ============================================================
function Usage() {
  const [range, setRange] = useState('7d');
  const [hardStop, setHardStop] = useState('reject');

  // Stacked area: each row is a day
  const haiku = [0.18, 0.22, 0.31, 0.41, 0.28, 0.36, 0.42];
  const opus  = [0.08, 0.04, 0.11, 0.20, 0.16, 0.18, 0.24];
  const emb   = [0.04, 0.01, 0.06, 0.08, 0.02, 0.03, 0.04];

  return (
    <div className="page" data-screen-label="14 Usage & Cost">
      <div className="page-head">
        <div>
          <h1>Usage &amp; cost</h1>
          <div className="sub">Where the money goes · cached responses count as one cache hit</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="input" style={{ width: 'auto' }} value={range} onChange={e => setRange(e.target.value)}>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7d</option>
            <option value="30d">Last 30d</option>
            <option value="custom">Custom…</option>
          </select>
          <Button variant="secondary" icon="download">Download CSV</Button>
        </div>
      </div>

      <div style={{ padding: '10px 14px', border: '1px solid var(--info)', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        <Icon name="info" size={14} style={{ color: 'var(--info)' }} />
        <span style={{ color: 'var(--text)' }}>Tip: Caching reduces cost by ~40% on typical workloads. Make sure query caching is enabled in <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>Settings → Retrieval</a>.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPI label="TOTAL SPEND" value="$18.42" delta="+$2.18 vs prev 7d" ci="of $50.00 monthly budget" />
        <KPI label="TOTAL QUERIES" value="2,847" delta="+12% vs prev 7d" />
        <KPI label="TOTAL TOKENS" value="4.2M" delta="+8% vs prev 7d" ci="3.1M in / 1.1M out" />
        <KPI label="$/QUERY" value="$0.0065" delta="-$0.0003 vs prev 7d" deltaDirection="down" ci="caching: 41% hit rate" />
      </div>

      <Card padding={20} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Spend over time</h3>
          <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--ff-mono)' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent)', marginRight: 6, verticalAlign: 'middle' }}></span>Claude Haiku</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--info)', marginRight: 6, verticalAlign: 'middle' }}></span>Claude Opus</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--success)', marginRight: 6, verticalAlign: 'middle' }}></span>Embeddings</span>
          </div>
        </div>
        <StackedArea series={[haiku, opus, emb]} labels={['Haiku', 'Opus', 'Embeddings']} h={220} />
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card title="Spend by model" padding={20}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              {[
                ['claude-haiku-4-5',        '$11.84', '64.3%'],
                ['claude-opus-4-7',         '$5.21',  '28.3%'],
                ['bge-large-en-v1.5',       '$0.92',  '5.0%'],
                ['text-embedding-3-large',  '$0.45',  '2.4%'],
              ].map(([m, c, p]) => (
                <tr key={m} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{m}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', textAlign: 'right' }}>{c}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', textAlign: 'right', color: 'var(--text-muted)', width: 60 }}>{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Spend by user" padding={20}>
          <table style={{ width: '100%', fontSize: 13 }}>
            <tbody>
              {[
                ['asad@acme.dev',  '$12.04', '65.4%'],
                ['jen@acme.dev',   '$4.18',  '22.7%'],
                ['mcp:cursor',     '$1.42',  '7.7%'],
                ['cron:scheduler', '$0.78',  '4.2%'],
              ].map(([u, c, p]) => (
                <tr key={u} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0', fontSize: 13 }}>{u}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', textAlign: 'right' }}>{c}</td>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--ff-mono)', textAlign: 'right', color: 'var(--text-muted)', width: 60 }}>{p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Budget controls" padding={20}>
        <div className="form-row">
          <div className="lbl-block">
            <div className="lbl">Daily budget <HelpQ /></div>
            <div className="help">When exceeded, behavior depends on the hard-stop setting below.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)' }}>$</span>
            <input className="input" defaultValue="5.00" style={{ width: 100 }} />
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block">
            <div className="lbl">Monthly budget</div>
            <div className="help">Hard cap for the calendar month.</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)' }}>$</span>
            <input className="input" defaultValue="50.00" style={{ width: 100 }} />
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block">
            <div className="lbl">Alert threshold</div>
            <div className="help">Sends an email + Slack webhook when the daily budget reaches this fraction.</div>
          </div>
          <div className="range-row" style={{ width: 280 }}>
            <input type="range" min="50" max="100" defaultValue="80" />
            <span className="v">80%</span>
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block">
            <div className="lbl">Hard-stop on exceeded budget <HelpQ /></div>
            <div className="help">What to do when the daily budget is hit.</div>
          </div>
          <div className="radio-group">
            {[
              ['reject',  'Reject queries (HTTP 429)', 'No further LLM calls. New queries return an error.'],
              ['cheaper', 'Switch to cheaper model',   'Downgrade Opus → Haiku transparently.'],
              ['cached',  'Switch to cached-only',     'Only serve cache hits; cache misses return an error.'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (hardStop === id ? 'active' : '')} onClick={() => setHardStop(id)}>
                <div className="r"></div>
                <div>
                  <div className="rt">{t}</div>
                  <div className="rd">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { EvalsDashboard, Traces, Usage });

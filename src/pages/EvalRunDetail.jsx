// Atlas — Eval report (internal /app/evals/runs/[id])

function EvalReport() {
  const [tab, setTab] = useState('overview');
  const [shareOpen, setShareOpen] = useState(false);

  const configs = [
    { name: 'baseline',        r5: 0.624, r10: 0.712, mrr: 0.541, faith: 0.81, p95: '612 ms',   cost: '$0.0004', best: false },
    { name: '+bm25',           r5: 0.701, r10: 0.798, mrr: 0.612, faith: 0.84, p95: '678 ms',   cost: '$0.0004', best: false },
    { name: '+rerank',         r5: 0.808, r10: 0.891, mrr: 0.722, faith: 0.93, p95: '1,090 ms', cost: '$0.0009', best: true  },
    { name: '+cohere',         r5: 0.812, r10: 0.889, mrr: 0.728, faith: 0.93, p95: '1,210 ms', cost: '$0.0017', best: false },
    { name: '+query-rewrite',  r5: 0.815, r10: 0.893, mrr: 0.731, faith: 0.94, p95: '1,340 ms', cost: '$0.0012', best: false },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--ff-mono)', color: 'var(--text-subtle)', marginBottom: 6 }}>
            run · <span style={{ color: 'var(--text-muted)' }}>2026-05-19T03:14:22Z</span> · commit <a href="#" style={{ color: 'var(--accent)' }}>a3f2bc9</a> · dataset combined-v3 (n=1000)
          </div>
          <h1>Hybrid + BGE Rerank <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs dense baseline</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="share-2" onClick={() => setShareOpen(true)}>Share</Button>
          <Button variant="secondary" icon="printer" onClick={() => window.print()}>Print</Button>
          <Button variant="secondary" icon="download">Export</Button>
          <Button variant="primary" icon="play">Re-run</Button>
        </div>
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'configs', label: 'Configs', count: 5 },
          { id: 'per-q', label: 'Per-question', count: 1000 },
          { id: 'failures', label: 'Failures', count: 38 },
          { id: 'raw', label: 'Raw' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{
        padding: '24px 28px', background: 'var(--bg-elev)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', marginBottom: 20, position: 'relative',
        borderLeft: '3px solid var(--accent)'
      }}>
        <div className="label" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>HEADLINE RESULT</div>
        <div style={{ fontSize: 22, lineHeight: 1.4, color: 'var(--text)', maxWidth: 880, letterSpacing: '-0.01em' }}>
          <strong style={{ fontWeight: 500 }}>+rerank</strong> improved <strong style={{ fontWeight: 500 }}>recall@5 by +18.4 points absolute</strong> over the dense baseline
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 16, color: 'var(--text-muted)', marginLeft: 8 }}>
            (95% CI [15.1, 21.7], p&lt;0.001, n=1000, 10K bootstrap resamples).
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPI label="+RERANK VS BASELINE" value="+0.184" delta="recall@5" ci="95% CI [0.151, 0.217] · p<0.001" />
        <KPI label="+QUERY-REWRITE Δ" value="+0.007" delta="recall@5 over +rerank" ci="95% CI [-0.012, 0.026] · ns" />
        <KPI label="COHERE VS BGE" value="+0.004" delta="recall@5 · 1.9× cost" ci="95% CI [-0.014, 0.022] · ns" />
      </div>

      <Card title="Per-config recall@5" actions={<span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>forest plot · 95% CI</span>}>
        <div className="forest" style={{ padding: 0, border: 'none' }}>
          {configs.map(c => {
            // map r5 range 0.60–0.85 to 0–100%
            const min = 0.60, max = 0.85;
            const pct = v => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
            const lo = c.r5 - 0.025, hi = c.r5 + 0.025;
            return (
              <div key={c.name} className="forest-row">
                <span className="fname">{c.name}</span>
                <div className="fci">
                  <div className="axis"></div>
                  <div className="bar" style={{ left: pct(lo) + '%', width: (pct(hi) - pct(lo)) + '%' }}></div>
                  <div className={'pt ' + (c.best ? 'best' : '')} style={{ left: pct(c.r5) + '%' }}></div>
                </div>
                <span className="fnum">{c.r5.toFixed(3)}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <h2 style={{ marginTop: 28, marginBottom: 12, fontSize: 18, fontWeight: 500 }}>Full results</h2>
      <div className="tbl-scroll">
        <table className="eval">
        <thead>
          <tr>
            <th>CONFIG</th>
            <th style={{ textAlign: 'right' }}>RECALL@5 <HelpQ /></th>
            <th style={{ textAlign: 'right' }}>RECALL@10</th>
            <th style={{ textAlign: 'right' }}>MRR <HelpQ /></th>
            <th style={{ textAlign: 'right' }}>FAITHFUL <HelpQ /></th>
            <th style={{ textAlign: 'right' }}>P95 LAT</th>
            <th style={{ textAlign: 'right' }}>$/QUERY</th>
          </tr>
        </thead>
        <tbody>
          {configs.map(c => (
            <tr key={c.name}>
              <td>{c.name}</td>
              <td className={'num ' + (c.best ? 'best' : '')}>{c.r5.toFixed(3)}</td>
              <td className={'num ' + (c.best ? 'best' : '')}>{c.r10.toFixed(3)}</td>
              <td className={'num ' + (c.best ? 'best' : '')}>{c.mrr.toFixed(3)}</td>
              <td className={'num ' + (c.best ? 'best' : '')}>{c.faith.toFixed(2)}</td>
              <td className="num">{c.p95}</td>
              <td className="num">{c.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>

      <h2 style={{ marginTop: 28, marginBottom: 12, fontSize: 18, fontWeight: 500 }}>Reproduce</h2>
      <CodeBlock
        lang="bash"
        code={`git clone github.com/atlas/atlas
cd atlas && atlas-eval run \\
  --dataset combined-v3 \\
  --run-id 2026-05-19 \\
  --configs baseline,+bm25,+rerank,+cohere,+query-rewrite`}
      />

      <ShareEvalModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

function ShareEvalModal({ open, onClose }) {
  const [access, setAccess] = useState('tenant');
  const [allowComments, setAllowComments] = useState(false);
  const [expiresAt, setExpiresAt] = useState('never');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  // Synthetic token — different per access level so users can see how it changes
  const token = useMemo(() => {
    if (access === 'public') return null; // no token
    const prefix = access === 'link' ? 'lk_' : 'tk_';
    return prefix + 'a3f2bc91' + (expiresAt === 'never' ? '_p' : '_e' + expiresAt);
  }, [access, expiresAt]);

  const url = access === 'public'
    ? 'https://atlas.dev/eval/runs/2026-05-19'
    : `https://atlas.dev/eval/runs/2026-05-19?token=${token}`;

  function copy() {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <h2>Share this eval report</h2>
        <div className="body">
          <div className="form-row" style={{ gridTemplateColumns: '1fr', gap: 8, marginBottom: 16 }}>
            <div className="lbl-block"><div className="lbl">Who can see it</div></div>
            <div className="radio-group">
              {[
                ['tenant', 'Anyone in acme-prod', 'Members of this workspace, signed in.'],
                ['link',   'Anyone with the link', 'A signed token in the URL grants read-only access. Revocable.'],
                ['public', 'Public · indexable',   'Listed at atlas.dev/eval. No login required.'],
              ].map(([id, t, d]) => (
                <div key={id} className={'radio-opt ' + (access === id ? 'active' : '')} onClick={() => setAccess(id)}>
                  <div className="r"></div>
                  <div>
                    <div className="rt">{t}</div>
                    <div className="rd">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {access === 'link' && (
            <div className="form-row" style={{ gridTemplateColumns: '120px 1fr', gap: 16, marginBottom: 16 }}>
              <div className="lbl-block"><div className="lbl">Expires</div></div>
              <select className="input" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} style={{ maxWidth: 240 }}>
                <option value="1d">In 1 day</option>
                <option value="7d">In 7 days</option>
                <option value="30d">In 30 days</option>
                <option value="never">Never (manual revoke)</option>
              </select>
            </div>
          )}

          <div className="form-row" style={{ gridTemplateColumns: '120px 1fr', gap: 16, marginBottom: 18 }}>
            <div className="lbl-block"><div className="lbl">Comments</div></div>
            <div className="toggle-row">
              <ToggleSwitch on={allowComments} onChange={setAllowComments} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Allow signed-in viewers to leave comments</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Icon name="link" size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ flex: 1, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
            <Button variant="ghost" size="sm" icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? 'copied' : 'copy'}</Button>
          </div>
          {access === 'link' && (
            <div style={{ fontSize: 12, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="key" size={11} style={{ color: 'var(--text-subtle)' }} />
              <span>Token: <span style={{ fontFamily: 'var(--ff-mono)' }}>{token}</span> · <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>revoke</a></span>
            </div>
          )}
          {access === 'public' && (
            <div style={{ fontSize: 12, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert-triangle" size={11} style={{ color: 'var(--warn)' }} />
              <span>Public reports appear on atlas.dev/eval and are crawled by search engines.</span>
            </div>
          )}
        </div>
        <div className="actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon="check" onClick={onClose}>Save sharing settings</Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { EvalReport });

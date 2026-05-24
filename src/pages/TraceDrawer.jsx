// Atlas — Trace drawer

function TraceDrawer({ onClose, highlightCite, citation }) {
  const [tab, setTab] = useState(highlightCite ? 'retrieved' : 'overview');
  const [activeNode, setActiveNode] = useState(null);
  const chunkRefs = useRef({});
  const loaded = useFakeLoad(500);

  useEffect(() => {
    if (!highlightCite) return;
    setTab('retrieved');
    // Wait for the tab to render, then scroll + flash
    const t = setTimeout(() => {
      const el = chunkRefs.current[highlightCite];
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.remove('flash');
        // re-trigger animation
        void el.offsetWidth;
        el.classList.add('flash');
      }
    }, 120);
    return () => clearTimeout(t);
  }, [highlightCite]);

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <aside className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Trace</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>8f3a-1c92-7e44-1029</div>
          </div>
          <Pill variant="success">Ready</Pill>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'retrieved', label: 'Retrieved', count: 8 },
            { id: 'generated', label: 'Generated' },
            { id: 'cost', label: 'Tokens & cost' },
          ]}
          active={tab}
          onChange={setTab}
        />

        <div className="drawer-body" style={{ paddingTop: 0 }}>
          {tab === 'overview' && (
            <>
              <div className="label" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>EXECUTION TIMELINE</div>
              <TraceScrubber
                nodes={[
                  { name: 'rewrite',           startMs: 0,   durMs: 126, color: 'var(--info)' },
                  { name: 'retrieve_parallel', startMs: 126, durMs: 194, color: 'var(--accent)' },
                  { name: 'rerank',            startMs: 320, durMs: 301, color: 'var(--accent)' },
                  { name: 'compress',          startMs: 621, durMs: 68,  color: 'var(--warn)' },
                  { name: 'generate',          startMs: 689, durMs: 348, color: 'var(--success)' },
                  { name: 'verify',            startMs: 1037,durMs: 81,  color: 'var(--info)' },
                ]}
                totalMs={1118}
                activeNode={activeNode}
                onSelect={(n) => setActiveNode(activeNode === n ? null : n)}
              />

              <div className="label" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '16px 0 8px' }}>LANGGRAPH NODES</div>
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 12px' }}>
                {[
                  { name: 'rewrite', ms: 126, pct: 11 },
                  { name: 'retrieve_parallel', ms: 194, pct: 18 },
                  { name: 'rerank', ms: 301, pct: 28 },
                  { name: 'compress', ms: 68, pct: 6 },
                  { name: 'generate', ms: 348, pct: 32 },
                  { name: 'verify', ms: 81, pct: 7 },
                ].map(r => (
                  <button
                    key={r.name}
                    type="button"
                    className={'trace-row trace-row-btn ' + (activeNode === r.name ? 'active' : '')}
                    onClick={() => setActiveNode(activeNode === r.name ? null : r.name)}
                  >
                    <span className="tname">{r.name}</span>
                    <div className="tbar"><div className="tfill" style={{ width: r.pct + '%' }}></div></div>
                    <span className="tms">{r.ms} ms</span>
                  </button>
                ))}
              </div>
              {activeNode && (
                <div style={{ marginTop: 10, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--accent-bg)', fontSize: 12, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="filter" size={12} style={{ color: 'var(--accent)' }} />
                  <span>Filtering trace to <strong style={{ fontFamily: 'var(--ff-mono)' }}>{activeNode}</strong>.</span>
                  <a onClick={() => setActiveNode(null)} style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}>Clear</a>
                </div>
              )}
              <div style={{ marginTop: 14, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                <span>Total: 1.12 s</span><span>·</span>
                <span>$0.0007</span><span>·</span>
                <span>verified ✓</span>
              </div>
            </>
          )}

          {tab === 'retrieved' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Top-K fused from BM25 + dense (RRF), reranked by <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text)' }}>bge-reranker-v2-m3</span>. 8 of 30 chunks made it into context.
              </div>
              {!loaded && [0,1,2].map(i => (
                <div key={'s' + i} style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--accent-bg)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <SkelLine w={24} h={14} />
                    <SkelLine w={40} h={10} />
                    <SkelLine w={60} h={10} />
                  </div>
                  <SkelLine w={'100%'} h={10} style={{ marginBottom: 5 }} />
                  <SkelLine w={'90%'} h={10} style={{ marginBottom: 5 }} />
                  <SkelLine w={'60%'} h={10} style={{ marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <SkelLine w={56} h={14} />
                    <SkelLine w={56} h={14} />
                  </div>
                </div>
              ))}
              {loaded && [
                { rank: 1, score: 0.982, doc: 'AMD-Q4-2023-10K.pdf', page: 34, text: '…fourth quarter 2023 revenue was $6.2 billion, an increase of 10% year-over-year primarily driven by higher Data Center segment revenue…', source: ['BM25 #2', 'dense #1'], cite: 1 },
                { rank: 2, score: 0.964, doc: 'AMD-Q4-2023-10K.pdf', page: 35, text: '…compared to $5.6 billion in the fourth quarter of 2022. Data Center segment revenue was $2.3 billion, more than doubling year-over-year…', source: ['BM25 #1', 'dense #3'], cite: 2 },
                { rank: 3, score: 0.951, doc: 'AMD-Q4-2023-10K.pdf', page: 36, text: '…Data Center segment revenue of $2.3 billion was up 38% sequentially. Gaming segment revenue was $1.4 billion, down 17% year-over-year…', source: ['dense #2'], cite: 3 },
              ].map(c => (
                <div key={c.rank} ref={el => { chunkRefs.current[c.cite] = el; }} className="trace-chunk" style={{ padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--accent-bg)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    <Cite n={c.cite} />
                    <span>rank {c.rank}</span><span>·</span>
                    <span>score {c.score}</span><span style={{ marginLeft: 'auto' }}>{c.doc} · p.{c.page}</span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)', marginBottom: 8 }}>{c.text}</div>
                  <div style={{ display: 'flex', gap: 6 }}>{c.source.map(s => <Tag key={s}>{s}</Tag>)}</div>
                </div>
              ))}
            </>
          )}

          {tab === 'generated' && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Citation verifier passed <strong style={{ color: 'var(--success)', fontFamily: 'var(--ff-mono)' }}>2 / 3</strong> claims. <a style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>What does this mean?</a></div>
              <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text)', padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elev)', marginBottom: 20 }}>
                AMD reported Q4 2023 revenue of $6.2 billion <Cite n={1} />, up 10% year-over-year from $5.6 billion in Q4 2022 <Cite n={2} />. The growth was driven primarily by Data Center segment revenue, which more than <span style={{ background: 'var(--error-bg)', borderBottom: '2px solid var(--error)', padding: '0 2px', cursor: 'help' }} title="Verifier failed — see below">tripled to $2.3 billion <Cite n={3} /></span>, offsetting declines in the Gaming and Embedded segments.
              </div>

              <div className="label" style={{ marginBottom: 8 }}>VERIFIER RESULTS · PER CLAIM</div>
              {[
                { n: 1, claim: 'AMD Q4 2023 revenue of $6.2 billion', evidence: 'fourth quarter 2023 revenue was $6.2 billion', verdict: 'pass' },
                { n: 2, claim: 'up 10% year-over-year from $5.6 billion in Q4 2022', evidence: 'compared to $5.6 billion in the fourth quarter of 2022', verdict: 'pass' },
                { n: 3, claim: 'Data Center segment revenue tripled to $2.3 billion', evidence: 'Data Center segment revenue was $2.3 billion, more than doubling year-over-year', verdict: 'fail', reason: 'The model said "tripled" but the source says "more than doubling" (i.e. ~2.2×, not 3×).' },
              ].map(c => (
                <div key={c.n} style={{ border: '1px solid ' + (c.verdict === 'pass' ? 'var(--border)' : 'var(--error)'), borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 10, background: c.verdict === 'pass' ? 'var(--bg-elev)' : 'var(--error-bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <Cite n={c.n} />
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>claim #{c.n}</span>
                    <span style={{ marginLeft: 'auto' }}>
                      {c.verdict === 'pass'
                        ? <Pill variant="success">verified</Pill>
                        : <Pill variant="error">unsupported</Pill>}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: c.reason ? 10 : 0 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>MODEL CLAIM</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--ff-mono)', lineHeight: 1.5 }}>{c.claim}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>SOURCE EVIDENCE</div>
                      <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--ff-mono)', lineHeight: 1.5 }}>"{c.evidence}"</div>
                    </div>
                  </div>
                  {c.reason && (
                    <div style={{ fontSize: 12, color: 'var(--error)', borderTop: '1px solid color-mix(in srgb, var(--error) 30%, transparent)', paddingTop: 10, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <Icon name="alert-triangle" size={12} style={{ color: 'var(--error)', marginTop: 2, flexShrink: 0 }} />
                      <span>{c.reason}</span>
                    </div>
                  )}
                </div>
              ))}

              <div className="divider"></div>
              <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>model: claude-haiku-4-5 · verifier: claude-haiku-4-5 · temperature: 0 · seed: 42</div>
            </>
          )}

          {tab === 'cost' && (
            <>
              <div className="label" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>BREAKDOWN BY NODE</div>
              <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                {[
                  { node: 'rewrite', tok: '24 in / 18 out', cost: 0.0001 },
                  { node: 'retrieve', tok: '— embedding', cost: 0.00004 },
                  { node: 'rerank', tok: '30 pairs', cost: 0.0001 },
                  { node: 'generate', tok: '412 in / 218 out', cost: 0.00045 },
                  { node: 'verify', tok: '180 in / 12 out', cost: 0.00012 },
                ].map((r, i, a) => (
                  <div key={r.node} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 80px', padding: '10px 14px', borderBottom: i < a.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 12, gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text)' }}>{r.node}</span>
                    <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)' }}>{r.tok}</span>
                    <span style={{ fontFamily: 'var(--ff-mono)', textAlign: 'right', color: 'var(--text)' }}>${r.cost.toFixed(5)}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>Total</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>$0.00070</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

// Trace scrubber: horizontal segments, hover or scrub to inspect a moment in the trace.
function TraceScrubber({ nodes, totalMs, activeNode, onSelect }) {
  const ref = useRef(null);
  const [scrubMs, setScrubMs] = useState(null); // current scrub position in ms
  const [scrubX, setScrubX] = useState(null);

  function handleMove(e) {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, e.clientX - r.left));
    const ms = Math.round((x / r.width) * totalMs);
    setScrubMs(ms);
    setScrubX(x);
  }

  function handleLeave() {
    setScrubMs(null);
    setScrubX(null);
  }

  // Find which node is at the scrub position
  const nodeAt = scrubMs != null ? nodes.find(n => scrubMs >= n.startMs && scrubMs <= n.startMs + n.durMs) : null;

  return (
    <div className="trace-scrubber-wrap">
      <div className="trace-scrubber-ticks">
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <span key={p} className="tick" style={{ left: p * 100 + '%' }}>
            <span className="tick-label">{Math.round(p * totalMs)} ms</span>
          </span>
        ))}
      </div>
      <div
        className="trace-scrubber"
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onClick={() => nodeAt && onSelect && onSelect(nodeAt.name)}
      >
        {nodes.map(n => {
          const left = (n.startMs / totalMs) * 100;
          const width = (n.durMs / totalMs) * 100;
          const isActive = activeNode === n.name;
          return (
            <div
              key={n.name}
              className={'tsc-seg ' + (isActive ? 'active' : '') + (nodeAt && nodeAt.name === n.name ? ' hover' : '')}
              style={{ left: left + '%', width: width + '%', background: n.color }}
              title={`${n.name} · ${n.durMs} ms`}
            >
              {width > 12 && <span className="tsc-seg-label">{n.name}</span>}
            </div>
          );
        })}

        {/* Scrub cursor + tooltip */}
        {scrubX != null && (
          <>
            <div className="tsc-cursor" style={{ left: scrubX }}></div>
            <div className="tsc-tooltip" style={{ left: Math.min(scrubX, ref.current ? ref.current.clientWidth - 180 : 0) }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--accent)', marginBottom: 2 }}>{scrubMs} ms</div>
              {nodeAt ? (
                <>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 2 }}>{nodeAt.name}</div>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{scrubMs - nodeAt.startMs} / {nodeAt.durMs} ms · {Math.round(((scrubMs - nodeAt.startMs) / nodeAt.durMs) * 100)}%</div>
                </>
              ) : (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>idle</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TraceDrawer, TraceScrubber });

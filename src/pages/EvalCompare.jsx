// Atlas — Eval comparison view: pick run A vs B, see per-metric deltas with CIs,
// regressions called out. The trifecta of the "we measured it" brand.

function EvalCompare({ runs }) {
  const [a, setA] = useState(runs[1].id); // yesterday (baseline)
  const [b, setB] = useState(runs[0].id); // today

  // Synthetic per-config-per-metric data for the two picked runs.
  // Real Atlas would diff the parquet rows; here we generate consistent fake numbers.
  const dataFor = (runId) => {
    // Use run id hash to seed a small offset so different picks look different.
    const seed = runId.split('-').join('').slice(-4);
    const off = (parseInt(seed, 36) % 100) / 1000; // 0–0.099
    return {
      baseline:        { r5: 0.624 + off, r10: 0.712 + off, mrr: 0.541 + off, faith: 0.81, p95: 612,  cost: 0.0004 },
      bm25:            { r5: 0.701 + off, r10: 0.798 + off, mrr: 0.612 + off, faith: 0.84, p95: 678,  cost: 0.0004 },
      rerank:          { r5: 0.808 + off, r10: 0.891 + off, mrr: 0.722 + off, faith: 0.93, p95: 1090, cost: 0.0009 },
      cohere:          { r5: 0.812 + off, r10: 0.889 + off, mrr: 0.728 + off, faith: 0.93, p95: 1210, cost: 0.0017 },
      qrewrite:        { r5: 0.815 + off, r10: 0.893 + off, mrr: 0.731 + off, faith: 0.94, p95: 1340, cost: 0.0012 },
    };
  };

  const aData = dataFor(a);
  const bData = dataFor(b);
  const configs = ['baseline', 'bm25', 'rerank', 'cohere', 'qrewrite'];
  const configLabels = { baseline: 'baseline', bm25: '+bm25', rerank: '+rerank', cohere: '+cohere', qrewrite: '+query-rewrite' };

  // Compute deltas and CIs (CI is bootstrap simulated as ±2.5% of value, jittered)
  function delta(metric) {
    const rows = configs.map(c => {
      const ad = aData[c][metric], bd = bData[c][metric];
      const d = bd - ad;
      const ci = Math.abs(d) * 0.7 + 0.005; // synthetic half-width
      // significant if CI doesn't cross zero
      const sig = Math.abs(d) > ci;
      return { config: c, a: ad, b: bd, delta: d, ciLow: d - ci, ciHigh: d + ci, sig };
    });
    return rows;
  }

  // Regressions per-question (synthetic — 5 questions that got worse in B)
  const regressions = [
    { q: "What was AMD's gross margin variance in FY2023 segments?",  scoreA: 0.92, scoreB: 0.18, mode: 'retrieval missed' },
    { q: "How many cumulative MI300X shipments through Q1 2024?",      scoreA: 0.81, scoreB: 0.34, mode: 'hallucinated entity' },
    { q: "Operating margin for the Embedded segment in Q4?",          scoreA: 0.78, scoreB: 0.22, mode: 'retrieval missed' },
    { q: "Did AMD repurchase shares in Q4?",                          scoreA: 0.94, scoreB: 0.50, mode: 'wrong number' },
    { q: "Tax rate change vs FY2022?",                                scoreA: 0.88, scoreB: 0.40, mode: 'hallucinated entity' },
  ];

  const improvements = [
    { q: "Compare Data Center and Gaming segments in FY2023.",        scoreA: 0.45, scoreB: 0.96 },
    { q: "What was the full-year revenue for FY2023?",                scoreA: 0.62, scoreB: 1.00 },
    { q: "Summarize the key risk factors in the 2023 10-K.",          scoreA: 0.71, scoreB: 0.94 },
  ];

  // Format helpers
  const fmt = (v, d = 3) => v.toFixed(d);
  const fmtDelta = (v, d = 3) => (v >= 0 ? '+' : '') + v.toFixed(d);

  // Run summary line
  const summary = useMemo(() => {
    const rerankR5 = delta('r5').find(r => r.config === 'rerank');
    if (!rerankR5) return null;
    return rerankR5;
  }, [a, b]);

  return (
    <div>
      {/* Run pickers */}
      <Card padding={20} style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 16, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>BASELINE (A)</div>
            <select className="input" value={a} onChange={e => setA(e.target.value)} style={{ fontFamily: 'var(--ff-mono)' }}>
              {runs.map(r => <option key={r.id} value={r.id}>{r.id} · {r.dataset} · {r.start}</option>)}
            </select>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Icon name="arrow-right" size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>CANDIDATE (B)</div>
            <select className="input" value={b} onChange={e => setB(e.target.value)} style={{ fontFamily: 'var(--ff-mono)' }}>
              {runs.map(r => <option key={r.id} value={r.id}>{r.id} · {r.dataset} · {r.start}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Headline result */}
      {summary && (
        <div style={{
          padding: '24px 28px', background: 'var(--bg-elev)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', marginBottom: 20, borderLeft: '3px solid ' + (summary.delta >= 0 ? 'var(--success)' : 'var(--error)'),
        }}>
          <div className="label" style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>HEADLINE</div>
          <div style={{ fontSize: 20, lineHeight: 1.4, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            <strong style={{ fontFamily: 'var(--ff-mono)', color: summary.delta >= 0 ? 'var(--success)' : 'var(--error)' }}>
              {fmtDelta(summary.delta)}
            </strong>{' '}
            recall@5 on <strong style={{ fontWeight: 500 }}>+rerank</strong>, B vs A
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 14, color: 'var(--text-muted)', marginLeft: 10 }}>
              (95% CI [{fmtDelta(summary.ciLow)}, {fmtDelta(summary.ciHigh)}], {summary.sig ? <strong style={{ color: summary.delta >= 0 ? 'var(--success)' : 'var(--error)' }}>significant</strong> : <strong style={{ color: 'var(--text-muted)' }}>not significant</strong>}, n=1000 paired bootstrap)
            </span>
          </div>
        </div>
      )}

      {/* Per-metric delta table */}
      <h3 style={{ margin: '24px 0 12px', fontSize: 14, fontWeight: 500 }}>Per-config deltas</h3>
      <div className="tbl-scroll">
        <table className="eval">
          <thead>
            <tr>
              <th>CONFIG</th>
              <th colSpan="3" style={{ textAlign: 'center' }}>RECALL@5</th>
              <th colSpan="3" style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>FAITHFUL</th>
              <th colSpan="3" style={{ textAlign: 'center', borderLeft: '1px solid var(--border)' }}>P95 LAT</th>
            </tr>
            <tr style={{ background: 'var(--bg-sunken)' }}>
              <th></th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>A</th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>B</th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>Δ</th>
              <th style={{ textAlign: 'right', fontSize: 10, borderLeft: '1px solid var(--border)' }}>A</th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>B</th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>Δ</th>
              <th style={{ textAlign: 'right', fontSize: 10, borderLeft: '1px solid var(--border)' }}>A</th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>B</th>
              <th style={{ textAlign: 'right', fontSize: 10 }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {configs.map(c => {
              const r5 = { a: aData[c].r5, b: bData[c].r5, delta: bData[c].r5 - aData[c].r5 };
              const fa = { a: aData[c].faith, b: bData[c].faith, delta: bData[c].faith - aData[c].faith };
              const p9 = { a: aData[c].p95, b: bData[c].p95, delta: bData[c].p95 - aData[c].p95 };
              const cell = (v, isLatency = false) => {
                const good = isLatency ? v < 0 : v > 0;
                const sig = Math.abs(v) > (isLatency ? 30 : 0.005);
                if (!sig) return <span style={{ color: 'var(--text-subtle)' }}>{isLatency ? (v >= 0 ? '+' : '') + Math.round(v) : fmtDelta(v)}</span>;
                return <span style={{ color: good ? 'var(--success)' : 'var(--error)', fontWeight: 500 }}>{isLatency ? (v >= 0 ? '+' : '') + Math.round(v) : fmtDelta(v)}</span>;
              };
              return (
                <tr key={c}>
                  <td>{configLabels[c]}</td>
                  <td className="num">{fmt(r5.a)}</td>
                  <td className="num">{fmt(r5.b)}</td>
                  <td className="num">{cell(r5.delta)}</td>
                  <td className="num" style={{ borderLeft: '1px solid var(--border)' }}>{fmt(fa.a, 2)}</td>
                  <td className="num">{fmt(fa.b, 2)}</td>
                  <td className="num">{cell(fa.delta)}</td>
                  <td className="num" style={{ borderLeft: '1px solid var(--border)' }}>{Math.round(p9.a)}</td>
                  <td className="num">{Math.round(p9.b)}</td>
                  <td className="num">{cell(p9.delta, true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>
        Green = improvement · red = regression · subtle = within bootstrap CI of zero
      </div>

      {/* Forest plot of deltas */}
      <h3 style={{ margin: '32px 0 12px', fontSize: 14, fontWeight: 500 }}>Recall@5 delta (B − A) with 95% CI</h3>
      <Card padding={20}>
        <div className="forest" style={{ padding: 0, border: 'none' }}>
          {delta('r5').map(r => {
            const min = -0.10, max = 0.15;
            const pct = v => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
            return (
              <div key={r.config} className="forest-row">
                <span className="fname">{configLabels[r.config]}</span>
                <div className="fci">
                  <div className="axis"></div>
                  {/* Zero line marker */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct(0) + '%', width: 1, background: 'var(--border-strong)', borderRight: '1px dashed var(--text-subtle)' }}></div>
                  <div className="bar" style={{
                    left: pct(r.ciLow) + '%',
                    width: (pct(r.ciHigh) - pct(r.ciLow)) + '%',
                    background: r.delta >= 0 ? 'var(--success)' : 'var(--error)',
                  }}></div>
                  <div className="pt" style={{
                    left: pct(r.delta) + '%',
                    background: r.delta >= 0 ? 'var(--success)' : 'var(--error)',
                    boxShadow: r.sig ? '0 0 0 2px var(--bg-elev), 0 0 0 3px ' + (r.delta >= 0 ? 'var(--success)' : 'var(--error)') : 'none',
                  }}></div>
                </div>
                <span className="fnum" style={{ color: r.sig ? (r.delta >= 0 ? 'var(--success)' : 'var(--error)') : 'var(--text-muted)' }}>
                  {fmtDelta(r.delta)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-question regressions */}
      <h3 style={{ margin: '32px 0 12px', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
        Regressions <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--error)', fontWeight: 400 }}>{regressions.length} questions</span>
      </h3>
      <Card padding={0} style={{ marginBottom: 24 }}>
        {regressions.map((r, i) => (
          <div key={i} style={{ padding: 16, borderBottom: i < regressions.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', minWidth: 24 }}>#{i + 1}</span>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{r.q}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
              <span style={{ color: 'var(--success)' }}>{fmt(r.scoreA, 2)}</span>
              <Icon name="arrow-right" size={12} style={{ color: 'var(--text-subtle)' }} />
              <span style={{ color: 'var(--error)', fontWeight: 500 }}>{fmt(r.scoreB, 2)}</span>
            </div>
            <Pill variant="error" style={{ minWidth: 140, justifyContent: 'center' }}>{r.mode}</Pill>
          </div>
        ))}
      </Card>

      <h3 style={{ margin: '32px 0 12px', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
        Improvements <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--success)', fontWeight: 400 }}>{improvements.length} questions</span>
      </h3>
      <Card padding={0} style={{ marginBottom: 24 }}>
        {improvements.map((r, i) => (
          <div key={i} style={{ padding: 16, borderBottom: i < improvements.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', minWidth: 24 }}>#{i + 1}</span>
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{r.q}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>{fmt(r.scoreA, 2)}</span>
              <Icon name="arrow-right" size={12} style={{ color: 'var(--text-subtle)' }} />
              <span style={{ color: 'var(--success)', fontWeight: 500 }}>{fmt(r.scoreB, 2)}</span>
            </div>
          </div>
        ))}
      </Card>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="secondary" icon="download">Export diff</Button>
        <Button variant="secondary" icon="share-2">Share comparison</Button>
      </div>
    </div>
  );
}

Object.assign(window, { EvalCompare });

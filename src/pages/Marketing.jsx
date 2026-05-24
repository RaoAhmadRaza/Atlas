// Atlas — Marketing surfaces: Home, public /eval, Pricing, Docs, 404

function MarketingTop({ active, onNav }) {
  const starsLoaded = useFakeLoad(900);
  return (
    <div className="mk-top">
      <div className="mk-top-inner">
        <a className="mk-wordmark" onClick={() => onNav('home')}>atlas<span className="dot">.</span></a>
        <nav className="mk-nav">
          <a className={active === 'eval' ? 'active' : ''} onClick={() => onNav('eval-public')}>Eval report</a>
          <a className={active === 'docs' ? 'active' : ''} onClick={() => onNav('docs')}>Docs</a>
          <a className={active === 'pricing' ? 'active' : ''} onClick={() => onNav('pricing')}>Pricing</a>
          <a onClick={() => window.open('https://github.com', '_blank')}>GitHub</a>
        </nav>
        <div className="mk-actions">
          <a className="mk-star" onClick={() => onNav('home')}>
            <span className="star">★</span>
            {starsLoaded ? '1,247' : <span className="skel" style={{ display: 'inline-block', width: 36, height: 10, verticalAlign: 'middle' }}></span>}
          </a>
          <Button variant="ghost" size="sm" onClick={() => onNav('login')}>Sign in</Button>
          <Button variant="primary" size="sm" onClick={() => onNav('signup')}>Start free</Button>
        </div>
      </div>
    </div>
  );
}

function MarketingFooter({ onNav, theme, onToggleTheme }) {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-cols">
          <div className="mk-footer-col">
            <div style={{ fontFamily: 'var(--ff-display)', fontSize: 22, fontWeight: 500, color: 'var(--text)', marginBottom: 12 }}>
              atlas<span style={{ color: 'var(--accent)' }}>.</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 280 }}>
              A production-grade RAG platform with hybrid retrieval and a 1,000-question eval harness that gates every commit.
            </div>
          </div>
          <div className="mk-footer-col">
            <h4>Product</h4>
            <a onClick={() => onNav('home')}>Overview</a>
            <a onClick={() => onNav('eval-public')}>Eval report</a>
            <a onClick={() => onNav('pricing')}>Pricing</a>
            <a onClick={() => onNav('signup')}>Start free</a>
          </div>
          <div className="mk-footer-col">
            <h4>Docs</h4>
            <a onClick={() => onNav('docs')}>Quickstart</a>
            <a onClick={() => onNav('docs')}>Architecture</a>
            <a onClick={() => onNav('docs')}>API reference</a>
            <a onClick={() => onNav('docs')}>CLI</a>
          </div>
          <div className="mk-footer-col">
            <h4>Community</h4>
            <a>GitHub</a>
            <a>Discord</a>
            <a>Blog</a>
            <a>Changelog</a>
          </div>
          <div className="mk-footer-col">
            <h4>Legal</h4>
            <a>Privacy</a>
            <a>Terms</a>
            <a>License (Apache 2.0)</a>
            <a>Security</a>
          </div>
        </div>
        <div className="mk-footer-bottom">
          <span>© 2026 Atlas Project · Apache 2.0</span>
          <span className="right">
            <span><span className="star" style={{ color: 'var(--accent)' }}>★</span> 1,247 on GitHub</span>
            <span style={{ color: 'var(--text-subtle)' }}>·</span>
            <a onClick={onToggleTheme} style={{ color: 'var(--text-subtle)', cursor: 'pointer', textDecoration: 'none' }}>
              {theme === 'dark' ? 'Light' : 'Dark'} theme
            </a>
            <span style={{ color: 'var(--text-subtle)' }}>·</span>
            <span>v0.9.4</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

// ============================================================
// Marketing Home
// ============================================================
function MarketingHome({ onNav, theme, onToggleTheme }) {
  return (
    <div className="mk-shell" data-screen-label="01 Marketing Home">
      <MarketingTop active="home" onNav={onNav} />

      {/* Hero */}
      <div className="mk-container">
        <section className="mk-hero">
          <div className="mk-eyebrow"><span className="pulse"></span>OPEN SOURCE · APACHE 2.0</div>
          <h1 className="mk-h1">Retrieval,<br/><em><TypewriterWord words={["measured", "monitored", "modeled", "mapped", "managed"]} />.</em></h1>
          <p className="mk-sub">
            Atlas is a production-grade RAG platform with hybrid retrieval, multi-tenant isolation, and a 1,000-question evaluation harness that gates every commit. The numbers are public. Reproduce them yourself.
          </p>
          <div className="mk-ctas">
            <Button variant="primary" size="lg" iconRight="arrow-right" onClick={() => onNav('signup')}>Try the live demo</Button>
            <Button variant="secondary" size="lg" icon="github" onClick={() => window.open('https://github.com', '_blank')}>View on GitHub <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', paddingLeft: 8, borderLeft: '1px solid var(--border)', marginLeft: 4 }}>★ 1,247</span></Button>
          </div>

          <Reveal as="div" className="mk-metric-strip" stagger>
            <div className="mk-metric">
              <span className="v">+<Counter value={18.4} decimals={1} /> pts</span>
              <div className="l">recall@5 over dense baseline<HelpQ term="recall@5" /></div>
            </div>
            <div className="mk-metric">
              <span className="v">&lt;<Counter value={1.2} decimals={1} /> s</span>
              <div className="l">p95 query latency<HelpQ term="p95 latency" /></div>
            </div>
            <div className="mk-metric">
              <span className="v">$<Counter value={0.0008} decimals={4} /></span>
              <div className="l">per query<HelpQ term="cost per query" /></div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Architecture */}
      <section className="mk-section sunken">
        <div className="mk-container">
          <div className="label sticky-eyebrow">02 · ARCHITECTURE</div>
          <h2 style={{ maxWidth: 700, marginBottom: 40 }}>One stack. Every box on this diagram is open source.</h2>
          <Reveal className="arch-frame">
            <ArchSvg />
          </Reveal>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 24, fontSize: 14 }}>
            Run the whole stack locally with <code style={{ fontFamily: 'var(--ff-mono)', padding: '1px 6px', background: 'var(--bg-sunken)', borderRadius: 3, border: '1px solid var(--border)' }}>docker compose up</code>.
          </p>
        </div>
      </section>

      {/* Why most RAG demos lie */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-twocol">
            <div className="left">
              <div className="label sticky-eyebrow">03 · POSITION</div>
              <h2>Why most RAG demos lie about their numbers.</h2>
              <ul className="mk-bullets">
                <li><strong>Most claim improvements with no statistical test.</strong> A 0.05 bump on 30 questions is noise.</li>
                <li><strong>Most don't measure faithfulness.</strong> Retrieval can look great while generation hallucinates.</li>
                <li><strong>Most aren't reproducible.</strong> No dataset, no config, no seed.</li>
              </ul>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 24, lineHeight: 1.6 }}>
                Atlas publishes its full eval pipeline, golden datasets, and reproduction commands. Run it on your own corpus in 15 minutes.
              </p>
            </div>
            <div className="mk-figure">
              <div className="mk-figure-head">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}></span>
                /eval · run 2026-05-19 · combined-v3 (n=1000)
              </div>
              <div className="mk-figure-body">
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>HEADLINE RESULT</div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: 24, lineHeight: 1.3, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--accent)' }}>+18.4 pts</span> recall@5 over baseline
                </div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  95% CI [15.1, 21.7] · p&lt;0.001 · n=1000 · 10K bootstrap
                </div>
                <MiniForest />
                <a onClick={() => onNav('eval-public')} style={{ display: 'inline-block', marginTop: 18, fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>
                  Read the full report →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mk-section sunken">
        <div className="mk-container">
          <div className="label sticky-eyebrow">04 · CAPABILITIES</div>
          <h2 style={{ marginBottom: 48 }}>Six things Atlas does that other RAG starters skip.</h2>
          <div className="mk-features reveal-stagger" ref={el => {
            if (el && !el.dataset.observed) {
              el.dataset.observed = '1';
              if (typeof IntersectionObserver !== 'undefined') {
                const io = new IntersectionObserver(es => {
                  es.forEach(e => { if (e.isIntersecting) { el.classList.add('shown'); io.disconnect(); } });
                }, { threshold: 0.1 });
                io.observe(el);
              } else { el.classList.add('shown'); }
            }
          }}>
            {[
              { i: 'layers', t: 'Hybrid retrieval', d: 'BM25 + dense + reranker, fused via reciprocal rank fusion. Configurable weights, defaults are tuned.' },
              { i: 'shield', t: 'Multi-tenant by default', d: 'PostgreSQL row-level security at the database layer. No application-level filtering.' },
              { i: 'bar-chart-3', t: 'Eval harness', d: '1,000-question regression suite. Paired bootstrap CIs. Every PR runs the smoke set; nightly runs the full suite.' },
              { i: 'activity', t: 'Full observability', d: 'LangSmith traces, per-tenant cost, per-node latency. Every query has a permalink trace.' },
              { i: 'box', t: 'Three deploy paths', d: 'Docker Compose for local. Helm chart for Kubernetes. Fly.io + Neon for one-command production.' },
              { i: 'plug', t: 'MCP-ready', d: 'Expose your RAG to Claude Desktop, Cursor, or any MCP-compatible agent. JSON config provided.' },
            ].map(f => (
              <div key={f.t} className="mk-feature">
                <span className="ic"><Icon name={f.i} size={18} /></span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Eval table preview */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="label sticky-eyebrow">05 · NUMBERS</div>
          <h2 style={{ marginBottom: 16 }}>The headline table, in full.</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, maxWidth: 640, marginBottom: 32 }}>
            This is the same table you see on the public eval report. Live numbers from the most recent nightly run.
          </p>

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
              {[
                ['baseline',       0.624, 0.712, 0.541, 0.81, '612 ms',  '$0.0004', false],
                ['+bm25',          0.701, 0.798, 0.612, 0.84, '678 ms',  '$0.0004', false],
                ['+rerank',        0.808, 0.891, 0.722, 0.93, '1,090 ms','$0.0009', true],
                ['+cohere',        0.812, 0.889, 0.728, 0.93, '1,210 ms','$0.0017', false],
                ['+query-rewrite', 0.815, 0.893, 0.731, 0.94, '1,340 ms','$0.0012', false],
              ].map(r => (
                <tr key={r[0]} onClick={() => onNav('eval-public')}>
                  <td>{r[0]}</td>
                  <td className={'num ' + (r[7] ? 'best' : '')}>{r[1].toFixed(3)}</td>
                  <td className={'num ' + (r[7] ? 'best' : '')}>{r[2].toFixed(3)}</td>
                  <td className={'num ' + (r[7] ? 'best' : '')}>{r[3].toFixed(3)}</td>
                  <td className={'num ' + (r[7] ? 'best' : '')}>{r[4].toFixed(2)}</td>
                  <td className="num">{r[5]}</td>
                  <td className="num">{r[6]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          <div style={{ marginTop: 16 }}>
            <a onClick={() => onNav('eval-public')} style={{ fontSize: 14, color: 'var(--accent)', cursor: 'pointer' }}>View the full report →</a>
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section className="mk-section sunken">
        <div className="mk-container">
          <div className="label sticky-eyebrow">06 · INSTALL</div>
          <h2 style={{ marginBottom: 32 }}>Three ways to try Atlas, in 90 seconds.</h2>
          <div className="mk-quickstart">
            <div className="step">
              <span className="label">RUN LOCALLY</span>
              <pre><span className="c"># Clone & boot the stack</span>{'\n'}git clone github.com/atlas/atlas{'\n'}cd atlas && docker compose up</pre>
            </div>
            <div className="step">
              <span className="label">HOSTED DEMO</span>
              <pre><span className="c"># Open in your browser</span>{'\n'}open https://demo.atlas.dev{'\n'}<span className="c"># No signup. Sample corpus loaded.</span></pre>
            </div>
            <div className="step">
              <span className="label">MCP · CLAUDE DESKTOP</span>
              <pre><span className="c"># Install the MCP server</span>{'\n'}atlas mcp install{'\n'}<span className="c"># Restart Claude. Done.</span></pre>
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section className="mk-section">
        <div className="mk-container">
          <div className="mk-quote">
            <p>"I built this carefully and I can prove it. Every number on the homepage links to the commit that produced it, the dataset it ran against, and the seed I used. Reproducing it on your own corpus takes about fifteen minutes."</p>
            <div className="by">
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-sunken)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500 }}>AR</div>
              <span>Asad Raza · author · <a style={{ color: 'var(--accent)' }}>read the launch post →</a></span>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter onNav={onNav} theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}

// Small SVG forest plot for the editorial figure
function MiniForest() {
  const rows = [
    { n: 'baseline',       v: 0.624, best: false },
    { n: '+bm25',          v: 0.701, best: false },
    { n: '+rerank',        v: 0.808, best: true },
    { n: '+cohere',        v: 0.812, best: false },
    { n: '+query-rewrite', v: 0.815, best: false },
  ];
  const min = 0.55, max = 0.88;
  const pct = v => ((v - min) / (max - min)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map(r => (
        <div key={r.n} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 50px', alignItems: 'center', padding: '7px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
          <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text)' }}>{r.n}</span>
          <div style={{ position: 'relative', height: 16 }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'var(--border)' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: pct(r.v - 0.025) + '%', width: (pct(r.v + 0.025) - pct(r.v - 0.025)) + '%', height: 2, background: 'var(--accent)', transform: 'translateY(-50%)' }}></div>
            <div style={{ position: 'absolute', top: '50%', left: pct(r.v) + '%', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', transform: 'translate(-50%, -50%)', boxShadow: r.best ? '0 0 0 2px var(--bg-elev), 0 0 0 3px var(--accent)' : 'none' }}></div>
          </div>
          <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)', textAlign: 'right' }}>{r.v.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

// Reveal-on-scroll helper. Adds `.shown` class once per element per page-load.
function Reveal({ as: Tag = 'div', children, className = '', stagger = false, threshold = 0.15, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!ref.current || shown) return;
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { setShown(true); io.disconnect(); }
      });
    }, { threshold, rootMargin: '0px 0px -8% 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const base = stagger ? 'reveal-stagger' : 'reveal';
  return <Tag ref={ref} className={`${base} ${shown ? 'shown' : ''} ${className}`} {...rest}>{children}</Tag>;
}

// Counter that ticks 0 → value when it scrolls into view. Decimals & prefix/suffix preserved.
function Counter({ value, prefix = '', suffix = '', durationMs = 900, decimals = 0 }) {
  const ref = useRef(null);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ref.current || done) return;
    if (typeof IntersectionObserver === 'undefined') { setCurrent(value); setDone(true); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting || done) return;
        io.disconnect();
        const start = performance.now();
        const ease = (t) => 1 - Math.pow(1 - t, 3); // ease-out cubic
        function tick(now) {
          const p = Math.min(1, (now - start) / durationMs);
          setCurrent(value * ease(p));
          if (p < 1) requestAnimationFrame(tick); else setDone(true);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <span ref={ref}>{prefix}{current.toFixed(decimals)}{suffix}</span>;
}

// Typing animation that cycles through words.
function TypewriterWord({ words }) {
  const [display, setDisplay] = useState(words[0]);
  const stateRef = useRef({ idx: 0, len: words[0].length, phase: 'hold', tick: 0 });

  useEffect(() => {
    let cancelled = false;
    function next() {
      if (cancelled) return;
      const s = stateRef.current;
      let delay = 100;
      if (s.phase === 'hold') {
        s.phase = 'erasing';
        delay = 1600;
      } else if (s.phase === 'erasing') {
        if (s.len === 0) {
          s.idx = (s.idx + 1) % words.length;
          s.phase = 'typing';
          delay = 80;
        } else {
          s.len -= 1;
          delay = 55;
        }
      } else { // typing
        const target = words[s.idx];
        if (s.len === target.length) {
          s.phase = 'hold';
          delay = 100;
        } else {
          s.len += 1;
          delay = 110;
        }
      }
      setDisplay(words[s.idx].slice(0, s.len));
      setTimeout(next, delay);
    }
    const id = setTimeout(next, 1400);
    return () => { cancelled = true; clearTimeout(id); };
  }, []); // run once

  return (
    <span style={{ display: 'inline-block' }}>
      {display}
      <span className="tw-caret"></span>
    </span>
  );
}

function ArchSvg() {
  const [hover, setHover] = useState(null); // node id or null

  // Define which flows are connected to each node
  const flowConnections = {
    'web':    ['web-down'],
    'cli':    ['cli-down'],
    'mcp':    ['mcp-down'],
    'api':    ['api-down'],
    'rewrite':   ['web-down', 'cli-down', 'mcp-down', 'api-down', 'rewrite-retrieve'],
    'retrieve':  ['rewrite-retrieve', 'retrieve-rerank', 'retrieve-pg', 'retrieve-redis'],
    'rerank':    ['retrieve-rerank', 'rerank-compress'],
    'compress':  ['rerank-compress', 'compress-generate'],
    'generate':  ['compress-generate', 'generate-verify', 'generate-storage'],
    'verify':    ['generate-verify'],
    'postgres':  ['retrieve-pg'],
    'redis':     ['retrieve-redis'],
    'storage':   ['generate-storage'],
  };

  const isLit = (flowId) => hover && flowConnections[hover]?.includes(flowId);
  const isDim = (id) => hover && hover !== id && !flowConnections[hover]?.some(f => f.includes(id));

  return (
    <svg className={'arch-svg ' + (hover ? 'arch-hover' : '')} viewBox="0 0 880 420" xmlns="http://www.w3.org/2000/svg"
         onMouseLeave={() => setHover(null)}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--text-subtle)" />
        </marker>
        <marker id="ah-lit" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
      </defs>
      <style>{`
        .arch-svg .node { cursor: pointer; transition: opacity var(--motion-fast); }
        .arch-svg .node .box { transition: stroke var(--motion-fast), fill var(--motion-fast); }
        .arch-svg .node.lit .box { stroke: var(--accent); fill: var(--accent-bg); }
        .arch-svg .node.lit .label-t { fill: var(--accent); }
        .arch-hover .node.dim { opacity: 0.35; }
        .arch-svg .flow.lit { stroke: var(--accent); stroke-width: 2; }
        .arch-hover .flow:not(.lit) { stroke: var(--border); opacity: 0.4; }
        .box{fill:var(--bg-sunken);stroke:var(--border-strong);stroke-width:1}
        .label-t{font-family:var(--ff-ui);font-size:13px;fill:var(--text);font-weight:500}
        .label-s{font-family:var(--ff-mono);font-size:10px;fill:var(--text-muted)}
        .flow{stroke:var(--text-subtle);stroke-width:1.2;fill:none;transition:stroke var(--motion-fast),stroke-width var(--motion-fast),opacity var(--motion-fast)}
        .section-t{font-family:var(--ff-ui);font-size:10px;fill:var(--text-subtle);letter-spacing:0.06em;text-transform:uppercase}
      `}</style>

      {/* Lanes */}
      <text x="40" y="36" className="section-t">CLIENT</text>
      <text x="40" y="140" className="section-t">API · LANGGRAPH</text>
      <text x="40" y="290" className="section-t">DATA</text>

      {/* Client */}
      {[
        ['web', 40,  46, 'Web UI',       'React / Next.js'],
        ['cli', 220, 46, 'CLI',           'atlas-cli'],
        ['mcp', 400, 46, 'MCP server',    'Claude · Cursor'],
        ['api', 580, 46, 'API clients',   'REST · OpenAPI'],
      ].map(([id, x, y, t, s]) => {
        const cls = 'node ' + (hover === id ? 'lit ' : '') + (isDim(id) ? 'dim' : '');
        return (
          <g key={id} className={cls} onMouseEnter={() => setHover(id)}>
            <rect className="box" x={x} y={y} width="160" height="56" rx="6" />
            <text x={x + 80} y={y + 26} className="label-t" textAnchor="middle">{t}</text>
            <text x={x + 80} y={y + 44} className="label-s" textAnchor="middle">{s}</text>
          </g>
        );
      })}

      {/* Client → API flow arrows */}
      <line className={'flow ' + (isLit('web-down') ? 'lit' : '')} x1="120" y1="102" x2="120" y2="150" markerEnd={isLit('web-down') ? 'url(#ah-lit)' : 'url(#ah)'} />
      <line className={'flow ' + (isLit('cli-down') ? 'lit' : '')} x1="300" y1="102" x2="300" y2="150" markerEnd={isLit('cli-down') ? 'url(#ah-lit)' : 'url(#ah)'} />
      <line className={'flow ' + (isLit('mcp-down') ? 'lit' : '')} x1="480" y1="102" x2="480" y2="150" markerEnd={isLit('mcp-down') ? 'url(#ah-lit)' : 'url(#ah)'} />
      <line className={'flow ' + (isLit('api-down') ? 'lit' : '')} x1="660" y1="102" x2="660" y2="150" markerEnd={isLit('api-down') ? 'url(#ah-lit)' : 'url(#ah)'} />

      {/* API layer container */}
      <rect className="box" x="40" y="156" width="800" height="100" rx="8" style={{ fill: 'var(--bg-elev)' }} />
      <text x="60" y="180" className="section-t">FASTAPI · LANGGRAPH DAG</text>

      {/* LangGraph nodes */}
      {[
        ['rewrite',  72,  214],
        ['retrieve', 184, 214],
        ['rerank',   296, 214],
        ['compress', 408, 214],
        ['generate', 520, 214],
        ['verify',   632, 214],
      ].map(([id, x, y], i, a) => {
        const cls = 'node ' + (hover === id ? 'lit ' : '') + (isDim(id) ? 'dim' : '');
        const inFlows = ['rewrite-retrieve','retrieve-rerank','rerank-compress','compress-generate','generate-verify'];
        const nextFlow = i < a.length - 1 ? inFlows[i] : null;
        return (
          <g key={id} className={cls} onMouseEnter={() => setHover(id)}>
            <rect className="box" x={x} y={y - 22} width="96" height="34" rx="4" />
            <text x={x + 48} y={y - 2} className="label-s" textAnchor="middle" style={{ fill: 'var(--text)', fontSize: 11, fontFamily: 'var(--ff-mono)' }}>{id}</text>
            {nextFlow && (
              <line className={'flow ' + (isLit(nextFlow) ? 'lit' : '')} x1={x + 96} y1={y - 5} x2={x + 112} y2={y - 5} markerEnd={isLit(nextFlow) ? 'url(#ah-lit)' : 'url(#ah)'} />
            )}
          </g>
        );
      })}

      {/* API → Data flows */}
      <line className={'flow ' + (isLit('retrieve-pg') ? 'lit' : '')} x1="240" y1="256" x2="240" y2="300" markerEnd={isLit('retrieve-pg') ? 'url(#ah-lit)' : 'url(#ah)'} />
      <line className={'flow ' + (isLit('retrieve-redis') ? 'lit' : '')} x1="440" y1="256" x2="440" y2="300" markerEnd={isLit('retrieve-redis') ? 'url(#ah-lit)' : 'url(#ah)'} />
      <line className={'flow ' + (isLit('generate-storage') ? 'lit' : '')} x1="640" y1="256" x2="640" y2="300" markerEnd={isLit('generate-storage') ? 'url(#ah-lit)' : 'url(#ah)'} />

      {/* Data nodes */}
      {[
        ['postgres', 40,  306, 240, 'PostgreSQL + pgvector', ['RLS · chunks · embeddings · evals', 'tenant_id everywhere']],
        ['redis',    300, 306, 240, 'Redis', ['query · embed · rerank cache', 'queue · rate limits']],
        ['storage',  560, 306, 280, 'Object storage', ['S3 / R2 / local', 'documents · eval bundles · backups']],
      ].map(([id, x, y, w, t, subs]) => {
        const cls = 'node ' + (hover === id ? 'lit ' : '') + (isDim(id) ? 'dim' : '');
        return (
          <g key={id} className={cls} onMouseEnter={() => setHover(id)}>
            <rect className="box" x={x} y={y} width={w} height="86" rx="6" />
            <text x={x + w / 2} y={y + 26} className="label-t" textAnchor="middle">{t}</text>
            {subs.map((s, i) => (
              <text key={i} x={x + w / 2} y={y + 44 + i * 18} className="label-s" textAnchor="middle">{s}</text>
            ))}
          </g>
        );
      })}

      {/* Hover legend */}
      {hover && (
        <g>
          <rect x="20" y="395" width="200" height="22" rx="4" fill="var(--bg-elev)" stroke="var(--accent)" />
          <text x="30" y="410" className="label-s" style={{ fill: 'var(--text)', fontSize: 11 }}>
            <tspan style={{ fill: 'var(--accent)', fontFamily: 'var(--ff-mono)' }}>{hover}</tspan>
            <tspan style={{ fill: 'var(--text-muted)' }}> · connected flows lit</tspan>
          </text>
        </g>
      )}
    </svg>
  );
}

// ============================================================
// Public Eval Report (/eval)
// ============================================================
function PublicEvalReport({ onNav, theme, onToggleTheme }) {
  const [failuresOpen, setFailuresOpen] = useState(false);

  const configs = [
    { name: 'baseline',        r5: 0.624, r10: 0.712, mrr: 0.541, faith: 0.81, p95: '612 ms',   cost: '$0.0004', best: false },
    { name: '+bm25',           r5: 0.701, r10: 0.798, mrr: 0.612, faith: 0.84, p95: '678 ms',   cost: '$0.0004', best: false },
    { name: '+rerank',         r5: 0.808, r10: 0.891, mrr: 0.722, faith: 0.93, p95: '1,090 ms', cost: '$0.0009', best: true  },
    { name: '+cohere',         r5: 0.812, r10: 0.889, mrr: 0.728, faith: 0.93, p95: '1,210 ms', cost: '$0.0017', best: false },
    { name: '+query-rewrite',  r5: 0.815, r10: 0.893, mrr: 0.731, faith: 0.94, p95: '1,340 ms', cost: '$0.0012', best: false },
  ];

  const failures = [
    { q: "What was AMD's gross margin variance in FY2023 segments?",          gold: "GAAP gross margin 46%, non-GAAP 50%, variance driven by Embedded amortization.", mode: 'missed retrieval' },
    { q: "How many cumulative MI300X shipments through Q1 2024?",             gold: "Not directly disclosed; estimated 200K based on $1B+ Data Center attribution.", mode: 'hallucinated entity' },
    { q: "Compare AMD vs NVIDIA Q4 Data Center revenue.",                     gold: "AMD $2.3B vs NVIDIA $18.4B (Jan 2024 quarter).",                                 mode: 'stale data' },
    { q: "What inventory write-down was recorded in Embedded?",               gold: "$66M, disclosed in Q4 2023 10-K MD&A.",                                          mode: 'missed retrieval' },
    { q: "Tax rate change vs FY2022?",                                        gold: "Effective tax rate declined from 7% to 3% due to one-time releases.",            mode: 'hallucinated entity' },
    { q: "Are there any pending IRS audits disclosed?",                       gold: "Yes — Section 174 capitalization dispute, immaterial estimated impact.",        mode: 'missed retrieval' },
    { q: "Total R&D spend as % of revenue?",                                  gold: "26% in FY2023, up from 23% in FY2022.",                                          mode: 'missed retrieval' },
    { q: "Did AMD repurchase shares in Q4?",                                  gold: "Yes, $100M in Q4, $986M for full year.",                                         mode: 'wrong number' },
    { q: "Number of employees at end of FY2023?",                             gold: "~26,000 employees globally.",                                                    mode: 'stale data' },
    { q: "What is the long-term gross margin target range?",                  gold: "57% non-GAAP per FY2023 analyst day.",                                           mode: 'missed retrieval' },
  ];

  return (
    <div className="mk-shell" data-screen-label="02 Public Eval Report">
      <MarketingTop active="eval" onNav={onNav} />

      <div className="eval-editorial">
        <div className="run-meta">
          <dt>RUN ID</dt><dd>2026-05-19T03:14:22Z</dd>
          <dt>COMMIT</dt><dd><a style={{ color: 'var(--accent)' }}>a3f2bc9</a> · main</dd>
          <dt>DATASET</dt><dd>combined-v3 (HotpotQA-subset + FinanceBench, n=1000)</dd>
          <dt>CONFIGS</dt><dd>5 · baseline, +bm25, +rerank, +cohere, +query-rewrite</dd>
          <dt>RUNTIME</dt><dd>47 min 12 s · across 8 workers</dd>
          <dt>COST</dt><dd>$8.14 total</dd>
        </div>

        <h2 className="display">
          Hybrid + BGE Rerank improved <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--accent)' }}>recall@5 by +18.4 points</span> absolute over the dense baseline.
        </h2>
        <p className="stat-lead">
          95% CI [15.1, 21.7] · p&lt;0.001 · n=1000 · 10K paired bootstrap resamples <HelpQ term="paired bootstrap" />
        </p>

        <Card style={{ marginTop: 32, padding: 24 }}>
          <div className="label" style={{ marginBottom: 16 }}>RECALL@5 BY CONFIG · 95% CI</div>
          <Reveal className="forest" style={{ padding: 0, border: 'none' }}>
            {configs.map(c => {
              const min = 0.55, max = 0.88;
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
          </Reveal>
        </Card>

        <h3>Full results</h3>
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

        <h3>Most informative deltas</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
          <KPI label="+RERANK VS BASELINE" value="+0.184" delta="recall@5" ci="95% CI [0.151, 0.217] · p<0.001" />
          <KPI label="+QUERY-REWRITE Δ" value="+0.007" delta="recall@5 over +rerank" ci="95% CI [-0.012, 0.026] · ns" />
          <KPI label="COHERE VS BGE" value="+0.004" delta="recall@5 · 1.9× cost" ci="95% CI [-0.014, 0.022] · ns" />
        </div>
        <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
          The rerank step is the single largest lever. Query rewriting and switching to Cohere look like noise on this dataset — both well within the bootstrap CI of zero.
        </p>

        <h3>Per-difficulty breakdown</h3>
        <Card padding={24}>
          <div className="label" style={{ marginBottom: 16 }}>RECALL@5 BY QUESTION DIFFICULTY · TOP 3 CONFIGS</div>
          <GroupedBars
            groups={['easy (n=412)', 'medium (n=387)', 'hard (n=201)']}
            series={[
              { name: 'baseline', data: [0.78, 0.62, 0.41] },
              { name: '+rerank',  data: [0.94, 0.82, 0.61] },
              { name: '+query-rewrite', data: [0.95, 0.83, 0.62] },
            ]}
          />
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--ff-mono)' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--accent)', marginRight: 6, verticalAlign: 'middle' }}></span>baseline</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--info)', marginRight: 6, verticalAlign: 'middle' }}></span>+rerank</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--success)', marginRight: 6, verticalAlign: 'middle' }}></span>+query-rewrite</span>
          </div>
        </Card>

        <h3 onClick={() => setFailuresOpen(o => !o)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          Failure analysis <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 400 }}>· top 10 still failing on +rerank</span>
          <Icon name={failuresOpen ? 'chevron-up' : 'chevron-down'} size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
        </h3>
        {failuresOpen && (
          <Card padding={0}>
            {failures.map((f, i) => (
              <div key={i} style={{ padding: 18, borderBottom: i < failures.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', minWidth: 24 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 8, fontWeight: 500 }}>{f.q}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 8 }}>GOLD</span>
                      {f.gold}
                    </div>
                    <Pill variant={f.mode === 'stale data' ? 'warn' : 'error'}>{f.mode}</Pill>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )}

        <h3>Reproduce this run</h3>
        <CodeBlock lang="bash" code={`git clone github.com/atlas/atlas
cd atlas && atlas-eval run \\
  --dataset combined-v3 \\
  --run-id 2026-05-19`} />
        <p style={{ marginTop: 14, fontSize: 13, color: 'var(--text-muted)' }}>
          The full reproduction is deterministic. Bring your own corpus by pointing <code>--dataset</code> at a YAML matching the published schema.
        </p>

        <h3>Methodology</h3>
        <p style={{ fontSize: 15 }}>
          Atlas uses paired bootstrap resampling with 10,000 iterations <HelpQ term="paired bootstrap" /> over the same 1,000 question set to compare configs head-to-head. We report the 95% confidence interval of the recall@5 difference. A difference is considered significant if zero is not contained in the interval, controlled for multiple comparisons via Benjamini-Hochberg.
        </p>
        <p style={{ fontSize: 15 }}>
          The dataset blends 600 questions from a HotpotQA subset with 400 from FinanceBench, weighted to mirror the production query distribution observed across the hosted demo. Smoke runs (n=50) execute on every PR; full runs (n=1000) execute nightly and on tagged releases.
        </p>
      </div>

      <MarketingFooter onNav={onNav} theme={theme} onToggleTheme={onToggleTheme} />
    </div>
  );
}

Object.assign(window, { MarketingHome, PublicEvalReport, MarketingTop, MarketingFooter, ArchSvg, MiniForest });

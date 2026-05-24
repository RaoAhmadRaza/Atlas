// Atlas — Settings: Retrieval (the magic page), Models, Budgets

function SettingsRetrieval() {
  const [tweaks, setTweaks] = useState({
    chunkStrategy: 'recursive',
    chunkSize: 512,
    overlap: 80,
    tokenizer: 'tiktoken',
    embedding: 'bge-large',
    dualEmbed: false,
    retrievalMode: 'hybrid',
    topKFused: 30,
    bm25Weight: 0.5,
    reranker: 'bge-reranker-v2-m3',
    topKAfter: 8,
    queryRewrite: true,
    verify: true,
    maxRegen: 2,
    queryCache: true,
    embedCache: true,
    rerankCache: false,
    cacheTTL: 3600,
  });

  function set(k, v) { setTweaks(t => ({ ...t, [k]: v })); }

  const [reEmbedConfirm, setReEmbedConfirm] = useState(false);

  return (
    <div data-screen-label="19 Settings · Retrieval">
      <h1>Retrieval</h1>
      <div className="lede">
        How Atlas finds and ranks the chunks that go into each answer. Every option here has a <code style={{ fontFamily: 'var(--ff-mono)', padding: '1px 6px', background: 'var(--bg-sunken)', borderRadius: 3, fontSize: 12 }}>?</code> — defaults are tuned, but the page itself is documentation.
      </div>

      {/* CHUNKING */}
      <section className="settings-section">
        <h2>Chunking <HelpQ term="chunking" /></h2>
        <div className="sec-sub">How documents are split before embedding. Affects recall, precision, and embedding cost.</div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Strategy <HelpQ /></div><div className="help">How to find chunk boundaries.</div></div>
          <div className="radio-group">
            {[
              ['recursive',         'Recursive (default)',   'Splits on paragraph → sentence → token. Best for prose.'],
              ['semantic',          'Semantic',              'Splits when adjacent sentences become embedding-distant. Slower; sometimes better recall.'],
              ['markdown-header',   'Markdown headers',      'One chunk per H1/H2 section. Use for technical docs and READMEs.'],
              ['late-chunking',     'Late chunking (beta)',  'Embed first, then chunk. Preserves cross-chunk semantics. Higher compute.'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (tweaks.chunkStrategy === id ? 'active' : '')} onClick={() => set('chunkStrategy', id)}>
                <div className="r"></div>
                <div><div className="rt">{t}</div><div className="rd">{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Chunk size <HelpQ /></div><div className="help">Tokens per chunk. Smaller = better precision, more chunks. Larger = better context, fewer.</div></div>
          <div className="range-row" style={{ maxWidth: 360 }}>
            <input type="range" min="128" max="2048" step="32" value={tweaks.chunkSize} onChange={e => set('chunkSize', +e.target.value)} />
            <span className="v">{tweaks.chunkSize} tok</span>
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Overlap <HelpQ /></div><div className="help">Tokens shared between adjacent chunks. Helps avoid splitting facts.</div></div>
          <div className="range-row" style={{ maxWidth: 360 }}>
            <input type="range" min="0" max="256" step="8" value={tweaks.overlap} onChange={e => set('overlap', +e.target.value)} />
            <span className="v">{tweaks.overlap} tok</span>
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Tokenizer</div><div className="help">How to count tokens. Use <code style={{ fontFamily: 'var(--ff-mono)' }}>auto</code> unless you have a reason.</div></div>
          <select className="input" value={tweaks.tokenizer} onChange={e => set('tokenizer', e.target.value)} style={{ maxWidth: 240 }}>
            <option value="auto">auto</option>
            <option value="tiktoken">tiktoken (OpenAI)</option>
            <option value="model-native">model-native</option>
          </select>
        </div>
      </section>

      {/* EMBEDDING */}
      <section className="settings-section">
        <h2>Embedding <HelpQ term="embedding model" /></h2>
        <div className="sec-sub">The model that converts text into vectors for dense retrieval.</div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Primary model</div><div className="help">Switching here only affects new uploads. Use re-embed below to backfill.</div></div>
          <div className="radio-group">
            {[
              ['bge-large', 'BGE-large-en-v1.5',          'Open weights · free · runs on CPU · 1024-dim · solid quality'],
              ['oai-3l',    'OpenAI text-embedding-3-large', '$0.13 / 1M tok · best quality on most benchmarks · 3072-dim'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (tweaks.embedding === id ? 'active' : '')} onClick={() => set('embedding', id)}>
                <div className="r"></div>
                <div><div className="rt">{t}</div><div className="rd">{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Dual-embed mode <HelpQ /></div><div className="help">Generate both BGE and OpenAI embeddings for every chunk. Lets you A/B retrieval at query time. Doubles embedding cost and storage.</div></div>
          <div className="toggle-row">
            <ToggleSwitch on={tweaks.dualEmbed} onChange={v => set('dualEmbed', v)} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tweaks.dualEmbed ? 'On · A/B available at query time' : 'Off'}</span>
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Re-embed all documents</div><div className="help">Backfills the chosen primary model across the existing corpus. Documents stay queryable during the rebuild.</div></div>
          <div>
            <Button variant="destructive" icon="repeat" onClick={() => setReEmbedConfirm(true)}>Re-embed 412 documents</Button>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', marginTop: 6, fontFamily: 'var(--ff-mono)' }}>Estimated cost: $1.42 · ~3 minutes</div>
          </div>
        </div>
      </section>

      {/* RETRIEVAL */}
      <section className="settings-section">
        <h2>Retrieval <HelpQ term="hybrid retrieval" /></h2>
        <div className="sec-sub">Which retrievers to run and how to combine their results.</div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Mode</div></div>
          <div className="radio-group">
            {[
              ['dense',  'Dense only',         'Embedding similarity. Misses exact-string and rare-keyword matches.'],
              ['bm25',   'BM25 only',          'Keyword. Misses paraphrases and semantic matches.'],
              ['hybrid', 'Hybrid + RRF (default)', 'Run both in parallel, fuse with Reciprocal Rank Fusion. Best on every benchmark we ship.'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (tweaks.retrievalMode === id ? 'active' : '')} onClick={() => set('retrievalMode', id)}>
                <div className="r"></div>
                <div><div className="rt">{t}</div><div className="rd">{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Top-K fused <HelpQ /></div><div className="help">How many chunks to pull from the fused list before the reranker. More = better recall, slower rerank.</div></div>
          <div className="range-row" style={{ maxWidth: 360 }}>
            <input type="range" min="10" max="100" step="5" value={tweaks.topKFused} onChange={e => set('topKFused', +e.target.value)} />
            <span className="v">{tweaks.topKFused}</span>
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">BM25 weight in RRF <HelpQ /></div><div className="help">0 = dense only, 1 = BM25 only, 0.5 = even fusion.</div></div>
          <div className="range-row" style={{ maxWidth: 360 }}>
            <input type="range" min="0" max="1" step="0.05" value={tweaks.bm25Weight} onChange={e => set('bm25Weight', +e.target.value)} />
            <span className="v">{tweaks.bm25Weight.toFixed(2)}</span>
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Reranker</div><div className="help">Cross-encoder applied after fusion. The single largest quality lever.</div></div>
          <div className="radio-group">
            {[
              ['none',                  'None',                          'Skip rerank. Lowest latency.'],
              ['bge-reranker-v2-m3',    'BGE-reranker-v2-m3 (default)',  'Open weights · free · ~300 ms · +18 pts recall@5 in our evals.'],
              ['cohere-rerank-v3',      'Cohere rerank v3',              '$2 / 1k requests · marginal quality gain vs BGE (within CI) at ~2× cost.'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (tweaks.reranker === id ? 'active' : '')} onClick={() => set('reranker', id)}>
                <div className="r"></div>
                <div><div className="rt">{t}</div><div className="rd">{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Top-K after rerank</div><div className="help">How many chunks survive into the LLM context.</div></div>
          <div className="range-row" style={{ maxWidth: 360 }}>
            <input type="range" min="3" max="20" value={tweaks.topKAfter} onChange={e => set('topKAfter', +e.target.value)} />
            <span className="v">{tweaks.topKAfter}</span>
          </div>
        </div>
      </section>

      {/* QUERY PROCESSING */}
      <section className="settings-section">
        <h2>Query processing</h2>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Query rewriting <HelpQ /></div><div className="help">Rewrites multi-turn questions to be standalone before retrieval. ~$0.0001/query, ~100 ms.</div></div>
          <div className="toggle-row"><ToggleSwitch on={tweaks.queryRewrite} onChange={v => set('queryRewrite', v)} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tweaks.queryRewrite ? 'On' : 'Off'}</span></div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Citation verification <HelpQ /></div><div className="help">Re-reads each cited chunk to confirm the claim is supported. Recommended on.</div></div>
          <div className="toggle-row"><ToggleSwitch on={tweaks.verify} onChange={v => set('verify', v)} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tweaks.verify ? 'On · +150 ms · +$0.0001/query' : 'Off'}</span></div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Max regenerations</div><div className="help">If verification fails, how many times to retry generation with stricter prompting.</div></div>
          <div className="range-row" style={{ maxWidth: 200 }}>
            <input type="range" min="0" max="5" value={tweaks.maxRegen} onChange={e => set('maxRegen', +e.target.value)} />
            <span className="v">{tweaks.maxRegen}×</span>
          </div>
        </div>
      </section>

      {/* CACHING */}
      <section className="settings-section">
        <h2>Caching</h2>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Query result cache</div><div className="help">Caches end-to-end query results. ~40% hit rate on typical workloads.</div></div>
          <div className="toggle-row"><ToggleSwitch on={tweaks.queryCache} onChange={v => set('queryCache', v)} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>TTL {tweaks.cacheTTL}s</span></div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Embedding cache</div><div className="help">Re-uses embeddings for identical chunks. SHA-256 dedup.</div></div>
          <div className="toggle-row"><ToggleSwitch on={tweaks.embedCache} onChange={v => set('embedCache', v)} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tweaks.embedCache ? 'On · recommended' : 'Off'}</span></div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Reranker cache</div><div className="help">Caches rerank scores per (query, chunk) pair.</div></div>
          <div className="toggle-row"><ToggleSwitch on={tweaks.rerankCache} onChange={v => set('rerankCache', v)} /><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{tweaks.rerankCache ? 'On' : 'Off'}</span></div>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 20, marginTop: 24 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>These settings only affect new queries.</span>
        <Button variant="ghost">Reset to defaults</Button>
        <Button variant="primary">Save changes</Button>
      </div>

      <Modal
        open={reEmbedConfirm}
        onClose={() => setReEmbedConfirm(false)}
        title="Re-embed 412 documents?"
        actions={<><Button variant="ghost" onClick={() => setReEmbedConfirm(false)}>Cancel</Button><Button variant="destructive" onClick={() => setReEmbedConfirm(false)}>Start re-embed</Button></>}
      >
        Re-embedding will:
        <ul style={{ marginTop: 8, marginBottom: 12, paddingLeft: 20 }}>
          <li>Generate fresh embeddings for all 38,491 chunks using <strong>OpenAI text-embedding-3-large</strong></li>
          <li>Cost approximately <strong style={{ color: 'var(--text)' }}>$1.42</strong> in API spend</li>
          <li>Take about 3 minutes</li>
        </ul>
        Existing embeddings stay live until the rebuild finishes, so queries don't degrade.
      </Modal>
    </div>
  );
}

// ===========================================================
function SettingsModels() {
  return (
    <div data-screen-label="18d Settings · Models">
      <h1>Models</h1>
      <div className="lede">Which LLMs Atlas uses for generation and verification.</div>

      <section className="settings-section">
        <h2>Generator</h2>
        <div className="sec-sub">The model that drafts answers from retrieved chunks.</div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Default model</div></div>
          <div className="radio-group">
            {[
              ['haiku', 'Claude Haiku 4.5 (default)', '$0.80 / $4 per 1M · ~600 ms median · faithfulness 0.93 on our eval'],
              ['sonnet','Claude Sonnet 4.5',          '$3 / $15 per 1M · ~900 ms · faithfulness 0.95'],
              ['opus',  'Claude Opus 4.7',            '$15 / $75 per 1M · ~1500 ms · faithfulness 0.96 — diminishing returns above Sonnet on most workloads'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (id === 'haiku' ? 'active' : '')}>
                <div className="r"></div><div><div className="rt">{t}</div><div className="rd">{d}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Temperature</div><div className="help">0 = deterministic. Atlas defaults to 0 for reproducibility.</div></div>
          <div className="range-row" style={{ maxWidth: 240 }}><input type="range" min="0" max="1" step="0.05" defaultValue="0" /><span className="v">0.00</span></div>
        </div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Max output tokens</div></div>
          <input className="input" defaultValue="1024" style={{ maxWidth: 120 }} />
        </div>
      </section>

      <section className="settings-section">
        <h2>Verifier</h2>
        <div className="sec-sub">A cheaper model used to check each cited claim against its chunk.</div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Model</div></div>
          <select className="input" defaultValue="haiku" style={{ maxWidth: 320 }}>
            <option value="haiku">Claude Haiku 4.5 (recommended)</option>
            <option value="instruct">Claude Instruct 3</option>
          </select>
        </div>
      </section>

      <section className="settings-section">
        <h2>Embeddings</h2>
        <div className="sec-sub">Configured in <a style={{ color: 'var(--accent)', cursor: 'pointer' }}>Settings → Retrieval</a>.</div>
      </section>
    </div>
  );
}

// ===========================================================
function SettingsBudgets() {
  const [hardStop, setHardStop] = useState('cheaper');
  return (
    <div data-screen-label="20 Settings · Budgets">
      <h1>Budgets</h1>
      <div className="lede">Spending limits, alerts, and what to do when you hit a cap.</div>

      <section className="settings-section">
        <h2>Caps</h2>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Daily budget <HelpQ /></div><div className="help">Per-tenant ceiling for a UTC day. Resets at 00:00 UTC.</div></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)' }}>$</span>
            <input className="input" defaultValue="5.00" style={{ width: 100 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>currently using <strong style={{ color: 'var(--text)' }}>$0.42</strong></span>
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Monthly budget</div><div className="help">Hard cap for the calendar month.</div></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)' }}>$</span>
            <input className="input" defaultValue="50.00" style={{ width: 100 }} />
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Per-user daily limit <HelpQ /></div><div className="help">Optional. Multi-user tenants only.</div></div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--text-muted)' }}>$</span>
            <input className="input" defaultValue="2.00" style={{ width: 100 }} />
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Alerts</h2>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Threshold</div><div className="help">When daily spend reaches this fraction of the cap, send an alert.</div></div>
          <div className="range-row" style={{ maxWidth: 360 }}><input type="range" min="50" max="100" defaultValue="80" /><span className="v">80%</span></div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Email recipients</div><div className="help">Comma-separated.</div></div>
          <input className="input" defaultValue="asad@acme.dev, eng-leads@acme.dev" />
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Slack webhook</div></div>
          <input className="input" defaultValue="https://hooks.slack.com/services/T0…" style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }} />
        </div>
      </section>

      <section className="settings-section">
        <h2>Hard stop behavior <HelpQ /></h2>
        <div className="sec-sub">What Atlas does when the daily budget is reached.</div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Action</div></div>
          <div className="radio-group">
            {[
              ['reject',  'Reject queries (HTTP 429)',  'No further LLM calls. New queries return an error with the budget reset time.'],
              ['cheaper', 'Switch to a cheaper model',  'Downgrade Opus → Sonnet → Haiku transparently. Adds the model used to the response meta.'],
              ['cached',  'Switch to cached-only',      'Only serve cache hits; cache misses return an error.'],
            ].map(([id, t, d]) => (
              <div key={id} className={'radio-opt ' + (hardStop === id ? 'active' : '')} onClick={() => setHardStop(id)}>
                <div className="r"></div><div><div className="rt">{t}</div><div className="rd">{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Save budgets</Button>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsRetrieval, SettingsModels, SettingsBudgets });

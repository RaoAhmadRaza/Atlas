// Atlas — Chat workspace with citations, streaming, and trace drawer trigger

function Chat({ onOpenTrace, density = 'full' }) {
  const [active, setActive] = useState('amd-q4');
  const [draft, setDraft] = useState('');
  const convosLoaded = useFakeLoad(500);
  const empty = useEmptyMode();
  const [messages, setMessages] = useState(empty ? [] : [
    { role: 'user', text: "What was AMD's Q4 2023 revenue and how did it compare to Q4 2022?" },
    {
      role: 'asst',
      parts: [
        'AMD reported Q4 2023 revenue of $6.2 billion ',
        { cite: 1 },
        ', up 10% year-over-year from $5.6 billion in Q4 2022 ',
        { cite: 2 },
        '. The growth was driven primarily by Data Center segment revenue, which more than doubled to $2.3 billion ',
        { cite: 3 },
        ', offsetting declines in the Gaming and Embedded segments.'
      ],
      meta: { latency: '1.1 s', tokIn: 412, tokOut: 218, cost: '$0.0007', model: 'bge-rerank' }
    }
  ]);
  const [streaming, setStreaming] = useState(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, streaming]);

  function send() {
    if (!draft.trim()) return;
    const userMsg = { role: 'user', text: draft.trim() };
    setMessages(m => [...m, userMsg]);
    setDraft('');

    const startTime = performance.now();
    const stages = [
      { name: 'Rewriting',  end: 200 },
      { name: 'Retrieving', end: 500 },
      { name: 'Reranking',  end: 900 },
      { name: 'Generating', end: 2100 },
      { name: 'Verifying',  end: 2400 },
    ];
    const finalCost = 0.0005, finalTokIn = 318, finalTokOut = 156;

    setStreaming({ stageIdx: 0, elapsed: 0, cost: 0, tokOut: 0 });

    const iv = setInterval(() => {
      const t = performance.now() - startTime;
      let stageIdx = stages.findIndex(s => t < s.end);
      if (stageIdx === -1) {
        clearInterval(iv);
        setStreaming(null);
        setMessages(m => [...m, {
          role: 'asst',
          parts: [
            "I'd need to pull the relevant chunks from your corpus to answer that precisely. In this demo the corpus contains a single AMD 10-K — try asking about Q4 2023 revenue, Data Center growth, or operating margin ",
            { cite: 1 },
            '.'
          ],
          meta: { latency: (t / 1000).toFixed(1) + ' s', tokIn: finalTokIn, tokOut: finalTokOut, cost: '$' + finalCost.toFixed(4), model: 'bge-rerank' }
        }]);
        return;
      }
      // smooth ramp of cost & tokens
      const totalDur = stages[stages.length - 1].end;
      const pct = Math.min(1, t / totalDur);
      setStreaming({
        stageIdx,
        elapsed: t / 1000,
        cost: finalCost * pct,
        tokOut: Math.round(finalTokOut * pct),
      });
    }, 60);
  }

  const conversations = empty ? { today: [], yesterday: [], week: [] } : {
    today: [{ id: 'amd-q4', title: 'AMD Q4 2023 analysis', time: '2:14 PM' }],
    yesterday: [
      { id: 'rerank', title: 'Why is rerank cost up?', time: 'Yesterday' },
      { id: 'embed', title: 'Re-embedding 412 docs', time: 'Yesterday' },
    ],
    week: [
      { id: 'fy24', title: 'FY24 plan rollup', time: 'Mon' },
      { id: 'late', title: 'Late chunking ablation', time: 'Mon' },
      { id: 'cohere', title: 'Cohere vs BGE rerank', time: 'Sun' },
    ],
  };

  return (
    <div className="chat-layout">
      <div className="chat-list">
        <div className="chat-list-head">
          <Button variant="primary" size="sm" icon="plus" style={{ width: '100%', justifyContent: 'center' }}>New chat</Button>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input className="input" placeholder="Search conversations" style={{ paddingLeft: 30, fontSize: 13, padding: '7px 10px 7px 30px' }} />
          </div>
        </div>
        <div className="chat-list-items">
          {!convosLoaded && (
            <>
              <div className="chat-list-group">Today</div>
              <div style={{ padding: '8px 10px' }}><SkelLine w={'90%'} h={11} style={{ marginBottom: 6 }} /><SkelLine w={56} h={9} /></div>
              <div className="chat-list-group">Yesterday</div>
              <div style={{ padding: '8px 10px' }}><SkelLine w={'85%'} h={11} style={{ marginBottom: 6 }} /><SkelLine w={56} h={9} /></div>
              <div style={{ padding: '8px 10px' }}><SkelLine w={'70%'} h={11} style={{ marginBottom: 6 }} /><SkelLine w={56} h={9} /></div>
              <div className="chat-list-group">This week</div>
              <div style={{ padding: '8px 10px' }}><SkelLine w={'80%'} h={11} style={{ marginBottom: 6 }} /><SkelLine w={40} h={9} /></div>
              <div style={{ padding: '8px 10px' }}><SkelLine w={'92%'} h={11} style={{ marginBottom: 6 }} /><SkelLine w={40} h={9} /></div>
            </>
          )}
          {convosLoaded && [['Today', conversations.today], ['Yesterday', conversations.yesterday], ['This week', conversations.week]].map(([label, items]) => (
            <React.Fragment key={label}>
              <div className="chat-list-group">{label}</div>
              {items.map(c => (
                <div key={c.id} className={'chat-list-item ' + (active === c.id ? 'active' : '')} onClick={() => setActive(c.id)}>
                  {c.title}
                  <span className="time">{c.time}</span>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="chat-pane">
        <div className="chat-messages" ref={scrollerRef}>
          {messages.length === 0 && !streaming && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--ff-display)', fontSize: 32, fontWeight: 400, letterSpacing: '-0.02em', marginBottom: 8 }}>Ask anything.</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32, maxWidth: 480, lineHeight: 1.55 }}>
                Atlas answers with citations. Click any <Cite n="n" /> chip to see the exact source.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 520, width: '100%' }}>
                {[
                  "What was AMD's Q4 2023 revenue and how did it compare to Q4 2022?",
                  "Summarize the key risk factors in the 2023 10-K.",
                  "What did management say about the Data Center outlook?",
                ].map(q => (
                  <button key={q} onClick={() => { setDraft(q); }} style={{ textAlign: 'left', padding: '12px 16px', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elev)', cursor: 'pointer', fontSize: 14, color: 'var(--text)', fontFamily: 'var(--ff-ui)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon name="message-square" size={14} style={{ color: 'var(--text-subtle)' }} />
                    {q}
                    <Icon name="arrow-right" size={14} style={{ marginLeft: 'auto', color: 'var(--text-subtle)' }} />
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>
                Tip: ⌘+Enter to send · Enter for newline
              </div>
            </div>
          )}
          {messages.map((m, i) => m.role === 'user' ? (
            <div key={i} className="msg-user"><div className="bubble">{m.text}</div></div>
          ) : (
            <div key={i} className="msg-asst">
              <div className="text">
                {m.parts.map((p, j) => typeof p === 'string' ? <span key={j}>{p}</span> : <Cite key={j} n={p.cite} onClick={() => onOpenTrace(p.cite)} />)}
              </div>
              <div className="meta">
                <span>{m.meta.latency}</span>
                {density === 'full' && <><span className="sep">·</span>
                <span>{m.meta.tokIn} tok in / {m.meta.tokOut} tok out</span><span className="sep">·</span>
                <span>{m.meta.cost}</span><span className="sep">·</span>
                <span>{m.meta.model}</span></>}
                {density === 'minimal' && <><span className="sep">·</span><span>{m.meta.cost}</span></>}
                <a href="#" onClick={(e) => { e.preventDefault(); onOpenTrace(); }}>view trace →</a>
              </div>
            </div>
          ))}
          {streaming && (
            <div className="streaming-row">
              <div className="streaming-status">
                <span className="live-dot"></span>
                <span className="stage">{['Rewriting','Retrieving','Reranking','Generating','Verifying'][streaming.stageIdx]}</span>
                <span className="sep">·</span>
                <span className="mono">{streaming.elapsed.toFixed(1)}s</span>
                <span className="sep">·</span>
                <span className="mono">${streaming.cost.toFixed(4)}</span>
                <span className="sep">·</span>
                <span className="mono">{streaming.tokOut} tok</span>
              </div>
              <div className="streaming-stages">
                {['Rewriting','Retrieving','Reranking','Generating','Verifying'].map((s, i) => (
                  <span key={s} className={'stage-pill ' + (i < streaming.stageIdx ? 'done' : i === streaming.stageIdx ? 'active' : '')}>
                    {i < streaming.stageIdx && <Icon name="check" size={10} />}
                    {i === streaming.stageIdx && <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.2 }}></span>}
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="composer">
          <div className="composer-box">
            <textarea
              className="composer-input"
              placeholder="Ask a question about your documents…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
              rows={2}
            />
            <div className="composer-foot">
              <span className="ghost-pick"><Icon name="cpu" size={12} />Claude Haiku 4.5</span>
              <span className="ghost-pick"><Icon name="paperclip" size={12} />Attach</span>
              <span className="ghost-pick"><Icon name="sliders-horizontal" size={12} />+rerank</span>
              <div className="send">
                <Button variant="primary" size="sm" onClick={send} iconRight="arrow-up">Send <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }}>⌘↵</span></Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Chat });

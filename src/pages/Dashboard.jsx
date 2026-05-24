// Atlas — Dashboard

function Dashboard({ onNavigate }) {
  const loaded = useFakeLoad(650);
  const empty = useEmptyMode();

  if (empty) {
    return (
      <div className="page" data-screen-label="07 Dashboard (empty)">
        <div className="page-head">
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Welcome to Atlas.</div>
            <h1>Get started</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Pill variant="accent">Pro · trial</Pill>
            <Pill>acme-prod</Pill>
          </div>
        </div>
        <EmptyState
          icon="upload-cloud"
          title="No documents yet."
          body="Atlas needs at least one document to retrieve from. Upload a PDF, DOCX, Markdown, or HTML file — or load a sample corpus to explore the product."
          primaryLabel="Upload documents"
          primaryIcon="upload"
          onPrimary={() => onNavigate('documents')}
          secondaryLabel="Use sample corpus"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Good afternoon, Asad.</div>
          <h1>Dashboard</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Pill variant="accent">Pro</Pill>
          <Pill>acme-prod</Pill>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {!loaded ? (
          <>
            {[0,1,2,3].map(i => (
              <div key={i} className="kpi">
                <SkelLine w={120} h={10} style={{ marginBottom: 12 }} />
                <SkelLine w={80} h={28} style={{ marginBottom: 8 }} />
                <SkelLine w={140} h={10} />
              </div>
            ))}
          </>
        ) : (
          <>
            <KPI label="QUERIES THIS WEEK" value="2,847" delta="+12% vs last week" sparkline={[14,22,18,30,28,36,42,38,52,48,60,72,68,84]} />
            <KPI label="DOCUMENTS" value="412" ci="+8 this week" />
            <KPI label="FAITHFULNESS" value="0.93" delta="+0.02 vs last week" ci="target ≥ 0.90" />
            <KPI label="SPEND" value="$18.42" ci="of $50.00 monthly budget" />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card title="Recent activity" actions={<a href="#" style={{ fontSize: 12 }}>View all</a>}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {!loaded && [0,1,2,3,4].map(i => (
              <div key={'s' + i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <SkelLine w={14} h={14} style={{ borderRadius: '50%', marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <SkelLine w={'70%'} h={11} style={{ marginBottom: 6 }} />
                  <SkelLine w={'40%'} h={10} />
                </div>
                <SkelLine w={36} h={10} />
              </div>
            ))}
            {loaded && [
              { icon: 'file-text', who: 'You', action: 'uploaded', obj: 'AMD-Q4-2023-10K.pdf', t: '12m ago', sub: '412 chunks · bge-large' },
              { icon: 'bar-chart-3', who: 'cron', action: 'completed', obj: 'nightly eval · run 2026-05-20', t: '2h ago', sub: '+0.184 recall@5 vs baseline', accent: true },
              { icon: 'settings', who: 'You', action: 'changed', obj: 'retrieval.reranker → bge-reranker-v2-m3', t: '5h ago' },
              { icon: 'user-plus', who: 'You', action: 'invited', obj: 'jen@acme.dev as Member', t: '1d ago' },
              { icon: 'file-text', who: 'jen', action: 'uploaded', obj: 'fy2024-plans.md', t: '2d ago', sub: '38 chunks' },
            ].map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <Icon name={a.icon} size={14} style={{ color: a.accent ? 'var(--accent)' : 'var(--text-subtle)', marginTop: 3 }} />
                <div style={{ flex: 1, fontSize: 13 }}>
                  <span style={{ color: 'var(--text)' }}>{a.who}</span>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>{a.action}</span>{' '}
                  <span style={{ color: 'var(--text)', fontFamily: a.obj.includes('.') || a.obj.includes('→') ? 'var(--ff-mono)' : undefined, fontSize: a.obj.includes('.') || a.obj.includes('→') ? 12 : 13 }}>{a.obj}</span>
                  {a.sub && <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 2, fontFamily: 'var(--ff-mono)' }}>{a.sub}</div>}
                </div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{a.t}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick actions">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { icon: 'message-square', label: 'Start a new chat', sub: 'Ask a question with citations', route: 'chat' },
              { icon: 'upload', label: 'Upload documents', sub: 'PDF, DOCX, MD, HTML — 50 MB max', route: 'documents' },
              { icon: 'bar-chart-3', label: 'Run an eval', sub: '1,000-question smoke or full', route: 'evals' },
              { icon: 'key', label: 'Manage API keys', sub: 'Programmatic access', route: 'api-keys' },
            ].map((q, i) => (
              <button key={i} onClick={() => onNavigate(q.route)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px', border: 'none', borderBottom: i < 3 ? '1px solid var(--border)' : 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'inherit', fontFamily: 'inherit' }}>
                <Icon name={q.icon} size={16} style={{ color: 'var(--text-muted)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{q.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.sub}</div>
                </div>
                <Icon name="arrow-right" size={14} style={{ color: 'var(--text-subtle)' }} />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ padding: '14px 18px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', gap: 20, fontSize: 12, fontFamily: 'var(--ff-mono)', flexWrap: 'wrap', rowGap: 8 }}>
        <span style={{ color: 'var(--text-muted)', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 }}>SYSTEM STATUS</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="live-dot success"></span>Ingestion</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="live-dot success"></span>Retrieval</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="live-dot warn"></span>Reranker · fallback active</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span className="live-dot success"></span>Generation</span>
        <a href="#" style={{ marginLeft: 'auto', fontSize: 12 }}>Details →</a>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });

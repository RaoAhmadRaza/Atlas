// Atlas — root application: routing, tweaks, theme

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme":          "light",
  "infoDensity":    "full",
  "showSysStatus":  true,
  "accent":         "terracotta",
  "emptyData":      false
}/*EDITMODE-END*/;

// Surfaces grouped: marketing routes render full-page; app routes mount in AppShell.
const MARKETING_ROUTES   = new Set(['home', 'eval-public', 'docs', 'pricing', 'login', 'signup', 'onboarding', '404', '500']);
const SETTINGS_ROUTES    = new Set(['settings', 'settings.profile', 'settings.tenant', 'settings.retrieval', 'settings.models', 'settings.budgets', 'settings.members', 'settings.billing', 'settings.danger']);
const APP_ROUTES         = new Set(['dashboard', 'chat', 'documents', 'document-detail', 'evals', 'eval-run-detail', 'traces', 'usage', 'api-keys', 'mcp', 'help']);

const CRUMBS = {
  dashboard:       ['acme-prod', 'Dashboard'],
  chat:            ['acme-prod', 'Chat', 'AMD Q4 2023 analysis'],
  documents:       ['acme-prod', 'Documents'],
  'document-detail':['acme-prod', 'Documents', 'AMD-Q4-2023-10K.pdf'],
  evals:           ['acme-prod', 'Evals'],
  'eval-run-detail':['acme-prod', 'Evals', 'Run 2026-05-19'],
  traces:          ['acme-prod', 'Traces'],
  usage:           ['acme-prod', 'Usage & cost'],
  'api-keys':      ['acme-prod', 'API keys'],
  mcp:             ['acme-prod', 'MCP'],
  help:            ['acme-prod', 'Help & glossary'],
  'settings.profile':   ['acme-prod', 'Settings', 'Profile'],
  'settings.tenant':    ['acme-prod', 'Settings', 'Workspace'],
  'settings.retrieval': ['acme-prod', 'Settings', 'Retrieval'],
  'settings.models':    ['acme-prod', 'Settings', 'Models'],
  'settings.budgets':   ['acme-prod', 'Settings', 'Budgets'],
  'settings.members':   ['acme-prod', 'Settings', 'Members'],
  'settings.billing':   ['acme-prod', 'Settings', 'Billing'],
  'settings.danger':    ['acme-prod', 'Settings', 'Danger zone'],
};

function readRouteFromHash() {
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  return h || 'home';
}

function writeRouteToHash(r) {
  if (readRouteFromHash() !== r) window.location.hash = '#/' + r;
}

function App() {
  const [route, setRoute] = useState(readRouteFromHash());
  const [tweaks, setTweaks] = useState(TWEAKS_DEFAULTS);
  const [traceOpen, setTraceOpen] = useState(false);
  const [traceCite, setTraceCite] = useState(null);
  const [toast, setToast] = useState(null);
  const [cmdK, setCmdK] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // hash routing
  useEffect(() => {
    const onHashChange = () => setRoute(readRouteFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // theme
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme;
  }, [tweaks.theme]);

  // accent palette swap
  useEffect(() => {
    const root = document.documentElement;
    if (tweaks.accent === 'indigo') {
      root.style.setProperty('--accent',      '#4F46E5');
      root.style.setProperty('--accent-hover','#3E37BB');
      root.style.setProperty('--accent-bg',   tweaks.theme === 'dark' ? '#171530' : '#EEEEFD');
    } else if (tweaks.accent === 'forest') {
      root.style.setProperty('--accent',      '#2F7D4E');
      root.style.setProperty('--accent-hover','#256040');
      root.style.setProperty('--accent-bg',   tweaks.theme === 'dark' ? '#0F1F16' : '#E6F0EA');
    } else if (tweaks.accent === 'ink') {
      root.style.setProperty('--accent',      '#1A1A19');
      root.style.setProperty('--accent-hover','#000000');
      root.style.setProperty('--accent-bg',   tweaks.theme === 'dark' ? '#262522' : '#F2F0EB');
    } else {
      // terracotta — clear inline overrides
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
      root.style.removeProperty('--accent-bg');
    }
  }, [tweaks.accent, tweaks.theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [route, traceOpen, cmdK]);

  // info density (controls chat meta visibility via body data attr)
  useEffect(() => {
    document.body.dataset.density = tweaks.infoDensity;
  }, [tweaks.infoDensity]);

  // sys status
  useEffect(() => {
    document.body.dataset.sysStatus = String(tweaks.showSysStatus);
  }, [tweaks.showSysStatus]);

  // empty-mode flag, read by individual page components
  useEffect(() => {
    document.body.dataset.empty = String(tweaks.emptyData);
  }, [tweaks.emptyData]);

  // cmd-k
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdK(true); }
      if (e.key === 'Escape') { setCmdK(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function setTweak(key, value) {
    let edits;
    if (typeof key === 'object') { edits = key; }
    else { edits = { [key]: value }; }
    setTweaks(t => ({ ...t, ...edits }));
    try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits }, '*'); } catch (e) {}
  }

  function nav(to) {
    writeRouteToHash(to);
    setRoute(to);
    setTraceOpen(false);
  }

  function showToast(message, sub, kind = 'success') {
    setToast({ message, sub, kind });
    setTimeout(() => setToast(null), 4500);
  }

  const toggleTheme = () => setTweak('theme', tweaks.theme === 'dark' ? 'light' : 'dark');

  // Decide which surface to render
  if (MARKETING_ROUTES.has(route)) {
    return (
      <>
        <MarketingSurface route={route} onNav={nav} theme={tweaks.theme} toggleTheme={toggleTheme} />
        <AtlasTweaks tweaks={tweaks} setTweak={setTweak} />
      </>
    );
  }

  // App shell
  const settingsActive = route.startsWith('settings') ? (route.split('.')[1] || 'profile') : null;
  const crumbs = CRUMBS[route] || CRUMBS[settingsActive ? 'settings.' + settingsActive : route] || ['acme-prod'];

  return (
    <div className="app" data-screen-label={route}>
      <Sidebar route={route} onNavigate={nav} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        <Topbar
          crumbs={crumbs}
          theme={tweaks.theme}
          onToggleTheme={toggleTheme}
          onMenuClick={() => setSidebarOpen(true)}
          onSearch={() => setCmdK(true)}
        />

        {route === 'dashboard'        && <Dashboard onNavigate={nav} />}
        {route === 'chat'             && <Chat onOpenTrace={(cite) => { setTraceCite(cite || null); setTraceOpen(true); }} density={tweaks.infoDensity} />}
        {route === 'documents'        && <Documents onOpenDoc={() => nav('document-detail')} />}
        {route === 'document-detail'  && <DocumentDetail onNavBack={() => nav('documents')} />}
        {route === 'evals'            && <EvalsDashboard onOpenRun={() => nav('eval-run-detail')} />}
        {route === 'eval-run-detail'  && <EvalReport />}
        {route === 'traces'           && <Traces onOpenTrace={() => { setTraceCite(null); setTraceOpen(true); }} />}
        {route === 'usage'            && <Usage />}
        {route === 'api-keys'         && <ApiKeys />}
        {route === 'mcp'              && <McpConnection />}
        {route === 'help'             && <HelpGlossary />}

        {settingsActive && (
          <SettingsShell active={settingsActive} onChange={(id) => nav('settings.' + id)}>
            {settingsActive === 'profile'   && <SettingsProfile />}
            {settingsActive === 'tenant'    && <SettingsTenant />}
            {settingsActive === 'retrieval' && <SettingsRetrieval />}
            {settingsActive === 'models'    && <SettingsModels />}
            {settingsActive === 'budgets'   && <SettingsBudgets />}
            {settingsActive === 'members'   && <SettingsMembers />}
            {settingsActive === 'billing'   && <SettingsBilling />}
            {settingsActive === 'danger'    && <SettingsDanger />}
          </SettingsShell>
        )}

        {/* System status bar — shared across app surfaces */}
        {tweaks.showSysStatus && (route === 'dashboard' || route === 'traces' || route === 'evals') && null /* dashboard already has its own */}
      </div>

      {traceOpen && <TraceDrawer onClose={() => { setTraceOpen(false); setTraceCite(null); }} highlightCite={traceCite} />}
      <div className="toast-stack">
        {toast && <Toast kind={toast.kind} message={toast.message} sub={toast.sub} onDismiss={() => setToast(null)} />}
      </div>
      {cmdK && <CommandPalette onNav={nav} onClose={() => setCmdK(false)} />}
      <AtlasTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

// ============================================================
// Marketing surface router
// ============================================================
function MarketingSurface({ route, onNav, theme, toggleTheme }) {
  if (route === 'home')         return <MarketingHome onNav={onNav} theme={theme} onToggleTheme={toggleTheme} />;
  if (route === 'eval-public')  return <PublicEvalReport onNav={onNav} theme={theme} onToggleTheme={toggleTheme} />;
  if (route === 'docs')         return <Docs onNav={onNav} theme={theme} onToggleTheme={toggleTheme} />;
  if (route === 'pricing')      return <Pricing onNav={onNav} theme={theme} onToggleTheme={toggleTheme} />;
  if (route === 'login')        return <Login onNav={onNav} />;
  if (route === 'signup')       return <Signup onNav={onNav} />;
  if (route === 'onboarding')   return <Onboarding onNav={onNav} />;
  if (route === '500')          return <NotFound onNav={onNav} kind="500" />;
  return <NotFound onNav={onNav} kind="404" />;
}

// ============================================================
// Command palette (⌘K)
// ============================================================
function CommandPalette({ onNav, onClose }) {
  const [q, setQ] = useState('');
  const items = [
    { id: 'dashboard',        kind: 'page',  label: 'Dashboard' },
    { id: 'chat',             kind: 'page',  label: 'Chat' },
    { id: 'documents',        kind: 'page',  label: 'Documents' },
    { id: 'evals',            kind: 'page',  label: 'Evals' },
    { id: 'traces',           kind: 'page',  label: 'Traces' },
    { id: 'usage',            kind: 'page',  label: 'Usage & cost' },
    { id: 'api-keys',         kind: 'page',  label: 'API keys' },
    { id: 'mcp',              kind: 'page',  label: 'MCP server' },
    { id: 'settings.profile', kind: 'page',  label: 'Settings · Profile' },
    { id: 'settings.retrieval',kind: 'page', label: 'Settings · Retrieval' },
    { id: 'settings.budgets', kind: 'page',  label: 'Settings · Budgets' },
    { id: 'settings.members', kind: 'page',  label: 'Settings · Members' },
    { id: 'help',             kind: 'page',  label: 'Help & glossary' },
    { id: 'home',             kind: 'page',  label: 'Marketing home (/) ↗' },
    { id: 'eval-public',      kind: 'page',  label: 'Public eval report (/eval) ↗' },
    { id: 'docs',             kind: 'page',  label: 'Docs (/docs) ↗' },
  ];
  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="modal-scrim" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '15vh' }}>
      <div className="modal" style={{ maxWidth: 560, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <Icon name="search" size={14} style={{ color: 'var(--text-subtle)' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Jump to anything…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--ff-ui)', fontSize: 14, color: 'var(--text)' }} />
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 4 }}>esc</span>
        </div>
        <div style={{ maxHeight: '50vh', overflow: 'auto', padding: 6 }}>
          {filtered.length === 0 && <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No matches.</div>}
          {filtered.map(it => (
            <div key={it.id} onClick={() => { onNav(it.id); onClose(); }} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }} onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-sunken)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Icon name="arrow-right" size={12} style={{ color: 'var(--text-subtle)' }} />
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{it.label}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>{it.kind}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)', display: 'flex', gap: 16 }}>
          <span><span style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 3, marginRight: 4 }}>↵</span>open</span>
          <span><span style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 3, marginRight: 4 }}>esc</span>close</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Tweaks panel (uses starter)
// ============================================================
function AtlasTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Atlas tweaks">
      <TweakSection label="Theme">
        <TweakRadio label="Mode" value={tweaks.theme} onChange={v => setTweak('theme', v)} options={[
          { value: 'light', label: 'Light' },
          { value: 'dark',  label: 'Dark' },
        ]} />
      </TweakSection>

      <TweakSection label="Accent">
        <TweakColor
          label="Color"
          value={tweaks.accent}
          onChange={v => setTweak('accent', v)}
          options={['#D14B27', '#4F46E5', '#2F7D4E', '#1A1A19'].map((c, i) => ({
            value: ['terracotta','indigo','forest','ink'][i],
            color: c,
            label: ['Terracotta','Indigo','Forest','Ink'][i],
          }))}
        />
      </TweakSection>

      <TweakSection label="Chat meta row density">
        <TweakRadio label="Density" value={tweaks.infoDensity} onChange={v => setTweak('infoDensity', v)} options={[
          { value: 'full',    label: 'Full' },
          { value: 'minimal', label: 'Minimal' },
        ]} />
      </TweakSection>

      <TweakSection label="System status">
        <TweakToggle label="Show status bar" value={tweaks.showSysStatus} onChange={v => setTweak('showSysStatus', v)} />
      </TweakSection>

      <TweakSection label="Empty states preview">
        <TweakToggle label="Show empty data" value={tweaks.emptyData} onChange={v => setTweak('emptyData', v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: 'var(--bg)', fontFamily: 'var(--ff-ui)' }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Something went wrong</div>
          <pre style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--bg-sunken)', padding: '12px 16px', borderRadius: 8, maxWidth: 600, overflow: 'auto' }}>{this.state.error.message}</pre>
          <button style={{ fontSize: 13, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', color: 'var(--text)' }} onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

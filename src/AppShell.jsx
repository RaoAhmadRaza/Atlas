// Atlas — AppShell (Sidebar + Topbar)

function Sidebar({ route, onNavigate, open, onClose }) {
  const primary = [
    { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { id: 'chat',      label: 'Chat',      icon: 'message-square' },
    { id: 'documents', label: 'Documents', icon: 'file-text' },
    { id: 'evals',     label: 'Evals',     icon: 'bar-chart-3' },
    { id: 'traces',    label: 'Traces',    icon: 'activity' },
    { id: 'usage',     label: 'Usage',     icon: 'dollar-sign' },
  ];
  const secondary = [
    { id: 'api-keys', label: 'API keys', icon: 'key' },
    { id: 'mcp',      label: 'MCP',      icon: 'plug' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  // matches dashboard / documents-list-or-detail / evals-list-or-run, etc.
  const groupOf = r =>
    r === 'document-detail' ? 'documents' :
    r === 'eval-run-detail' ? 'evals' :
    r.startsWith('settings') ? 'settings' :
    r;

  const activeGroup = groupOf(route);

  const navRef = useRef(null);
  const [pill, setPill] = useState({ top: 0, height: 0, visible: false });

  useEffect(() => {
    if (!navRef.current) return;
    const el = navRef.current.querySelector('.sidebar-item.active');
    if (!el) { setPill(p => ({ ...p, visible: false })); return; }
    const nr = navRef.current.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setPill({ top: er.top - nr.top + navRef.current.scrollTop, height: er.height, visible: true });
  }, [activeGroup, open]);

  return (
    <>
      {open && <div className="drawer-scrim" style={{ zIndex: 70 }} onClick={onClose}></div>}
      <aside className={'sidebar ' + (open ? 'mobile-open' : '')}>
        <div className="sidebar-tenant" onClick={() => alert('Tenant switcher (demo)')}>
          <div style={{ width: 22, height: 22, borderRadius: 4, background: 'var(--bg-sunken)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--ff-display)', fontSize: 14, fontWeight: 500, lineHeight: 1 }}>a<span style={{ color: 'var(--accent)' }}>.</span></span>
          </div>
          <div className="t-name">acme-prod</div>
          <Pill variant="accent" style={{ fontSize: 10, padding: '1px 6px' }}>Pro</Pill>
          <Icon name="chevrons-up-down" size={12} />
        </div>

        <nav className="sidebar-nav" ref={navRef}>
          {pill.visible && (
            <span className="sidebar-active-pill" style={{ top: pill.top, height: pill.height }}></span>
          )}
          <div className="group-label">Workspace</div>
          {primary.map(item => (
            <button key={item.id} className={'sidebar-item ' + (activeGroup === item.id ? 'active' : '')} onClick={() => onNavigate(item.id)}>
              <Icon name={item.icon} size={16} className="icon" />
              <span>{item.label}</span>
            </button>
          ))}
          <div className="group-label">Account</div>
          {secondary.map(item => (
            <button key={item.id} className={'sidebar-item ' + (activeGroup === item.id ? 'active' : '')} onClick={() => onNavigate(item.id)}>
              <Icon name={item.icon} size={16} className="icon" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">AR</div>
          <div style={{ flex: 1, fontSize: 12, minWidth: 0 }}>
            <div style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Asad Raza</div>
            <div style={{ color: 'var(--text-subtle)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>asad@acme.dev</div>
          </div>
          <button className="icon-btn" onClick={() => onNavigate('help')} title="Help"><Icon name="circle-help" size={14} /></button>
        </div>
      </aside>
    </>
  );
}

function Topbar({ crumbs = [], theme, onToggleTheme, onMenuClick, onSearch }) {
  return (
    <header className="topbar">
      <button className="mobile-menu-btn" onClick={onMenuClick} title="Menu"><Icon name="menu" size={16} /></button>

      <div className="breadcrumb">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className="crumb">{c}</span>
            {i < crumbs.length - 1 && <span className="sep">/</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="topbar-search" onClick={onSearch}>
        <Icon name="search" size={14} />
        <span className="topbar-search-text">Search documents, evals, traces…</span>
        <span className="kbd">⌘K</span>
      </div>

      <div className="topbar-right">
        <button className="cost-meter" title="Cost meter — click for usage breakdown">
          <span className="live-dot" style={{ marginRight: 6 }}></span>
          $0.0007 <span style={{ color: 'var(--text-subtle)' }}>·</span> $0.42 today
        </button>
        <button className="icon-btn" title="Notifications"><Icon name="bell" size={16} /></button>
        <button className="icon-btn" onClick={onToggleTheme} title="Toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar });

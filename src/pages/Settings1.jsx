// Atlas — Settings shell + Profile, Tenant, Members, Billing, Danger

const SETTINGS_NAV = [
  { id: 'profile',   label: 'Profile',     group: 'You' },
  { id: 'tenant',    label: 'Workspace',   group: 'Workspace' },
  { id: 'retrieval', label: 'Retrieval',   group: 'Workspace' },
  { id: 'models',    label: 'Models',      group: 'Workspace' },
  { id: 'budgets',   label: 'Budgets',     group: 'Workspace' },
  { id: 'members',   label: 'Members',     group: 'Workspace' },
  { id: 'billing',   label: 'Billing',     group: 'Workspace' },
  { id: 'danger',    label: 'Danger zone', group: 'Workspace' },
];

function SettingsShell({ active, onChange, children }) {
  const groups = SETTINGS_NAV.reduce((acc, n) => { (acc[n.group] ||= []).push(n); return acc; }, {});
  return (
    <div className="settings-shell" data-screen-label={'17-21 Settings'}>
      <aside className="settings-side">
        {Object.keys(groups).map(g => (
          <div key={g}>
            <div className="group">{g}</div>
            {groups[g].map(n => (
              <a key={n.id} className={active === n.id ? 'active' : ''} onClick={() => onChange(n.id)}>{n.label}</a>
            ))}
          </div>
        ))}
      </aside>
      <main className="settings-content">{children}</main>
    </div>
  );
}

// ===========================================================
function SettingsProfile() {
  const [twofa, setTwofa] = useState(true);
  return (
    <div data-screen-label="17 Settings · Profile">
      <h1>Profile</h1>
      <div className="lede">Your account · email is your login · these settings apply across every workspace.</div>

      <section className="settings-section">
        <h2>Identity</h2>
        <div className="sec-sub">Shown on shared eval reports and in the recent activity feed.</div>

        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Avatar</div><div className="help">Drag an image or click to upload. PNG / JPG up to 1 MB.</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar" style={{ width: 50, height: 50, fontSize: 16 }}>AR</div>
            <Button variant="secondary" size="sm">Upload</Button>
            <Button variant="ghost" size="sm">Remove</Button>
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Name</div><div className="help">Used in greetings and the recent activity feed.</div></div>
          <input className="input" defaultValue="Asad Raza" />
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Email</div><div className="help">Changing this requires re-verification — you'll be signed out everywhere else.</div></div>
          <input className="input" defaultValue="asad@acme.dev" />
        </div>
      </section>

      <section className="settings-section">
        <h2>Password</h2>
        <div className="sec-sub">Use a password manager. Atlas doesn't enforce rotation.</div>
        <div className="form-row"><div className="lbl-block"><div className="lbl">Current password</div></div><input className="input" type="password" /></div>
        <div className="form-row"><div className="lbl-block"><div className="lbl">New password</div></div><input className="input" type="password" /></div>
        <div className="form-row"><div className="lbl-block"><div className="lbl">Confirm new password</div></div><input className="input" type="password" /></div>
        <Button variant="primary">Update password</Button>
      </section>

      <section className="settings-section">
        <h2>Two-factor authentication</h2>
        <div className="form-row">
          <div className="lbl-block">
            <div className="lbl">2FA via authenticator app</div>
            <div className="help">Required for owners of Pro and Enterprise workspaces.</div>
          </div>
          <div className="toggle-row">
            <ToggleSwitch on={twofa} onChange={setTwofa} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{twofa ? 'On · enrolled' : 'Off'}</span>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Active sessions</h2>
        <div className="sec-sub">Sign out of any device you don't recognize.</div>
        <div className="tbl-scroll">
        <table className="doc-table" style={{ marginBottom: 12 }}>
          <thead><tr><th>DEVICE</th><th>LOCATION</th><th>LAST ACTIVE</th><th></th></tr></thead>
          <tbody>
            <tr><td><strong>This device · MacBook Pro</strong></td><td>San Francisco, US</td><td>now</td><td><Pill variant="accent">current</Pill></td></tr>
            <tr><td>iPhone · Safari</td><td>San Francisco, US</td><td>3h ago</td><td><Button variant="ghost" size="sm">Sign out</Button></td></tr>
            <tr><td>Linux · Chrome</td><td>Berlin, DE · via Tailscale</td><td>2d ago</td><td><Button variant="ghost" size="sm">Sign out</Button></td></tr>
          </tbody>
        </table>
        </div>
        <Button variant="destructive">Sign out of all other sessions</Button>
      </section>
    </div>
  );
}

// ===========================================================
function SettingsTenant() {
  return (
    <div data-screen-label="18 Settings · Workspace">
      <h1>Workspace</h1>
      <div className="lede">Workspace-level settings · applies to everyone in <span style={{ fontFamily: 'var(--ff-mono)' }}>acme-prod</span></div>

      <section className="settings-section">
        <h2>General</h2>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Workspace name</div><div className="help">Shown in the sidebar and on shared eval reports.</div></div>
          <input className="input" defaultValue="Acme Production" />
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Slug</div><div className="help">Used in API URLs and MCP config. Changing it would break every API key. Contact support.</div></div>
          <input className="input" defaultValue="acme-prod" disabled />
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Plan</div><div className="help">Current usage: 412 docs · 2,847 queries this month.</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill variant="accent">Pro</Pill>
            <a style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>Upgrade →</a>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Locale</h2>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Default timezone</div></div>
          <select className="input"><option>America/Los_Angeles (UTC−7)</option><option>UTC</option><option>Europe/London</option></select>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Default locale</div></div>
          <select className="input"><option>en-US</option><option>en-GB</option><option>de-DE</option></select>
        </div>
      </section>

      <section className="settings-section">
        <h2>Branding</h2>
        <div className="sec-sub">Used on shared eval reports and the workspace login page if SSO is enabled.</div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Logo</div><div className="help">SVG preferred. Falls back to your workspace initials.</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 56, height: 56, border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-display)', fontSize: 18 }}>A</div>
            <Button variant="secondary" size="sm">Upload</Button>
          </div>
        </div>
        <div className="form-row">
          <div className="lbl-block"><div className="lbl">Branding mode</div><div className="help">For shared eval reports embedded on third-party sites.</div></div>
          <div className="radio-group">
            {[['auto', 'Match viewer', 'Follow the viewer\'s system preference.'],
              ['light', 'Always light', null],
              ['dark', 'Always dark', null]].map(([id, t, d]) => (
              <label key={id} className={'radio-opt ' + (id === 'auto' ? 'active' : '')}><div className="r"></div><div><div className="rt">{t}</div>{d && <div className="rd">{d}</div>}</div></label>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Save changes</Button>
      </div>
    </div>
  );
}

// ===========================================================
function SettingsMembers() {
  const [invite, setInvite] = useState(false);
  const empty = useEmptyMode();
  const members = empty ? [
    { name: 'Asad Raza', email: 'asad@acme.dev', role: 'Owner', active: 'now', initials: 'AR' },
  ] : [
    { name: 'Asad Raza',     email: 'asad@acme.dev',  role: 'Owner',   active: 'now',    initials: 'AR' },
    { name: 'Jen Park',      email: 'jen@acme.dev',   role: 'Admin',   active: '2h ago', initials: 'JP' },
    { name: 'Marcus Hall',   email: 'marcus@acme.dev',role: 'Member',  active: '1d ago', initials: 'MH' },
    { name: 'Priya Singh',   email: 'priya@acme.dev', role: 'Member',  active: '3d ago', initials: 'PS' },
    { name: 'inviteonly@acme.dev', email: '', role: 'Member', active: 'pending invite', initials: '·', pending: true },
  ];

  return (
    <div data-screen-label="21 Settings · Members">
      <h1>Members</h1>
      <div className="lede">5 of unlimited seats used · invite by email · changes are logged in the audit trail.</div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button variant="primary" icon="user-plus" onClick={() => setInvite(true)}>Invite member</Button>
      </div>

      <div className="tbl-scroll">
        <table className="doc-table" style={{ marginBottom: 24 }}>
        <thead><tr><th></th><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>LAST ACTIVE</th><th></th></tr></thead>
        <tbody>
          {members.map(m => (
            <tr key={m.email + m.name}>
              <td style={{ width: 36 }}><div className="avatar">{m.initials}</div></td>
              <td style={{ color: 'var(--text)', fontWeight: 500 }}>{m.pending ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{m.name}</span> : m.name}</td>
              <td style={{ color: 'var(--text-muted)' }}>{m.email}</td>
              <td><Pill variant={m.role === 'Owner' ? 'accent' : ''}>{m.role}</Pill></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{m.active}</td>
              <td><button className="icon-btn" style={{ width: 22, height: 22 }} disabled={m.role === 'Owner'}><Icon name="more-horizontal" size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>

      <Card padding={20}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 500 }}>Roles</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 13 }}>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Owner</div>
            <div style={{ color: 'var(--text-muted)' }}>Single per workspace. Manages billing, transfers ownership, deletes the workspace.</div>
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Admin</div>
            <div style={{ color: 'var(--text-muted)' }}>Full access except billing. Can invite members, manage API keys, configure retrieval.</div>
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>Member</div>
            <div style={{ color: 'var(--text-muted)' }}>Can chat, upload, view evals. Cannot manage billing or invite others.</div>
          </div>
        </div>
      </Card>

      <Modal
        open={invite}
        onClose={() => setInvite(false)}
        title="Invite a member"
        actions={<><Button variant="ghost" onClick={() => setInvite(false)}>Cancel</Button><Button variant="primary" onClick={() => setInvite(false)}>Send invite</Button></>}
      >
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Email</label>
          <input className="input" autoFocus placeholder="colleague@acme.dev" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="field-label">Role</label>
          <select className="input"><option>Member</option><option>Admin</option></select>
        </div>
        <div>
          <label className="field-label">Message <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="input" rows={3} placeholder="A short note. Shown in the invite email." style={{ resize: 'vertical' }}></textarea>
        </div>
      </Modal>
    </div>
  );
}

// ===========================================================
function SettingsBilling() {
  return (
    <div data-screen-label="18b Settings · Billing">
      <h1>Billing</h1>
      <div className="lede">Pro · $49/mo + pass-through model spend · next invoice on 2026-06-01.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card padding={20}>
          <div className="label" style={{ marginBottom: 10 }}>NEXT INVOICE</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 28, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>$67.42</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>$49.00 plan · $18.42 usage · due 2026-06-01</div>
        </Card>
        <Card padding={20}>
          <div className="label" style={{ marginBottom: 10 }}>PAYMENT METHOD</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 24, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-mono)', fontSize: 10, fontWeight: 500 }}>VISA</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 14 }}>•••• 4242</div>
            <a style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>Update →</a>
          </div>
        </Card>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 500, margin: '0 0 12px' }}>Recent invoices</h3>
      <div className="tbl-scroll">
        <table className="doc-table">
        <thead><tr><th>DATE</th><th>NUMBER</th><th>AMOUNT</th><th>STATUS</th><th></th></tr></thead>
        <tbody>
          {[
            ['2026-05-01', 'INV-1042', '$62.18', 'Paid'],
            ['2026-04-01', 'INV-1031', '$58.04', 'Paid'],
            ['2026-03-01', 'INV-1019', '$54.91', 'Paid'],
            ['2026-02-01', 'INV-1008', '$49.00', 'Paid'],
          ].map(([d, n, a, s]) => (
            <tr key={n}>
              <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{d}</td>
              <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12 }}>{n}</td>
              <td style={{ fontFamily: 'var(--ff-mono)' }}>{a}</td>
              <td><Pill variant="success">{s}</Pill></td>
              <td><button className="icon-btn" style={{ width: 22, height: 22 }} title="Download PDF"><Icon name="download" size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
        </div>
    </div>
  );
}

// ===========================================================
function SettingsDanger() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div data-screen-label="18c Settings · Danger Zone">
      <h1>Danger zone</h1>
      <div className="lede">Actions in this section are permanent. Most require typing the workspace slug to confirm.</div>

      <Card padding={20} style={{ borderColor: 'var(--warn)', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>Re-embed all documents</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Re-runs embedding generation for all 412 documents. Estimated cost: <strong style={{ color: 'var(--text)' }}>$1.42</strong>. Existing embeddings stay live until the rebuild finishes.
        </p>
        <Button variant="secondary" icon="repeat">Re-embed everything</Button>
      </Card>

      <Card padding={20} style={{ borderColor: 'var(--warn)', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500 }}>Export workspace</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Portable bundle: documents, embeddings, eval runs, settings. Imports cleanly into a self-hosted Atlas instance.
        </p>
        <Button variant="secondary" icon="download">Generate export</Button>
      </Card>

      <Card padding={20} style={{ borderColor: 'var(--error)' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 500, color: 'var(--error)' }}>Delete workspace</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Removes all 412 documents, 14,201 traces, 142 eval runs, all API keys, and all member access. <strong style={{ color: 'var(--text)' }}>This cannot be undone.</strong>
        </p>
        <Button variant="destructive" icon="trash-2" onClick={() => setConfirmDelete(true)}>Delete workspace</Button>
      </Card>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}
        title="Delete the acme-prod workspace?"
        actions={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="destructive">Permanently delete</Button></>}
      >
        Type <strong style={{ fontFamily: 'var(--ff-mono)' }}>acme-prod</strong> to confirm:
        <input className="input" style={{ marginTop: 10 }} autoFocus />
      </Modal>
    </div>
  );
}

Object.assign(window, { SettingsShell, SettingsProfile, SettingsTenant, SettingsMembers, SettingsBilling, SettingsDanger, SETTINGS_NAV });

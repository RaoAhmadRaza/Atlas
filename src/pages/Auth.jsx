// Atlas — Auth surfaces: Login, Signup, Onboarding, 404

function Login({ onNav }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Enter your email and password.'); return; }
    if (password === 'wrong') { setError('Wrong email or password.'); return; }
    setError(null);
    setLoading(true);
    setTimeout(() => { setLoading(false); onNav('dashboard'); }, 900);
  }

  return (
    <div className="auth-shell" data-screen-label="04 Sign In">
      <a className="auth-wordmark" onClick={() => onNav('home')}>atlas<span className="dot">.</span></a>
      <div className={'auth-card' + (error ? ' has-error' : '')}>
        <h1>Sign in to Atlas</h1>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label className="field-label">Email</label>
            <input className="input" autoFocus type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
          </div>
          <div className="field">
            <div className="field-row">
              <label className="field-label" style={{ marginBottom: 0 }}>Password</label>
              <a>Forgot password?</a>
            </div>
            <div className="pw-input">
              <input className="input" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>{showPw ? 'hide' : 'show'}</button>
            </div>
          </div>
          <Button variant="primary" type="submit" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? <><span className="spinner"></span> Signing in...</> : 'Sign in'}
          </Button>
        </form>
        <div className="divider-or">or</div>
        <div className="oauth-row">
          <button className="oauth-btn"><Icon name="github" size={14} />GitHub</button>
          <button className="oauth-btn"><Icon name="globe" size={14} />Google</button>
        </div>
        <div className="auth-footer-link">
          No account? <a onClick={() => onNav('signup')}>Sign up →</a>
        </div>
      </div>
      <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>
        Tip — password "wrong" triggers an error state.
      </div>
    </div>
  );
}

function Signup({ onNav }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenant, setTenant] = useState('');
  const [plan, setPlan] = useState('free');
  const [showWhy, setShowWhy] = useState(false);

  const slug = tenant.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slugTaken = ['acme', 'atlas', 'demo'].includes(slug);
  const pwStrength = Math.min(4, Math.floor(password.length / 3));

  function next() {
    if (step === 1) {
      if (!name || !email || !password) return;
      setStep(2);
    } else {
      onNav('onboarding');
    }
  }

  return (
    <div className="auth-shell" data-screen-label="05 Sign Up">
      <a className="auth-wordmark" onClick={() => onNav('home')}>atlas<span className="dot">.</span></a>
      <div className="auth-card wide">
        <div className="step-dots">
          <div className={'d ' + (step >= 1 ? 'active' : '')}></div>
          <div className={'d ' + (step >= 2 ? 'active' : '')}></div>
        </div>
        <h1>{step === 1 ? 'Create your Atlas account' : 'Name your workspace'}</h1>

        {step === 1 && (
          <>
            <div className="field">
              <label className="field-label">Name</label>
              <input className="input" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="field">
              <label className="field-label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              {email && !email.includes('@') && <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>That doesn't look like an email.</div>}
            </div>
            <div className="field">
              <label className="field-label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 12 characters" />
              {password && (
                <div className={'pw-strength s' + Math.max(1, pwStrength)}>
                  <div className="seg"></div><div className="seg"></div><div className="seg"></div><div className="seg"></div>
                </div>
              )}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="field">
              <label className="field-label">Workspace name</label>
              <input className="input" autoFocus value={tenant} onChange={e => setTenant(e.target.value)} placeholder="e.g. Acme Production" />
              {slug && (
                <div className="slug-preview">
                  <span style={{ color: 'var(--text-subtle)' }}>atlas.dev/</span><span style={{ color: 'var(--text)' }}>{slug}</span>
                  {slugTaken
                    ? <span className="bad">· × taken</span>
                    : <span className="ok">· ✓ available</span>}
                </div>
              )}
            </div>
            <div className="field">
              <label className="field-label">Plan</label>
              <div className="plan-row">
                {[
                  { id: 'free', name: 'Free', desc: '100 docs · 1k queries / mo' },
                  { id: 'pro',  name: 'Pro',  desc: '10k docs · 100k queries · $49/mo' },
                ].map(p => (
                  <div key={p.id} className={'plan-card ' + (plan === p.id ? 'active' : '')} onClick={() => setPlan(p.id)}>
                    <div className="pname">{p.name}</div>
                    <div className="pdesc">{p.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Or <a style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => onNav('docs')}>self-host with Apache 2.0</a> — Atlas runs locally with one docker compose command.
              </div>
            </div>
          </>
        )}

        <Button variant="primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} onClick={next}>
          {step === 1 ? 'Continue →' : 'Create workspace'}
        </Button>

        {step === 1 && (
          <>
            <div className="reassure">
              Free includes <strong style={{ color: 'var(--text)' }}>100 documents</strong> and <strong style={{ color: 'var(--text)' }}>1,000 queries</strong> per month. No credit card.
              <br />
              <a onClick={() => setShowWhy(s => !s)}>Why do you need this info?</a>
              {showWhy && (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--bg-sunken)', borderRadius: 'var(--radius-sm)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  Email is your login. Name is shown on shared eval reports. Your workspace creates a <code style={{ fontFamily: 'var(--ff-mono)' }}>tenant_id</code> that scopes all your data via Postgres RLS — one user can own multiple workspaces.
                </div>
              )}
            </div>
          </>
        )}

        <div className="auth-footer-link">
          {step === 1
            ? <>Already have an account? <a onClick={() => onNav('login')}>Sign in →</a></>
            : <a onClick={() => setStep(1)}>← Back</a>}
        </div>
      </div>
    </div>
  );
}

function Onboarding({ onNav }) {
  const [panel, setPanel] = useState(1);
  const [emb, setEmb] = useState('bge');
  const [llm, setLlm] = useState('haiku');
  const [uploaded, setUploaded] = useState(false);

  return (
    <div className="onboard-shell" data-screen-label="06 Onboarding">
      <div className="onboard-top">
        <div className="word">atlas<span className="dot">.</span></div>
        <div className="dots">
          {[1,2,3,4].map(n => (
            <div key={n} className={'d ' + (n === panel ? 'active' : n < panel ? 'done' : '')}></div>
          ))}
        </div>
        <a className="skip" onClick={() => onNav('dashboard')}>Skip onboarding</a>
      </div>

      <div className="onboard-body">
        {panel === 1 && (
          <div className="onboard-panel">
            <h1>Upload your first document.</h1>
            <p className="sub">Atlas needs at least one document to retrieve from. Upload a PDF, DOCX, Markdown, or HTML file (max 50 MB).</p>
            <div className="drop" onClick={() => setUploaded(true)}>
              <div className="ic"><Icon name={uploaded ? 'check-circle-2' : 'upload-cloud'} size={36} style={{ color: uploaded ? 'var(--success)' : 'var(--text-muted)' }} /></div>
              {uploaded ? (
                <>
                  <div className="ti">AMD-Q4-2023-10K.pdf</div>
                  <div className="si" style={{ color: 'var(--success)' }}>Embedding 124 pages · 412 chunks · 78%…</div>
                </>
              ) : (
                <>
                  <div className="ti">Drop a file or click to browse</div>
                  <div className="si">PDF · DOCX · MD · HTML — up to 50 MB</div>
                </>
              )}
            </div>
            <a className="sample-link" onClick={() => setUploaded(true)}>Use a sample document instead →</a>
          </div>
        )}

        {panel === 2 && (
          <div className="onboard-panel">
            <h1>Pick your models.</h1>
            <p className="sub">You can change these any time in Settings. Defaults are tuned to be cheap and fast.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, textAlign: 'left' }}>
              <div>
                <div className="label" style={{ marginBottom: 12 }}>EMBEDDING MODEL</div>
                <div className="model-choice">
                  {[
                    { id: 'bge',  t: 'BGE-large-en-v1.5',           d: 'Open weights · free · runs on CPU · 1024-dim' },
                    { id: 'oai',  t: 'OpenAI text-embedding-3-large', d: '$0.13 / 1M tok · best quality · 3072-dim' },
                  ].map(o => (
                    <label key={o.id} className={'opt ' + (emb === o.id ? 'active' : '')} onClick={() => setEmb(o.id)}>
                      <div className="radio"></div>
                      <div className="opt-body">
                        <div className="otitle">{o.t}</div>
                        <div className="odesc">{o.d}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 12 }}>LLM</div>
                <div className="model-choice">
                  {[
                    { id: 'haiku', t: 'Claude Haiku 4.5',  d: '$0.80 / $4 per 1M · fast · default' },
                    { id: 'opus',  t: 'Claude Opus 4.7',   d: '$15 / $75 per 1M · highest faithfulness' },
                  ].map(o => (
                    <label key={o.id} className={'opt ' + (llm === o.id ? 'active' : '')} onClick={() => setLlm(o.id)}>
                      <div className="radio"></div>
                      <div className="opt-body">
                        <div className="otitle">{o.t}</div>
                        <div className="odesc">{o.d}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {panel === 3 && (
          <div className="onboard-panel">
            <h1>Ask your first question.</h1>
            <p className="sub">Try one of these, or write your own.</p>
            <div className="suggested-q">
              {[
                "What was AMD's Q4 2023 revenue and how did it compare to Q4 2022?",
                "Summarize the risk factors in the 2023 10-K.",
                "What did management say about the Data Center segment outlook?",
              ].map(q => (
                <div key={q} className="q" onClick={() => setPanel(4)}>
                  <Icon name="message-square" size={14} style={{ color: 'var(--text-subtle)' }} />
                  {q}
                  <Icon name="arrow-right" size={14} className="arrow" />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, fontSize: 12, color: 'var(--text-muted)' }}>
              <span className="spinner" style={{ display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }}></span>
              Embedding finishing… 89%
            </div>
          </div>
        )}

        {panel === 4 && (
          <div className="onboard-panel">
            <h1>Read the trace.</h1>
            <p className="sub">Every answer in Atlas is fully traceable. Click any citation chip to see the exact chunk the model used.</p>
            <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 15, lineHeight: 1.65 }}>
                AMD reported Q4 2023 revenue of $6.2 billion <Cite n={1} />, up 10% year-over-year from $5.6 billion in Q4 2022 <Cite n={2} />.
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                <span>1.1 s</span><span>·</span><span>412 tok in / 218 tok out</span><span>·</span><span>$0.0007</span><span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>view trace →</span>
              </div>
            </div>
            <Button variant="primary" size="lg" iconRight="arrow-right" onClick={() => onNav('dashboard')} style={{ marginTop: 32 }}>
              Go to your workspace
            </Button>
          </div>
        )}
      </div>

      <div className="onboard-foot">
        <Button variant="ghost" onClick={() => setPanel(p => Math.max(1, p - 1))} disabled={panel === 1}>← Back</Button>
        <Button variant="primary" onClick={() => panel < 4 ? setPanel(p => p + 1) : onNav('dashboard')}>
          {panel < 4 ? 'Continue →' : 'Done'}
        </Button>
      </div>
    </div>
  );
}

function NotFound({ onNav, kind = '404' }) {
  return (
    <div className="err-shell" data-screen-label={"24 " + kind}>
      <div className="err-card">
        <div className="word" onClick={() => onNav('home')}>atlas<span className="dot">.</span></div>
        <h1>{kind === '500' ? '500 — Something broke.' : '404 — Not found.'}</h1>
        <p>
          {kind === '500'
            ? "We logged the error. Sending the ID below to support speeds up triage."
            : "The page you were looking for doesn't exist. It may have moved, or it might have never been there."}
        </p>
        {kind === '500' && <div className="id">error_id: a3f2-bc91-7e44-1029</div>}
        <div className="actions">
          <Button variant="secondary" onClick={() => onNav('dashboard')}>Go to dashboard</Button>
          <Button variant="primary" icon={kind === '500' ? 'send' : 'home'} onClick={() => onNav(kind === '500' ? 'home' : 'home')}>
            {kind === '500' ? 'Report this' : 'Back to home'}
          </Button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Login, Signup, Onboarding, NotFound });

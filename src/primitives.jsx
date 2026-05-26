// Atlas primitives — small reusable components.
// Exported to window for cross-script use.
// React hooks (useState/useEffect/useRef) are pre-bound on window via index.html.

// Icon cache: renders Lucide icon off-screen once per name, caches the SVG string.
// dangerouslySetInnerHTML used so React never owns SVG children — prevents removeChild mismatch.
// Icon names are allowlisted to [a-z0-9-] before any DOM injection.
var _iCache = Object.create(null);
function _lucideHTML(name, sw) {
  var k = name + '|' + sw;
  if (k in _iCache) return _iCache[k];
  _iCache[k] = '';
  if (!window.lucide) return '';
  var safeName = name.replace(/[^a-z0-9-]/g, '');
  if (!safeName) return '';
  var div = document.createElement('div');
  var icon = document.createElement('i');
  icon.setAttribute('data-lucide', safeName);
  div.appendChild(icon);
  document.body.appendChild(div);
  try {
    window.lucide.createIcons({ nameAttr: 'data-lucide', attrs: { 'stroke-width': String(sw) }, icons: window.lucide.icons });
    var el = div.firstElementChild;
    if (el) { el.removeAttribute('width'); el.removeAttribute('height'); _iCache[k] = el.outerHTML; }
  } catch(e) {}
  document.body.removeChild(div);
  return _iCache[k];
}

function Icon({ name, size = 16, color, strokeWidth = 1.5, style, className }) {
  return (
    <span
      style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0, ...style }}
      className={'icon ' + (className || '')}
      dangerouslySetInnerHTML={{ __html: _lucideHTML(name, strokeWidth) }}
    />
  );
}

function Button({ variant = 'secondary', size = 'md', children, onClick, disabled, icon, iconRight, type, style }) {
  const cls = `btn btn-${variant}` + (size === 'sm' ? ' btn-sm' : size === 'lg' ? ' btn-lg' : '');
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type || 'button'} style={style}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 14 : 16} />}
    </button>
  );
}

function Pill({ children, variant, style }) {
  return (
    <span className={'pill ' + (variant || '')} style={style}>
      {variant && variant !== 'accent' && <span className="dot"></span>}
      {children}
    </span>
  );
}

function Tag({ children, style }) {
  return <span className="tag" style={style}>{children}</span>;
}

function Cite({ n, onClick }) {
  return <span className="cite" onClick={onClick}>[{n}]</span>;
}

function HelpQ({ term }) {
  return <span className="help-q" title={term || 'Learn more'}>?</span>;
}

function Card({ title, actions, children, style, onClick, padding = 20 }) {
  return (
    <div className="card" style={{ padding, ...style }} onClick={onClick}>
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

function KPI({ label, value, unit, delta, deltaDirection, ci, sparkline }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">{value}{unit && <span className="unit">{unit}</span>}{sparkline && <Sparkline data={sparkline} />}</div>
      {delta && <span className={'delta ' + (deltaDirection === 'down' ? 'down' : '')}>{deltaDirection === 'down' ? '↓' : '↑'} {delta}</span>}
      {ci && <span className="ci">{ci}</span>}
    </div>
  );
}

function Sparkline({ data, w = 60, h = 18, color = 'var(--accent)' }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="spark" style={{ verticalAlign: 'middle', marginLeft: 10 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <div
          key={t.id}
          className={'tab ' + (active === t.id ? 'active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count != null && <span className="count">{t.count}</span>}
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ lang, code, copyable = true }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      {lang && <span className="code-lang">{lang}</span>}
      {copyable && (
        <button className="code-copy" onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      )}
      <pre>{code}</pre>
    </div>
  );
}

function Toast({ kind = 'success', message, sub, onDismiss }) {
  return (
    <div className="toast">
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--${kind})`, flexShrink: 0 }}></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{message}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
      </div>
      {onDismiss && <button className="icon-btn" onClick={onDismiss} style={{ width: 24, height: 24 }}><Icon name="x" size={14} /></button>}
    </div>
  );
}

function Modal({ open, onClose, title, children, actions, width = 480 }) {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ maxWidth: width }} onClick={e => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        <div className="body" style={{ marginBottom: actions ? 20 : 0 }}>{children}</div>
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>
  );
}

// Lightweight toggle switch
function ToggleSwitch({ on, onChange }) {
  return <div className={'toggle ' + (on ? 'on' : '')} onClick={() => onChange(!on)} role="switch" aria-checked={on}></div>;
}

// Stacked area chart — tiny SVG, no library
function StackedArea({ series, labels, w = 720, h = 220, colors }) {
  const days = series[0].length;
  const totals = Array.from({ length: days }, (_, i) => series.reduce((s, sr) => s + sr[i], 0));
  const max = Math.max(...totals) * 1.1;
  const px = i => (i / (days - 1)) * (w - 40) + 30;
  const py = v => h - 30 - (v / max) * (h - 50);
  const palette = colors || ['var(--accent)', 'var(--info)', 'var(--success)', 'var(--warn)'];

  // Build stacked y-arrays
  const stacks = [];
  let baseline = Array(days).fill(0);
  for (let s = 0; s < series.length; s++) {
    const top = series[s].map((v, i) => v + baseline[i]);
    stacks.push({ baseline: [...baseline], top, label: labels[s], color: palette[s % palette.length] });
    baseline = top;
  }

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <line x1="30" y1={h - 30} x2={w - 10} y2={h - 30} stroke="var(--border)" strokeWidth="1" />
      <line x1="30" y1="10"     x2="30" y2={h - 30} stroke="var(--border)" strokeWidth="1" />
      {stacks.map((s, i) => {
        const pts = [
          ...s.baseline.map((v, j) => `${px(j)},${py(v)}`),
          ...s.top.map((v, j) => `${px(days - 1 - j)},${py(s.top[days - 1 - j])}`)
        ].join(' ');
        return (
          <polygon key={i} points={pts}
            fill={s.color} fillOpacity="0.18"
            stroke={s.color} strokeWidth="1.25" strokeLinejoin="round" />
        );
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
        <text key={i} x="24" y={py(p * max) + 4} fontSize="9" fill="var(--text-subtle)" fontFamily="var(--ff-mono)" textAnchor="end">
          {Math.round(p * max)}
        </text>
      ))}
    </svg>
  );
}

// Mini bar chart used in eval per-difficulty
function GroupedBars({ groups, series, w = 640, h = 200, colors }) {
  const palette = colors || ['var(--accent)', 'var(--info)', 'var(--success)'];
  const allVals = series.flatMap(s => s.data);
  const max = Math.max(...allVals) * 1.1;
  const groupW = (w - 60) / groups.length;
  const barW = (groupW - 16) / series.length;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <line x1="40" y1={h - 30} x2={w - 10} y2={h - 30} stroke="var(--border)" />
      {groups.map((g, gi) => {
        const x0 = 50 + gi * groupW + 8;
        return (
          <g key={gi}>
            {series.map((s, si) => {
              const v = s.data[gi];
              const bh = (v / max) * (h - 50);
              return (
                <rect key={si} x={x0 + si * barW} y={h - 30 - bh} width={barW - 2} height={bh}
                  fill={palette[si % palette.length]} rx="1" />
              );
            })}
            <text x={x0 + (groupW - 16) / 2} y={h - 14} fontSize="10" fill="var(--text-muted)" textAnchor="middle" fontFamily="var(--ff-ui)">{g}</text>
          </g>
        );
      })}
      {[0, 0.5, 1].map((p, i) => (
        <text key={i} x="34" y={h - 30 - p * (h - 50) + 4} fontSize="9" fill="var(--text-subtle)" fontFamily="var(--ff-mono)" textAnchor="end">
          {(p * max).toFixed(2)}
        </text>
      ))}
    </svg>
  );
}

function Wordmark({ size = 22, onClick }) {
  return (
    <span onClick={onClick} style={{ fontFamily: 'var(--ff-display)', fontSize: size, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text)', cursor: onClick ? 'pointer' : 'default', textDecoration: 'none', lineHeight: 1 }}>
      atlas<span style={{ color: 'var(--accent)' }}>.</span>
    </span>
  );
}

// Lightweight loading hook — flips to true after `ms`. One-shot.
function useFakeLoad(ms = 700) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), ms); return () => clearTimeout(t); }, []);
  return loaded;
}

// SkelLine — a single shimmering bar
function SkelLine({ w = '100%', h = 12, style }) {
  return <span className="skel" style={{ display: 'block', width: w, height: h, ...style }}></span>;
}

Object.assign(window, { Icon, Button, Pill, Tag, Cite, HelpQ, Card, KPI, Sparkline, Tabs, CodeBlock, Toast, Modal, ToggleSwitch, StackedArea, GroupedBars, Wordmark, useFakeLoad, SkelLine });
function EmptyState({ icon, title, body, primaryLabel, primaryIcon, onPrimary, secondaryLabel, onSecondary }) {
  return (
    <div style={{
      padding: '64px 32px', textAlign: 'center',
      border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-elev)',
      maxWidth: 520, margin: '24px auto',
    }}>
      {icon && <Icon name={icon} size={36} style={{ color: 'var(--text-subtle)', marginBottom: 16 }} />}
      <h2 style={{ fontFamily: 'var(--ff-ui)', fontSize: 18, fontWeight: 500, margin: '0 0 8px', color: 'var(--text)' }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 24px', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>{body}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {primaryLabel && <Button variant="primary" icon={primaryIcon} onClick={onPrimary}>{primaryLabel}</Button>}
        {secondaryLabel && <Button variant="secondary" onClick={onSecondary}>{secondaryLabel}</Button>}
      </div>
    </div>
  );
}

function useEmptyMode() {
  const [empty, setEmpty] = useState(document.body.dataset.empty === 'true');
  useEffect(() => {
    const sync = () => setEmpty(document.body.dataset.empty === 'true');
    sync();
    // observe body changes
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-empty'] });
    return () => obs.disconnect();
  }, []);
  return empty;
}

Object.assign(window, { EmptyState, useEmptyMode });

Object.assign(window, { EmptyState, useEmptyMode });

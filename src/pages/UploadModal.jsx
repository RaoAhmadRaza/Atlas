// Atlas — Upload documents modal flow.
// Drag-drop zone → file list with per-file progress → chunking + embedding pickers → "Upload all"

function UploadDocumentsModal({ open, onClose }) {
  const [files, setFiles] = useState([]);
  const [chunkStrategy, setChunkStrategy] = useState('recursive');
  const [chunkSize, setChunkSize] = useState(512);
  const [embedding, setEmbedding] = useState('bge-large');
  const [phase, setPhase] = useState('pick'); // pick | uploading | done
  const [uploadError, setUploadError] = useState(null);
  const intervalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  useEffect(() => {
    if (phase !== 'uploading' || !files.length) return;
    if (files.every(f => f.status === 'done' || f.status === 'error')) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPhase('done');
    }
  }, [files, phase]);

  if (!open) return null;

  // Synthetic file list for instant population
  const sampleFiles = [
    { name: 'AMD-Q4-2023-10K.pdf',         size: 2_485_712, type: 'PDF' },
    { name: 'fy2024-plans.md',             size: 38_400,    type: 'MD' },
    { name: 'product-roadmap-v2.docx',     size: 512_000,   type: 'DOCX' },
  ];

  function addFile(f) {
    setFiles(curr => [...curr, { ...f, id: Math.random().toString(36).slice(2, 8), progress: 0, status: 'queued' }]);
  }

  function loadSamples() {
    sampleFiles.forEach(f => addFile(f));
  }

  function removeFile(id) {
    setFiles(curr => curr.filter(f => f.id !== id));
  }

  function startUpload() {
    if (!files.length) return;
    setPhase('uploading');
    setUploadError(null);
    setFiles(curr => curr.map(f => ({ ...f, status: 'uploading', progress: 0 })));

    const withFile = files.filter(f => f._file);
    const noFile = files.filter(f => !f._file);

    if (noFile.length) {
      let elapsed = 0;
      intervalRef.current = setInterval(() => {
        elapsed += 120;
        setFiles(curr => curr.map(f => {
          if (f._file) return f;
          const idx = noFile.findIndex(s => s.id === f.id);
          const start = idx * 300;
          if (elapsed < start) return f;
          const localElapsed = elapsed - start;
          const dur = Math.max(800, f.size / 3000);
          if (localElapsed >= dur) return { ...f, progress: 100, status: 'done' };
          return { ...f, progress: Math.min(99, Math.round((localElapsed / dur) * 100)), status: 'uploading' };
        }));
      }, 120);
    }

    withFile.forEach(f => {
      const form = new FormData();
      form.append('file', f._file);

      api.upload('/v1/documents/upload', form)
        .then(r => { if (!r.ok) throw new Error('upload failed'); return r.json(); })
        .then(({ document_id }) => api.get(`/v1/documents/${document_id}/progress`))
        .then(res => {
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          (async function readProgress() {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              for (const line of dec.decode(value).split('\n')) {
                if (!line.startsWith('data: ')) continue;
                let evt; try { evt = JSON.parse(line.slice(6)); } catch { continue; }
                setFiles(prev => prev.map(p => {
                  if (p.id !== f.id) return p;
                  if (evt.stage === 'done') return { ...p, progress: 100, status: 'done' };
                  if (evt.stage === 'error') return { ...p, status: 'error' };
                  return { ...p, progress: evt.pct ?? p.progress };
                }));
              }
            }
          })();
        })
        .catch(err => {
          setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: 'error' } : p));
          setUploadError(err.message || 'Upload failed — is the API server running?');
        });
    });
  }

  function close() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFiles([]);
    setPhase('pick');
    setUploadError(null);
    onClose();
  }

  function bytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  return (
    <div className="modal-scrim" onClick={close}>
      <div className="modal" style={{ maxWidth: 720, padding: 0, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--ff-ui)', fontSize: 18, fontWeight: 500 }}>Upload documents</h2>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
            <span className={'step-pip ' + (phase === 'pick' ? 'active' : 'done')}>{phase === 'pick' ? '1' : <Icon name="check" size={11} />}</span>
            <span>Pick files</span>
            <span style={{ color: 'var(--text-subtle)' }}>·</span>
            <span className={'step-pip ' + (phase === 'uploading' ? 'active' : phase === 'done' ? 'done' : '')}>{phase === 'done' ? <Icon name="check" size={11} /> : '2'}</span>
            <span>Upload</span>
          </span>
          <button className="icon-btn" onClick={close}><Icon name="x" size={16} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* Hidden real file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.md,.html,.txt"
            style={{ display: 'none' }}
            onChange={e => {
              Array.from(e.target.files || []).forEach(f =>
                addFile({ name: f.name, size: f.size, type: (f.name.split('.').pop() || '').toUpperCase(), _file: f })
              );
              e.target.value = '';
            }}
          />

          {/* Upload error banner */}
          {uploadError && (
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--danger-bg, #fef2f2)', border: '1px solid var(--danger, #dc2626)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--danger, #dc2626)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="alert-circle" size={14} />
              {uploadError}
            </div>
          )}

          {/* Drop zone */}
          {phase === 'pick' && (
            <>
              {files.length === 0 ? (
                <div
                  className="upload-drop"
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('over'); }}
                  onDragLeave={e => e.currentTarget.classList.remove('over')}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('over');
                    const dropped = Array.from(e.dataTransfer.files);
                    dropped.forEach(f => addFile({ name: f.name, size: f.size, type: (f.name.split('.').pop() || '').toUpperCase(), _file: f }));
                  }}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <Icon name="upload-cloud" size={36} style={{ color: 'var(--text-muted)', marginBottom: 14 }} />
                  <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>Drop files here, or click to browse</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>PDF · DOCX · MD · HTML — up to 50 MB each</div>
                  <a onClick={(e) => { e.stopPropagation(); loadSamples(); }} style={{ fontSize: 13, color: 'var(--accent)', cursor: 'pointer' }}>Use sample documents instead →</a>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div className="label">{files.length} FILE{files.length === 1 ? '' : 'S'} READY</div>
                    <a onClick={loadSamples} style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>+ add more</a>
                  </div>
                  <div className="upload-list">
                    {files.map(f => (
                      <div key={f.id} className="upload-row">
                        <Tag>{f.type}</Tag>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>{bytes(f.size)}</div>
                        </div>
                        <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => removeFile(f.id)} title="Remove">
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Chunking strategy + embedding */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
                    <div>
                      <label className="field-label">Chunking <HelpQ /></label>
                      <select className="input" value={chunkStrategy} onChange={e => setChunkStrategy(e.target.value)}>
                        <option value="recursive">recursive · 512 × 80 (default)</option>
                        <option value="semantic">semantic</option>
                        <option value="markdown-header">markdown headers</option>
                        <option value="late-chunking">late chunking (beta)</option>
                      </select>
                      <div className="field-help">How to find chunk boundaries.</div>
                    </div>
                    <div>
                      <label className="field-label">Embedding</label>
                      <select className="input" value={embedding} onChange={e => setEmbedding(e.target.value)}>
                        <option value="bge-large">BGE-large-en-v1.5 · free</option>
                        <option value="oai-3l">OpenAI 3-large · $0.13/1M tok</option>
                      </select>
                      <div className="field-help">Tenant default · change in Settings.</div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {(phase === 'uploading' || phase === 'done') && (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="label">{phase === 'done' ? 'COMPLETE' : 'UPLOADING'}</div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                  {files.filter(f => f.status === 'done').length} / {files.length} done
                </span>
              </div>
              <div className="upload-list">
                {files.map(f => (
                  <div key={f.id} className="upload-row">
                    <Tag>{f.type}</Tag>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{f.name}</span>
                        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: f.status === 'done' ? 'var(--success)' : 'var(--text-muted)' }}>
                          {f.status === 'done' ? '✓ done' : f.progress + '%'}
                        </span>
                      </div>
                      <div className="upload-progress">
                        <div className={'upload-progress-fill ' + (f.status === 'done' ? 'done' : '')} style={{ width: f.progress + '%' }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {phase === 'done' && (
                <div style={{ marginTop: 18, padding: '12px 16px', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name="check-circle-2" size={16} style={{ color: 'var(--success)' }} />
                  <span style={{ color: 'var(--text)' }}>
                    <strong style={{ color: 'var(--success)', fontWeight: 500 }}>{files.length} document{files.length === 1 ? '' : 's'} uploaded.</strong>{' '}
                    Embedding in progress — they'll be queryable in about 30 seconds.
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-subtle)', fontFamily: 'var(--ff-mono)' }}>
            {phase === 'pick' && files.length > 0 && `≈ ${(files.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB · est. ${Math.ceil(files.length * 8)} chunks`}
            {phase === 'uploading' && 'sha-256 dedup is automatic'}
            {phase === 'done' && 'view them on the documents page'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={close}>{phase === 'done' ? 'Close' : 'Cancel'}</Button>
            {phase === 'pick' && (
              <Button variant="primary" icon="upload" disabled={files.length === 0} onClick={startUpload}>
                Upload {files.length > 0 ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'all'}
              </Button>
            )}
            {phase === 'done' && (
              <Button variant="primary" onClick={close}>Done</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { UploadDocumentsModal });

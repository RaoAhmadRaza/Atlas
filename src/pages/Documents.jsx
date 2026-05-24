// Atlas — Documents library

function Documents() {
  const [loaded, setLoaded] = useState(false);
  const empty = useEmptyMode();
  const [uploadOpen, setUploadOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 700);
    return () => clearTimeout(t);
  }, []);

  const docs = empty ? [] : [
    { title: 'AMD-Q4-2023-10K.pdf',        type: 'PDF',  size: '2.4 MB', pages: 124, chunks: 412, model: 'bge-large',         status: 'success', statusLabel: 'Ready',      when: '12m ago' },
    { title: 'fy2024-plans.md',            type: 'MD',   size: '38 KB',  pages: 8,   chunks: 38,  model: 'bge-large',         status: 'success', statusLabel: 'Ready',      when: '2d ago' },
    { title: 'eng-onboarding.html',        type: 'HTML', size: '124 KB', pages: 14,  chunks: 71,  model: 'bge-large + oai',   status: 'success', statusLabel: 'Ready',      when: '3d ago' },
    { title: 'finance-bench-2026Q1.pdf',   type: 'PDF',  size: '8.1 MB', pages: 312, chunks: 0,   model: '—',                 status: 'processing', statusLabel: 'Processing 47/312', when: 'just now' },
    { title: 'product-roadmap-v2.docx',    type: 'DOCX', size: '512 KB', pages: 24,  chunks: 0,   model: '—',                 status: '',         statusLabel: 'Queued',    when: '1m ago' },
    { title: 'retrieval-bench-corpus.zip', type: 'ZIP',  size: '184 MB', pages: 0,   chunks: 0,   model: '—',                 status: 'error',    statusLabel: 'Failed',    when: '6h ago' },
    { title: 'hotpot-qa-subset.jsonl',     type: 'JSON', size: '2.1 MB', pages: 0,   chunks: 7405, model: 'bge-large',        status: 'success',  statusLabel: 'Ready',     when: '5d ago' },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Documents</h1>
          <div className="sub">{empty ? 'No documents yet · upload one to get started' : '412 documents · 38,491 chunks · 2 embedding models'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="filter" disabled={empty}>Filter</Button>
          <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>Upload documents</Button>
        </div>
      </div>

      {empty && (
        <EmptyState
          icon="upload-cloud"
          title="No documents yet."
          body="Upload a PDF, DOCX, Markdown, or HTML file to start asking questions. Atlas handles chunking, embedding, and indexing automatically."
          primaryLabel="Upload your first document"
          primaryIcon="upload"
          onPrimary={() => setUploadOpen(true)}
          secondaryLabel="Use sample corpus"
        />
      )}

      {!empty && <>
      <div style={{ padding: '10px 14px', border: '1px solid var(--info)', background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
        <Icon name="info" size={14} style={{ color: 'var(--info)' }} />
        <span style={{ color: 'var(--text)' }}>Tip: Atlas re-uses embeddings if you upload the same document twice. <span style={{ fontFamily: 'var(--ff-mono)' }}>SHA-256</span> dedup is automatic.</span>
        <button className="icon-btn" style={{ marginLeft: 'auto', width: 22, height: 22 }}><Icon name="x" size={12} /></button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input className="input" placeholder="Search documents" style={{ paddingLeft: 34 }} />
        </div>
        <Tag>Status: any</Tag>
        <Tag>Type: any</Tag>
        <Tag>Model: bge-large</Tag>
      </div>

      <div className="tbl-scroll">
      <table className="doc-table">
        <thead>
          <tr>
            <th style={{ width: 28 }}><input type="checkbox" /></th>
            <th>TITLE</th>
            <th>TYPE</th>
            <th style={{ textAlign: 'right' }}>SIZE</th>
            <th style={{ textAlign: 'right' }}>PAGES</th>
            <th style={{ textAlign: 'right' }}>CHUNKS</th>
            <th>EMBEDDING</th>
            <th>STATUS</th>
            <th>INGESTED</th>
            <th style={{ width: 28 }}></th>
          </tr>
        </thead>
        <tbody>
          {!loaded && [0,1,2,3,4,5].map(i => (
            <tr key={'s' + i}>
              <td><span className="skel" style={{ width: 14, height: 14 }}></span></td>
              <td><span className="skel" style={{ width: '70%', height: 12 }}></span></td>
              <td><span className="skel" style={{ width: 32, height: 14 }}></span></td>
              <td className="num"><span className="skel" style={{ width: 48, height: 10 }}></span></td>
              <td className="num"><span className="skel" style={{ width: 32, height: 10 }}></span></td>
              <td className="num"><span className="skel" style={{ width: 40, height: 10 }}></span></td>
              <td><span className="skel" style={{ width: 80, height: 10 }}></span></td>
              <td><span className="skel" style={{ width: 60, height: 16 }}></span></td>
              <td><span className="skel" style={{ width: 50, height: 10 }}></span></td>
              <td></td>
            </tr>
          ))}
          {loaded && docs.map((d, i) => (
            <tr key={i}>
              <td><input type="checkbox" /></td>
              <td style={{ color: 'var(--text)', fontWeight: 500 }}>{d.title}</td>
              <td><Tag>{d.type}</Tag></td>
              <td className="num">{d.size}</td>
              <td className="num">{d.pages || '—'}</td>
              <td className="num">{d.chunks ? d.chunks.toLocaleString() : '—'}</td>
              <td style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{d.model}</td>
              <td><Pill variant={d.status || ''}>{d.statusLabel}</Pill></td>
              <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.when}</td>
              <td><button className="icon-btn" style={{ width: 22, height: 22 }}><Icon name="more-horizontal" size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </>}
      <UploadDocumentsModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}

Object.assign(window, { Documents });

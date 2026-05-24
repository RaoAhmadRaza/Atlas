// Atlas — Document Detail (/app/documents/[id])

function DocumentDetail({ onNavBack }) {
  const [tab, setTab] = useState('chunks');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState(null);
  const loaded = useFakeLoad(700);

  const chunks = [
    { ord: 1, tok: 487, text: 'Advanced Micro Devices, Inc. (AMD) reported revenue of $6.2 billion for the fourth quarter of 2023, an increase of 10% year-over-year. Data Center segment revenue was $2.3 billion, more than doubling year-over-year as MI300X shipments ramped through the quarter.' },
    { ord: 2, tok: 512, text: 'Gross margin on a GAAP basis was 46% in Q4 2023, compared to 43% in Q4 2022. Non-GAAP gross margin was 51%. The improvement was driven primarily by higher Data Center segment revenue, partially offset by lower Embedded segment revenue.' },
    { ord: 3, tok: 478, text: 'Operating income was $342 million GAAP and $1.4 billion non-GAAP. The largest reconciling item was $753 million of amortization of acquisition-related intangibles, primarily related to the Xilinx acquisition completed in February 2022.' },
    { ord: 4, tok: 491, text: 'For Q1 2024, AMD expects revenue of approximately $5.4 billion, plus or minus $300 million. Data Center segment revenue is expected to grow significantly year-over-year, while Client and Gaming are expected to decline seasonally.' },
    { ord: 5, tok: 503, text: 'Capital expenditures for fiscal year 2023 were $546 million, primarily for IT infrastructure and lab equipment. The company expects 2024 capex to be roughly flat with 2023 on an absolute basis.' },
  ];

  return (
    <div className="page" data-screen-label="10 Document Detail">
      <div style={{ marginBottom: 12 }}>
        <a onClick={onNavBack} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="arrow-left" size={14} /> Documents
        </a>
      </div>
      <div className="page-head">
        <div>
          <h1 style={{ fontFamily: 'var(--ff-mono)', fontSize: 22 }}>AMD-Q4-2023-10K.pdf</h1>
          <div className="sub">412 chunks · 124 pages · 2.4 MB · ingested 12 minutes ago</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="refresh-ccw">Reindex</Button>
          <Button variant="secondary" icon="download">Download</Button>
          <Button variant="destructive" icon="trash-2" onClick={() => setConfirmDelete(true)}>Delete</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 320px) 1fr', gap: 24 }}>
        <Card padding={20}>
          <div style={{ marginBottom: 16 }}><Pill variant="success">Ready</Pill></div>

          {[
            ['Title', 'AMD-Q4-2023-10K.pdf', true],
            ['Source URI', 'storage://acme-prod/docs/amd-q4-2023.pdf', true],
            ['MIME type', 'application/pdf'],
            ['Bytes', '2,485,712'],
            ['Pages', '124'],
            ['Chunks', '412'],
            ['Embedding', 'bge-large-en-v1.5'],
            ['Dimension', '1024'],
            ['Chunking', 'recursive-512×80'],
            ['Uploaded by', 'asad@acme.dev · 12m ago'],
          ].map(([label, value, mono]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <span style={{ color: 'var(--text-subtle)' }}>{label}</span>
              <span style={{ color: 'var(--text)', fontFamily: mono ? 'var(--ff-mono)' : 'var(--ff-ui)', wordBreak: 'break-all' }}>{value}</span>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>TAGS</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag>finance</Tag><Tag>10-K</Tag><Tag>amd</Tag>
              <a style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer' }}>+ add</a>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button variant="secondary" size="sm" icon="refresh-ccw">Reindex</Button>
            <Button variant="secondary" size="sm" icon="repeat">Re-embed with OpenAI</Button>
            <Button variant="secondary" size="sm" icon="download">Download original</Button>
          </div>
        </Card>

        <div>
          <Tabs
            tabs={[
              { id: 'chunks',   label: 'Chunks', count: 412 },
              { id: 'preview',  label: 'Preview' },
              { id: 'metadata', label: 'Metadata' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'chunks' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{loaded ? 'Showing 1–5 of 412' : <SkelLine w={140} h={10} />}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <Button variant="secondary" size="sm">← Prev</Button>
                  <Button variant="secondary" size="sm">Next →</Button>
                </span>
              </div>
              {!loaded && [0,1,2,3,4].map(i => (
                <div key={'s' + i} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                    <SkelLine w={60} h={10} />
                    <SkelLine w={40} h={10} />
                    <SkelLine w={60} h={14} style={{ marginLeft: 'auto' }} />
                  </div>
                  <SkelLine w={'100%'} h={10} style={{ marginBottom: 5 }} />
                  <SkelLine w={'95%'} h={10} style={{ marginBottom: 5 }} />
                  <SkelLine w={'70%'} h={10} />
                </div>
              ))}
              {loaded && chunks.map(c => {
                const expanded = expandedChunk === c.ord;
                return (
                  <div key={c.ord} onClick={() => setExpandedChunk(expanded ? null : c.ord)} style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 10, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>chunk #{c.ord}</span>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>· {c.tok} tok</span>
                      <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                        <Tag>bge-large</Tag>
                        <Tag>1024-d</Tag>
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, lineHeight: 1.55, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: expanded ? 'unset' : 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {c.text}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'preview' && (
            <div style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 32, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
              <Icon name="file-text" size={32} style={{ color: 'var(--text-subtle)', marginBottom: 12 }} />
              <div>PDF preview is rendered inline in the real app.</div>
              <div style={{ fontSize: 12, color: 'var(--text-subtle)', marginTop: 4 }}>Skipped in this prototype for performance.</div>
            </div>
          )}

          {tab === 'metadata' && (
            <pre style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text)', overflow: 'auto', margin: 0 }}>{`{
  "document_id": "doc_8f3a1c92",
  "tenant_id":   "ten_acme_prod",
  "title":       "AMD-Q4-2023-10K.pdf",
  "source_uri":  "storage://acme-prod/docs/amd-q4-2023.pdf",
  "mime_type":   "application/pdf",
  "bytes":       2485712,
  "sha256":      "a3f2bc91...c47d8e",
  "chunking":    { "strategy": "recursive", "size": 512, "overlap": 80, "tokenizer": "tiktoken" },
  "embeddings":  [ { "model": "bge-large-en-v1.5", "dim": 1024, "count": 412 } ],
  "tags":        ["finance", "10-K", "amd"],
  "uploaded_by": "user_asad_raza",
  "uploaded_at": "2026-05-20T14:02:18Z"
}`}</pre>
          )}
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete this document?"
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" icon="trash-2" onClick={() => { setConfirmDelete(false); onNavBack(); }}>Delete</Button>
          </>
        }
      >
        <strong>AMD-Q4-2023-10K.pdf</strong> and its <strong>412 chunks</strong> + <strong>412 embedding rows</strong> will be removed. Past chat conversations that cited this document will keep the references but the link targets will 404.
        <br /><br />
        This action is permanent.
      </Modal>
    </div>
  );
}

Object.assign(window, { DocumentDetail });

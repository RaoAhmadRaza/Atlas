(function () {
  const BASE = () => window.ATLAS_API_URL || 'http://localhost:8000';

  function tenantHeader() {
    const id = localStorage.getItem('dev_tenant_id') || '';
    return id ? { 'X-Tenant-ID': id } : {};
  }

  window.api = {
    stream: (path, body) =>
      fetch(BASE() + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...tenantHeader() },
        body: JSON.stringify(body),
      }),

    upload: (path, form) =>
      fetch(BASE() + path, {
        method: 'POST',
        headers: tenantHeader(),
        body: form,
      }),

    get: (path) =>
      fetch(BASE() + path, { headers: tenantHeader() }),
  };
})();

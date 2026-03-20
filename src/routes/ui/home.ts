import { htmlShell, nav } from "./shared";

export function homePage(): string {
  const body = `
  ${nav(null, "/")}

  <main class="max-w-3xl mx-auto px-4 py-10">

    <!-- Step 1: Create Workspace -->
    <div id="step-workspace" class="fade-in">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-light mb-4">
          <svg class="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Create your workspace</h1>
        <p class="text-gray-500 mt-1 text-sm">A workspace groups your documents and keeps retrieval isolated.</p>
      </div>

      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-md mx-auto">
        <label class="block text-sm font-medium text-gray-700 mb-1.5">Workspace ID</label>
        <input
          id="ws-input"
          type="text"
          placeholder="e.g. ws_acme or hr_team"
          maxlength="64"
          class="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition"
        />
        <p class="text-xs text-gray-400 mt-1.5">Use letters, numbers, underscores or hyphens.</p>
        <p id="ws-error" class="text-xs text-red-500 mt-1.5 hidden"></p>
        <button
          id="ws-btn"
          onclick="createWorkspace()"
          class="mt-4 w-full bg-brand hover:bg-brand-hover text-white text-sm font-medium py-2.5 rounded-lg transition"
        >
          Create workspace
        </button>
      </div>
    </div>

    <!-- Step 2: Upload Documents -->
    <div id="step-upload" class="hidden fade-in">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Upload documents</h1>
          <p class="text-gray-500 mt-0.5 text-sm">Supported formats: <code class="bg-gray-100 px-1 rounded text-xs">.txt</code> and <code class="bg-gray-100 px-1 rounded text-xs">.md</code></p>
        </div>
        <div class="flex items-center gap-2">
          <span id="ws-badge" class="text-xs bg-brand-light text-brand px-2.5 py-1 rounded-full font-medium border border-indigo-200"></span>
          <button onclick="changeWorkspace()" class="text-xs text-gray-400 hover:text-gray-600 underline">Change</button>
        </div>
      </div>

      <!-- Drop zone -->
      <div
        id="dropzone"
        ondragover="event.preventDefault(); this.classList.add('border-brand','bg-brand-light')"
        ondragleave="this.classList.remove('border-brand','bg-brand-light')"
        ondrop="handleDrop(event)"
        onclick="document.getElementById('file-input').click()"
        class="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer transition hover:border-brand hover:bg-brand-light group"
      >
        <div class="flex flex-col items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-white flex items-center justify-center transition">
            <svg class="w-6 h-6 text-gray-400 group-hover:text-brand transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700 group-hover:text-brand transition">Click or drag a file here</p>
            <p class="text-xs text-gray-400 mt-0.5">.txt or .md · max 5 MB</p>
          </div>
        </div>
        <input id="file-input" type="file" accept=".txt,.md" class="hidden" onchange="handleFileSelect(this)" />
      </div>

      <!-- Selected file preview -->
      <div id="file-preview" class="hidden mt-4 bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div>
            <p id="file-name" class="text-sm font-medium text-gray-800"></p>
            <p id="file-size" class="text-xs text-gray-400"></p>
          </div>
        </div>
        <button onclick="clearFile()" class="text-gray-400 hover:text-gray-600 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Upload button -->
      <button
        id="upload-btn"
        onclick="uploadFile()"
        disabled
        class="mt-4 w-full bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition flex items-center justify-center gap-2"
      >
        Upload & index document
      </button>

      <!-- Upload status -->
      <div id="upload-status" class="hidden mt-4"></div>

      <!-- Uploaded documents list -->
      <div id="docs-list" class="mt-6"></div>

      <!-- Chat link -->
      <div class="mt-8 text-center">
        <a href="/chat" class="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          Go to Chat
        </a>
      </div>
    </div>
  </main>

  <script>
    const WS_KEY = 'rag_workspace_id';

    function slugify(s) {
      return s.trim().toLowerCase().replace(/\\s+/g, '_').replace(/[^a-z0-9_-]/g, '');
    }

    function showError(el, msg) {
      el.textContent = msg;
      el.classList.remove('hidden');
    }

    function hideError(el) {
      el.classList.add('hidden');
    }

    function initPage() {
      const ws = localStorage.getItem(WS_KEY);
      if (ws) showUploadStep(ws);
    }

    function createWorkspace() {
      const input = document.getElementById('ws-input');
      const errEl = document.getElementById('ws-error');
      const raw = input.value.trim();
      const ws = slugify(raw);

      hideError(errEl);
      if (!ws) return showError(errEl, 'Please enter a workspace name.');
      if (!/^[a-z0-9][a-z0-9_-]{0,62}$/.test(ws)) {
        return showError(errEl, 'Use only lowercase letters, numbers, _ or -. Must start with a letter or number.');
      }

      localStorage.setItem(WS_KEY, ws);
      showUploadStep(ws);
    }

    document.getElementById('ws-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createWorkspace();
    });

    function showUploadStep(ws) {
      document.getElementById('step-workspace').classList.add('hidden');
      document.getElementById('step-upload').classList.remove('hidden');
      document.getElementById('ws-badge').textContent = ws;
      loadDocsFromStorage();
    }

    function changeWorkspace() {
      localStorage.removeItem(WS_KEY);
      selectedFile = null;
      document.getElementById('step-upload').classList.add('hidden');
      const step = document.getElementById('step-workspace');
      step.classList.remove('hidden');
      step.classList.add('fade-in');
      document.getElementById('ws-input').value = '';
    }

    let selectedFile = null;

    function formatBytes(b) {
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function setFile(file) {
      selectedFile = file;
      document.getElementById('file-name').textContent = file.name;
      document.getElementById('file-size').textContent = formatBytes(file.size);
      document.getElementById('file-preview').classList.remove('hidden');
      document.getElementById('upload-btn').disabled = false;
    }

    function clearFile() {
      selectedFile = null;
      document.getElementById('file-input').value = '';
      document.getElementById('file-preview').classList.add('hidden');
      document.getElementById('upload-btn').disabled = true;
    }

    function handleFileSelect(input) {
      if (input.files[0]) setFile(input.files[0]);
    }

    function handleDrop(e) {
      e.preventDefault();
      document.getElementById('dropzone').classList.remove('border-brand', 'bg-brand-light');
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md'].includes(ext)) {
        setStatusError('Only .txt and .md files are supported.');
        return;
      }
      setFile(file);
    }

    function setStatusUploading() {
      const el = document.getElementById('upload-status');
      el.classList.remove('hidden');
      el.innerHTML = \`<div class="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-4 py-3">
        <span class="spinner"></span> Uploading and indexing document...
      </div>\`;
    }

    function setStatusSuccess(data) {
      const el = document.getElementById('upload-status');
      el.innerHTML = \`<div class="text-sm bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 fade-in">
        <p class="font-medium">Document indexed successfully</p>
        <p class="text-xs mt-1 text-green-600">document_id: \${data.document_id} · \${data.chunk_count} chunk\${data.chunk_count !== 1 ? 's' : ''}</p>
      </div>\`;
    }

    function setStatusError(msg) {
      const el = document.getElementById('upload-status');
      el.classList.remove('hidden');
      el.innerHTML = \`<div class="text-sm bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 fade-in">
        <p class="font-medium">Upload failed</p>
        <p class="text-xs mt-1">\${msg}</p>
      </div>\`;
    }

    function loadDocsFromStorage() {
      const ws = localStorage.getItem(WS_KEY);
      if (!ws) return;
      const raw = localStorage.getItem('rag_docs_' + ws);
      if (!raw) return;
      try {
        const docs = JSON.parse(raw);
        renderDocsList(docs);
      } catch {}
    }

    function addDocToStorage(ws, doc) {
      const key = 'rag_docs_' + ws;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(doc);
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 20)));
      renderDocsList(existing.slice(0, 20));
    }

    function renderDocsList(docs) {
      const container = document.getElementById('docs-list');
      if (!docs || docs.length === 0) { container.innerHTML = ''; return; }
      container.innerHTML = \`
        <h3 class="text-sm font-semibold text-gray-700 mb-2">Indexed documents (\${docs.length})</h3>
        <div class="space-y-2">
          \${docs.map(d => \`
            <div class="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm fade-in">
              <span class="font-medium text-gray-800 truncate">\${d.title}</span>
              <span class="text-xs text-gray-400 ml-4 flex-shrink-0">\${d.chunkCount} chunk\${d.chunkCount !== 1 ? 's' : ''}</span>
            </div>
          \`).join('')}
        </div>\`;
    }

    async function uploadFile() {
      const ws = localStorage.getItem(WS_KEY);
      if (!ws || !selectedFile) return;

      const btn = document.getElementById('upload-btn');
      btn.disabled = true;
      setStatusUploading();

      try {
        const form = new FormData();
        form.append('workspace_id', ws);
        form.append('file', selectedFile);

        const res = await fetch('/upload', { method: 'POST', body: form });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Upload failed');
        }

        setStatusSuccess(data);
        addDocToStorage(ws, { title: selectedFile.name, chunkCount: data.chunk_count, docId: data.document_id });
        clearFile();
      } catch (err) {
        setStatusError(err.message || 'Unexpected error');
      } finally {
        btn.disabled = false;
      }
    }

    initPage();
  </script>
  `;

  return htmlShell("Home", body);
}

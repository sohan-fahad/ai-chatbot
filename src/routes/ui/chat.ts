import { htmlShell, nav } from "./shared";

export function chatPage(): string {
  const body = `
  ${nav(null, "/chat")}

  <main class="max-w-3xl mx-auto px-4 flex flex-col" style="height: calc(100vh - 3.5rem);">

    <!-- Workspace guard banner (shown if no workspace) -->
    <div id="no-workspace-banner" class="hidden mt-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
      No workspace selected.
      <a href="/" class="underline font-medium ml-1">Go to Home to create one →</a>
    </div>

    <!-- Thread: messages -->
    <div id="thread" class="flex-1 overflow-y-auto py-6 space-y-5 scroll-smooth">
      <div id="empty-state" class="flex flex-col items-center justify-center h-full text-center opacity-60">
        <div class="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
          <svg class="w-7 h-7 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-600">Ask anything about your documents</p>
        <p class="text-xs text-gray-400 mt-1">Answers are grounded in indexed content only</p>
      </div>
    </div>

    <!-- Input bar -->
    <div id="input-area" class="border-t border-gray-200 bg-white py-4 sticky bottom-0">
      <div class="flex gap-3 items-end">
        <div class="flex-1 relative">
          <textarea
            id="query-input"
            rows="1"
            placeholder="Ask a question about your documents..."
            maxlength="2000"
            oninput="autoResize(this)"
            onkeydown="handleKey(event)"
            class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand resize-none transition leading-relaxed"
            style="max-height: 180px; overflow-y: auto;"
          ></textarea>
        </div>
        <button
          id="send-btn"
          onclick="sendQuery()"
          class="flex-shrink-0 w-10 h-10 rounded-xl bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
      <p id="ws-label" class="text-xs text-gray-400 mt-2 text-right"></p>
    </div>
  </main>

  <script>
    const WS_KEY = 'rag_workspace_id';
    let isStreaming = false;

    function initChat() {
      const ws = localStorage.getItem(WS_KEY);
      if (!ws) {
        document.getElementById('no-workspace-banner').classList.remove('hidden');
        document.getElementById('input-area').classList.add('hidden');
        return;
      }
      document.getElementById('ws-label').textContent = 'workspace: ' + ws;
    }

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 180) + 'px';
    }

    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuery();
      }
    }

    function scrollToBottom() {
      const thread = document.getElementById('thread');
      thread.scrollTop = thread.scrollHeight;
    }

    function hideEmptyState() {
      const es = document.getElementById('empty-state');
      if (es) es.remove();
    }

    function addUserBubble(text) {
      hideEmptyState();
      const thread = document.getElementById('thread');
      const div = document.createElement('div');
      div.className = 'flex justify-end fade-in';
      div.innerHTML = \`
        <div class="max-w-[80%] bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          \${escHtml(text)}
        </div>\`;
      thread.appendChild(div);
      scrollToBottom();
    }

    function addAssistantBubble() {
      const thread = document.getElementById('thread');
      const wrap = document.createElement('div');
      wrap.className = 'flex gap-3 fade-in';
      wrap.id = 'last-assistant';
      wrap.innerHTML = \`
        <div class="w-7 h-7 rounded-full bg-brand-light flex-shrink-0 flex items-center justify-center mt-0.5">
          <svg class="w-3.5 h-3.5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <div id="answer-bubble" class="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed text-gray-800 prose-answer">
            <span class="spinner"></span>
          </div>
          <div id="citations-block" class="hidden mt-2 space-y-1"></div>
        </div>\`;
      thread.appendChild(wrap);
      scrollToBottom();
      return {
        bubble: wrap.querySelector('#answer-bubble'),
        citationsBlock: wrap.querySelector('#citations-block'),
      };
    }

    function renderCitations(citations, citationsBlock) {
      if (!citations || citations.length === 0) return;
      citationsBlock.classList.remove('hidden');
      citationsBlock.innerHTML = \`
        <p class="text-xs text-gray-400 mb-1 font-medium">Sources</p>
        \${citations.map(c => \`
          <div class="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
            <span class="text-brand font-semibold">[\${c.index}]</span>
            <span class="font-medium text-gray-700 truncate">\${escHtml(c.title)}</span>
            <span class="text-gray-400 flex-shrink-0">· \${(c.score * 100).toFixed(0)}%</span>
          </div>
        \`).join('')}
      \`;
    }

    function escHtml(s) {
      return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function setSendState(busy) {
      isStreaming = busy;
      const btn = document.getElementById('send-btn');
      const input = document.getElementById('query-input');
      btn.disabled = busy;
      input.disabled = busy;
      if (busy) {
        btn.innerHTML = \`<span class="w-3 h-3 rounded-full bg-white opacity-70 animate-pulse"></span>\`;
      } else {
        btn.innerHTML = \`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>\`;
      }
    }

    async function sendQuery() {
      if (isStreaming) return;
      const ws = localStorage.getItem(WS_KEY);
      if (!ws) return;

      const input = document.getElementById('query-input');
      const query = input.value.trim();
      if (!query) return;

      input.value = '';
      input.style.height = 'auto';

      addUserBubble(query);
      const { bubble, citationsBlock } = addAssistantBubble();
      setSendState(true);

      try {
        const res = await fetch('/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ workspace_id: ws, query, stream: true }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Request failed (' + res.status + ')');
        }

        const contentType = res.headers.get('content-type') || '';

        // Non-streaming fallback (e.g. no-context early return)
        if (!contentType.includes('text/event-stream')) {
          const data = await res.json();
          bubble.innerHTML = \`<span class="italic text-gray-400">\${escHtml(data.answer || 'No answer.')}</span>\`;
          renderCitations(data.citations, citationsBlock);
          setSendState(false);
          return;
        }

        // Streaming SSE
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let citations = null;

        bubble.innerHTML = '<span class="cursor-blink"></span>';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') continue;

            try {
              const parsed = JSON.parse(raw);
              // citations payload at end
              if (parsed.citations) {
                citations = parsed.citations;
                continue;
              }
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                bubble.innerHTML = formatAnswer(fullText) + '<span class="cursor-blink"></span>';
                scrollToBottom();
              }
            } catch {}
          }
        }

        // Final render
        if (fullText) {
          bubble.innerHTML = formatAnswer(fullText);
        } else {
          bubble.innerHTML = '<span class="italic text-gray-400">I do not know based on the available context.</span>';
        }

        if (citations) renderCitations(citations, citationsBlock);
        scrollToBottom();

      } catch (err) {
        bubble.innerHTML = \`<span class="text-red-500 text-xs">\${escHtml(err.message || 'Unexpected error')}</span>\`;
      } finally {
        setSendState(false);
        input.focus();
      }
    }

    function formatAnswer(text) {
      // Minimal markdown-ish: bold, code, line breaks
      return escHtml(text)
        .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
        .replace(/\`(.*?)\`/g, '<code>$1</code>')
        .replace(/\\n/g, '<br/>');
    }

    initChat();
  </script>
  `;

  return htmlShell("Chat", body);
}

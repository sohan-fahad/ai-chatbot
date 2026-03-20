export function htmlShell(title: string, bodyHtml: string, headExtra = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — RAG Chatbot</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
          colors: {
            brand: { DEFAULT: '#6366f1', hover: '#4f46e5', light: '#eef2ff' }
          }
        }
      }
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ${headExtra}
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; }
    .prose-answer p { margin-bottom: 0.75rem; }
    .prose-answer code { background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; }
    .prose-answer strong { font-weight: 600; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .cursor-blink { display:inline-block; width:2px; height:1em; background:#6366f1; margin-left:1px; vertical-align:text-bottom; animation:blink 1s step-start infinite; }
    .spinner { width:18px; height:18px; border:2px solid #e0e7ff; border-top-color:#6366f1; border-radius:50%; animation:spin .7s linear infinite; display:inline-block; }
    @keyframes spin { to { transform:rotate(360deg) } }
    .fade-in { animation: fadeIn 0.2s ease; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
  </style>
</head>
<body class="bg-gray-50 min-h-screen text-gray-900 antialiased">
  ${bodyHtml}
</body>
</html>`;
}

export function nav(workspaceId: string | null, currentPath: "/" | "/chat"): string {
  const badge = workspaceId
    ? `<span class="text-xs bg-brand-light text-brand px-2.5 py-1 rounded-full font-medium border border-indigo-200">
         <span class="opacity-60 mr-1">workspace</span>${workspaceId}
       </span>`
    : "";

  const link =
    currentPath === "/chat"
      ? `<a href="/" class="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
           Home
         </a>`
      : `<a href="/chat" class="text-sm text-brand hover:text-brand-hover font-medium">Go to Chat →</a>`;

  return `
  <nav class="border-b border-gray-200 bg-white sticky top-0 z-10">
    <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <span class="font-semibold text-gray-900 text-sm">RAG Chatbot</span>
        ${badge}
      </div>
      <div>${link}</div>
    </div>
  </nav>`;
}

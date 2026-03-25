/**
 * HTML App Boilerplate
 *
 * A fully-wired, production-ready HTML shell that Claude fills with
 * application-specific content. Router, modal, toast, localStorage DB,
 * and event delegation are pre-built so they cannot be accidentally broken.
 */

export const HTML_APP_BOILERPLATE = `
══════════════════════════════════════════════════════════════
MANDATORY HTML BOILERPLATE — START FROM THIS EXACTLY
══════════════════════════════════════════════════════════════
You MUST start from the template below. Do NOT invent your own router, modal, or event system.
Replace every {PLACEHOLDER} with your own content. Add your pages, your styles, your data inside the marked zones.
The infrastructure (Router, App, DB, modal, toast, event delegation) is pre-built — do NOT rewrite it.

\`\`\`html
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{APP_TITLE}</title>
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="https://unpkg.com/aos@2.3.4/dist/aos.css" rel="stylesheet">
  <style>
    /* ── DESIGN SYSTEM ──────────────────────────────── */
    :root {
      --primary: {PRIMARY_COLOR};     /* e.g. #6366f1 */
      --primary-dark: {PRIMARY_DARK}; /* e.g. #4f46e5 */
      --accent: {ACCENT_COLOR};       /* e.g. #a78bfa */
      --bg: #f8f8fc;
      --surface: #ffffff;
      --surface2: #f1f0f9;
      --border: rgba(0,0,0,0.08);
      --text: #0f0f18;
      --text-muted: #6b7280;
      --radius: 14px;
      --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.06);
      --shadow-md: 0 2px 8px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10);
      --transition: all 0.2s ease;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Rubik', 'Inter', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

    /* ── ROUTER: pages hidden by default ────────────── */
    .page { display: none; }
    .page.active { display: block; }

    /* ── NAV ─────────────────────────────────────────── */
    .app-nav {
      position: sticky; top: 0; z-index: 100; height: 64px;
      background: rgba(255,255,255,0.9); backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 28px; gap: 8px;
    }
    .nav-brand { font-size: 18px; font-weight: 700; color: var(--primary); margin-inline-end: auto; }
    .nav-link {
      padding: 8px 16px; border-radius: 8px; text-decoration: none;
      color: var(--text-muted); font-weight: 500; font-size: 14px; transition: var(--transition);
    }
    .nav-link:hover { background: var(--surface2); color: var(--text); }
    .nav-link.active { background: var(--primary); color: #fff; }

    /* ── BUTTONS ─────────────────────────────────────── */
    .btn { display: inline-flex; align-items: center; gap: 8px; border: none; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 600; padding: 10px 20px; transition: var(--transition); text-decoration: none; }
    .btn-primary { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: #fff; box-shadow: 0 4px 14px rgba(99,102,241,0.3); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(99,102,241,0.4); }
    .btn-secondary { background: var(--surface); color: var(--text); border: 1.5px solid var(--border); }
    .btn-secondary:hover { background: var(--surface2); }
    .btn-danger { background: #fee2e2; color: #dc2626; border: 1.5px solid #fecaca; }
    .btn-danger:hover { background: #fecaca; }
    .btn-sm { padding: 6px 12px; font-size: 13px; }

    /* ── CARDS ───────────────────────────────────────── */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; box-shadow: var(--shadow-sm); transition: var(--transition); }
    .card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

    /* ── TABLE ───────────────────────────────────────── */
    .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow-sm); }
    table { width: 100%; border-collapse: collapse; }
    thead { background: var(--surface2); }
    th { padding: 12px 16px; text-align: start; font-size: 13px; font-weight: 600; color: var(--text-muted); }
    td { padding: 12px 16px; border-top: 1px solid var(--border); font-size: 14px; }
    tr:hover td { background: var(--surface2); }

    /* ── FORM ────────────────────────────────────────── */
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    input, select, textarea {
      width: 100%; padding: 10px 14px; border: 1.5px solid var(--border);
      border-radius: 8px; font-family: inherit; font-size: 14px;
      background: var(--surface); color: var(--text); outline: none; transition: var(--transition);
    }
    input:focus, select:focus, textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    textarea { resize: vertical; min-height: 100px; }

    /* ── MODAL ───────────────────────────────────────── */
    .modal-overlay {
      display: none; position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
      align-items: center; justify-content: center; padding: 24px;
    }
    .modal-overlay.open { display: flex; }
    .modal-box {
      background: var(--surface); border-radius: 18px; width: 100%; max-width: 520px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.2); overflow: hidden;
      animation: modalIn 0.2s ease;
    }
    @keyframes modalIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .modal-header h3 { font-size: 17px; font-weight: 700; }
    .modal-close { background: var(--surface2); border: none; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; font-size: 18px; color: var(--text-muted); transition: var(--transition); }
    .modal-close:hover { background: #fee2e2; color: #dc2626; }
    .modal-body { padding: 24px; }
    .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

    /* ── TOAST ───────────────────────────────────────── */
    #toast-container { position: fixed; bottom: 24px; inset-inline-end: 24px; z-index: 2000; display: flex; flex-direction: column; gap: 8px; }
    .toast { padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; box-shadow: var(--shadow-md); animation: toastIn 0.3s ease; min-width: 240px; }
    @keyframes toastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .toast-success { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .toast-error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .toast-info { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }

    /* ── LAYOUT HELPERS ──────────────────────────────── */
    .container { max-width: 1180px; margin: 0 auto; padding: 0 28px; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; padding-top: 36px; }
    .page-header h1 { font-size: 28px; font-weight: 700; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
    .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 24px; box-shadow: var(--shadow-sm); }
    .stat-card .stat-value { font-size: 32px; font-weight: 800; color: var(--primary); line-height: 1; }
    .stat-card .stat-label { font-size: 13px; color: var(--text-muted); margin-top: 4px; font-weight: 500; }
    .empty-state { text-align: center; padding: 64px 24px; color: var(--text-muted); }
    .empty-state .empty-icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state p { font-size: 16px; }

    /* ── RESPONSIVE ──────────────────────────────────── */
    @media (max-width: 768px) {
      .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
      .container { padding: 0 16px; }
      .app-nav { padding: 0 16px; }
      .nav-link span { display: none; }
    }

    /* ── {APP_CUSTOM_STYLES} ── add app-specific styles below ── */
    {CUSTOM_STYLES}
  </style>
</head>
<body>

  <!-- ── NAVIGATION ──────────────────────────────────────── -->
  <nav class="app-nav">
    <div class="nav-brand">{APP_NAME}</div>
    <!-- ADD NAV LINKS: <a href="#" data-page="dashboard" class="nav-link active">לוח בקרה</a> -->
    {NAV_LINKS}
  </nav>

  <!-- ── PAGES (all in DOM — router toggles .active) ─────── -->
  <main>
    <!-- ADD PAGES: <div id="page-dashboard" class="page active"><div class="container">...</div></div> -->
    {PAGES_HTML}
  </main>

  <!-- ── MODAL (do not change structure — only fill content dynamically) ── -->
  <div id="modal-overlay" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-header">
        <h3 id="modal-title">Title</h3>
        <button class="modal-close" data-action="close-modal">✕</button>
      </div>
      <div class="modal-body" id="modal-body"></div>
      <div class="modal-footer" id="modal-footer"></div>
    </div>
  </div>

  <!-- ── TOAST CONTAINER ─────────────────────────────────── -->
  <div id="toast-container"></div>

  <!-- ── AOS + SCRIPTS ───────────────────────────────────── -->
  <script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>
  <script>
  // ═══════════════════════════════════════════════════════════
  // INFRASTRUCTURE — DO NOT MODIFY THIS BLOCK
  // ═══════════════════════════════════════════════════════════

  // ── Router ──────────────────────────────────────────────────
  const Router = {
    current: null,
    navigate(page) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const target = document.getElementById('page-' + page);
      if (!target) { console.warn('Router: no page with id=page-' + page); return; }
      target.classList.add('active');
      Router.current = page;
      const link = document.querySelector('[data-page="' + page + '"]');
      if (link) link.classList.add('active');
      if (Pages[page] && typeof Pages[page].render === 'function') Pages[page].render();
    }
  };

  // ── Modal ────────────────────────────────────────────────────
  const Modal = {
    open(title, bodyHtml, footerHtml = '') {
      document.getElementById('modal-title').textContent = title;
      document.getElementById('modal-body').innerHTML = bodyHtml;
      document.getElementById('modal-footer').innerHTML = footerHtml;
      document.getElementById('modal-overlay').classList.add('open');
    },
    close() {
      document.getElementById('modal-overlay').classList.remove('open');
      document.getElementById('modal-body').innerHTML = '';
      document.getElementById('modal-footer').innerHTML = '';
    }
  };

  // ── Toast ────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = message;
    document.getElementById('toast-container').appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── LocalStorage DB ──────────────────────────────────────────
  const DB = {
    _key: '{APP_KEY}',
    load(table, def = []) {
      try { return JSON.parse(localStorage.getItem(this._key + '_' + table)) ?? def; } catch { return def; }
    },
    save(table, data) {
      localStorage.setItem(this._key + '_' + table, JSON.stringify(data));
    },
    nextId(table) {
      const items = this.load(table);
      return items.length > 0 ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
    }
  };

  // ── Global event delegation (nav + actions) ──────────────────
  document.addEventListener('click', function(e) {
    const nav = e.target.closest('[data-page]');
    if (nav) { e.preventDefault(); Router.navigate(nav.dataset.page); return; }
    const action = e.target.closest('[data-action]');
    if (action) { e.preventDefault(); App.handleAction(action.dataset.action, action.dataset); return; }
  });

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) Modal.close();
  });

  // ═══════════════════════════════════════════════════════════
  // APPLICATION CODE — FILL IN BELOW
  // ═══════════════════════════════════════════════════════════

  // ── Pages: each page has a render() function ─────────────────
  const Pages = {
    // FILL IN — one entry per page:
    // dashboard: { render() { document.getElementById('page-dashboard').innerHTML = renderDashboard(); } },
    {PAGES_JS}
  };

  // ── App: data init + action handler ──────────────────────────
  const App = {
    init() {
      // FILL IN — seed data if first run, then navigate to default page
      // if (!DB.load('seeded').length) { DB.save('items', [...SEED_DATA]); DB.save('seeded',[1]); }
      {APP_INIT}
      Router.navigate('{DEFAULT_PAGE}');
    },

    handleAction(action, data) {
      // FILL IN — one case per data-action value:
      // switch(action) {
      //   case 'add-client': openAddClientModal(); break;
      //   case 'delete-client': deleteClient(data.id); break;
      //   case 'edit-client': openEditClientModal(data.id); break;
      //   case 'save-client': saveClient(); break;
      // }
      switch(action) {
        case 'close-modal': Modal.close(); break;
        {ACTION_CASES}
        default: console.warn('Unhandled action:', action);
      }
    }
  };

  // ── Helper render functions ───────────────────────────────────
  // FILL IN — renderXxx() functions that build HTML strings and inject into page divs
  {RENDER_FUNCTIONS}

  // ── Init ────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    AOS.init({ once: true, offset: 60, duration: 500 });
    App.init();
  });
  </script>
</body>
</html>
\`\`\`

FILLING IN THE TEMPLATE — MANDATORY RULES:
1. Replace every {PLACEHOLDER} with actual content
2. {APP_KEY} → short unique slug (e.g. 'insurance', 'crm', 'tasks')
3. {PRIMARY_COLOR} → brand hex matching the app domain (e.g. #1d4ed8 for finance)
4. {NAV_LINKS} → one <a data-page="X"> per page
5. {PAGES_HTML} → one <div id="page-X" class="page"> per page, first one gets class="page active"
6. {PAGES_JS} → Pages.X = { render() { ... } } for each page
7. {APP_INIT} → seed localStorage if empty, call renderXxx() for each page
8. {ACTION_CASES} → one case per button/link in the app
9. {RENDER_FUNCTIONS} → one renderXxx() that builds and injects HTML into the page div
10. NEVER leave a {PLACEHOLDER} in the output — replace them ALL
`;

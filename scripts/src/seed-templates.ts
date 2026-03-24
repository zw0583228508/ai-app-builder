/**
 * Seed Templates Script — Issues 80-82
 * Seeds the database with initial template content for the AI App Builder.
 * Run: pnpm --filter @workspace/scripts run seed-templates
 */
import { db, templatesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const SEED_TEMPLATES = [
  {
    title: "Landing Page",
    description: "דף נחיתה מודרני עם CTA, features, ו-testimonials",
    stack: "html" as const,
    tags: ["landing", "marketing", "saas"],
    thumbnail: null,
    isPublic: true,
    previewHtml: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Page Template</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white">
  <nav class="flex items-center justify-between p-6 max-w-7xl mx-auto">
    <div class="text-xl font-bold text-indigo-400">MyApp</div>
    <div class="flex gap-4">
      <a href="#" class="text-gray-400 hover:text-white">תכונות</a>
      <a href="#" class="text-gray-400 hover:text-white">מחירים</a>
      <button class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg">התחל בחינם</button>
    </div>
  </nav>
  <main class="max-w-7xl mx-auto px-6 py-20 text-center">
    <h1 class="text-6xl font-bold mb-6">בנה משהו <span class="text-indigo-400">מדהים</span></h1>
    <p class="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">תיאור קצר וממוקד של הפתרון שלך. מה הלקוח מרוויח ולמה כדאי לו להצטרף.</p>
    <div class="flex gap-4 justify-center">
      <button class="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-xl text-lg font-semibold">התחל עכשיו</button>
      <button class="border border-gray-700 hover:border-gray-500 px-8 py-3 rounded-xl text-lg">למד עוד</button>
    </div>
    <div class="grid grid-cols-3 gap-8 mt-20">
      <div class="bg-gray-900 p-6 rounded-xl">
        <div class="text-3xl mb-3">⚡</div>
        <h3 class="text-lg font-semibold mb-2">מהיר</h3>
        <p class="text-gray-400">תיאור תכונה ראשונה</p>
      </div>
      <div class="bg-gray-900 p-6 rounded-xl">
        <div class="text-3xl mb-3">🔒</div>
        <h3 class="text-lg font-semibold mb-2">מאובטח</h3>
        <p class="text-gray-400">תיאור תכונה שנייה</p>
      </div>
      <div class="bg-gray-900 p-6 rounded-xl">
        <div class="text-3xl mb-3">🎯</div>
        <h3 class="text-lg font-semibold mb-2">מדויק</h3>
        <p class="text-gray-400">תיאור תכונה שלישית</p>
      </div>
    </div>
  </main>
</body>
</html>`,
  },
  {
    title: "Dashboard",
    description: "לוח מחוונים עם כרטיסי KPI, גרפים, ורשימת פעילות",
    stack: "html" as const,
    tags: ["dashboard", "admin", "analytics"],
    thumbnail: null,
    isPublic: true,
    previewHtml: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Template</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
</head>
<body class="bg-gray-950 text-white flex">
  <aside class="w-64 bg-gray-900 h-screen p-6">
    <div class="text-xl font-bold text-indigo-400 mb-8">לוח בקרה</div>
    <nav class="space-y-2">
      <a href="#" class="flex items-center gap-3 p-3 bg-indigo-600 rounded-lg">📊 סקירה</a>
      <a href="#" class="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">👥 משתמשים</a>
      <a href="#" class="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">📈 אנליטיקה</a>
      <a href="#" class="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg">⚙️ הגדרות</a>
    </nav>
  </aside>
  <main class="flex-1 p-8">
    <h1 class="text-2xl font-bold mb-6">שלום, יוזר! 👋</h1>
    <div class="grid grid-cols-4 gap-4 mb-8">
      <div class="bg-gray-900 p-4 rounded-xl">
        <div class="text-gray-400 text-sm">משתמשים פעילים</div>
        <div class="text-3xl font-bold mt-1">12,543</div>
        <div class="text-green-400 text-sm mt-1">+8.2%</div>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl">
        <div class="text-gray-400 text-sm">הכנסה חודשית</div>
        <div class="text-3xl font-bold mt-1">₪84,200</div>
        <div class="text-green-400 text-sm mt-1">+12.1%</div>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl">
        <div class="text-gray-400 text-sm">הזמנות חדשות</div>
        <div class="text-3xl font-bold mt-1">342</div>
        <div class="text-red-400 text-sm mt-1">-3.4%</div>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl">
        <div class="text-gray-400 text-sm">שביעות רצון</div>
        <div class="text-3xl font-bold mt-1">4.8/5</div>
        <div class="text-green-400 text-sm mt-1">+0.2</div>
      </div>
    </div>
    <div class="bg-gray-900 p-6 rounded-xl">
      <h2 class="text-lg font-semibold mb-4">גידול משתמשים</h2>
      <canvas id="chart" height="80"></canvas>
    </div>
  </main>
  <script>
    new Chart(document.getElementById('chart'), {
      type: 'line',
      data: {
        labels: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני'],
        datasets: [{ label: 'משתמשים', data: [5000,7000,8500,10000,11500,12543], borderColor: '#6366f1', tension: 0.4, fill: true, backgroundColor: 'rgba(99,102,241,0.1)' }]
      },
      options: { plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#9ca3af' } }, y: { ticks: { color: '#9ca3af' } } } }
    });
  </script>
</body>
</html>`,
  },
  {
    title: "Todo App",
    description: "אפליקציית רשימת מטלות עם הוספה, מחיקה, וסינון",
    stack: "html" as const,
    tags: ["todo", "productivity", "app"],
    thumbnail: null,
    isPublic: true,
    previewHtml: `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Todo App</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-950 text-white min-h-screen flex items-center justify-center p-4">
  <div class="bg-gray-900 rounded-2xl p-8 w-full max-w-md">
    <h1 class="text-2xl font-bold mb-6 text-center">✅ המטלות שלי</h1>
    <div class="flex gap-2 mb-6">
      <input id="input" class="flex-1 bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="הוסף מטלה חדשה..." />
      <button onclick="addTodo()" class="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg">הוסף</button>
    </div>
    <div id="list" class="space-y-2"></div>
  </div>
  <script>
    let todos = [{text:'קנות מצרכים',done:false},{text:'לגמור את הפרויקט',done:true}];
    function render() {
      const list = document.getElementById('list');
      list.innerHTML = todos.map((t,i) => \`<div class="flex items-center gap-3 bg-gray-800 p-3 rounded-lg">
        <input type="checkbox" \${t.done?'checked':''} onchange="toggle(\${i})" class="w-4 h-4 accent-indigo-500"/>
        <span class="\${t.done?'line-through text-gray-500':'text-white'} flex-1">\${t.text}</span>
        <button onclick="del(\${i})" class="text-red-400 hover:text-red-300">✕</button>
      </div>\`).join('');
    }
    function addTodo() { const v=document.getElementById('input').value.trim(); if(v){todos.push({text:v,done:false});document.getElementById('input').value='';render();} }
    function toggle(i){todos[i].done=!todos[i].done;render();}
    function del(i){todos.splice(i,1);render();}
    document.getElementById('input').addEventListener('keypress', e=>e.key==='Enter'&&addTodo());
    render();
  </script>
</body>
</html>`,
  },
];

async function seedTemplates() {
  console.log("🌱 Seeding templates...");

  let inserted = 0;
  let skipped = 0;

  for (const template of SEED_TEMPLATES) {
    try {
      await db
        .insert(templatesTable)
        .values({
          userId: "system",
          title: template.title,
          description: template.description,
          stack: template.stack,
          tags: template.tags,
          isPublic: template.isPublic,
          previewHtml: template.previewHtml,
          uses: 0,
        })
        .onConflictDoNothing();
      console.log(`  ✅ ${template.title}`);
      inserted++;
    } catch (err) {
      console.error(
        `  ❌ ${template.title}: ${err instanceof Error ? err.message : err}`,
      );
      skipped++;
    }
  }

  console.log(`\n✨ Done: ${inserted} inserted, ${skipped} skipped`);
  process.exit(0);
}

seedTemplates().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

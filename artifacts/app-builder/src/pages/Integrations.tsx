import { useState } from "react";
import { useLocation } from "wouter";
import {
  Github,
  Database,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ExternalLink,
  Zap,
  Key,
  Cpu,
  Globe,
  CreditCard,
  Map,
  MessageSquare,
  Search,
  Cloud,
  Lock,
  ChevronDown,
  ChevronUp,
  Link2,
} from "lucide-react";
import { useIntegrations } from "@/hooks/use-integrations";
import { cn } from "@/lib/utils";
import { Layout } from "@/components/Layout";

const HE = "'Rubik', sans-serif";

type TestStatus = "idle" | "testing" | "ok" | "error";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  isSecret?: boolean;
  helpText?: string;
}

interface IntegrationCardProps {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
  docsUrl: string;
  fields: FieldDef[];
  onSave: (id: string, values: Record<string, string>) => void;
  onRemove?: (id: string) => void;
  testFn?: (
    values: Record<string, string>,
  ) => Promise<{ ok: boolean; message: string }>;
  isActive: boolean;
}

function IntegrationCard({
  id,
  icon,
  iconBg,
  name,
  description,
  docsUrl,
  fields,
  onSave,
  onRemove,
  testFn,
  isActive,
}: IntegrationCardProps) {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(isActive);

  const isDirty = fields.some((f) => !!localValues[f.key]?.trim());
  const isFilled = fields.some((f) => !!localValues[f.key]?.trim());

  const handleSave = () => {
    onSave(id, localValues);
    setLocalValues({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    if (!testFn) return;
    setTestStatus("testing");
    setTestMessage("");
    try {
      const result = await testFn(localValues);
      setTestStatus(result.ok ? "ok" : "error");
      setTestMessage(result.message);
    } catch {
      setTestStatus("error");
      setTestMessage("שגיאת חיבור");
    }
    setTimeout(() => setTestStatus("idle"), 4000);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        isActive
          ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/5"
          : "border-border/50 bg-card/50",
      )}
    >
      {/* Collapsed header — always visible */}
      <button
        className="w-full p-4 flex items-center gap-3 text-right"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md shrink-0",
            iconBg,
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold text-foreground"
              style={{ fontFamily: HE }}
            >
              {name}
            </span>
            {isActive && (
              <span
                className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-1.5 py-0.5 rounded-full"
                style={{ fontFamily: HE }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                מחובר
              </span>
            )}
          </div>
          <p
            className="text-[11px] text-muted-foreground mt-0.5 truncate"
            style={{ fontFamily: HE }}
          >
            {description}
          </p>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3">
          {/* Docs link */}
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-3"
            style={{ fontFamily: HE }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3" />
            תיעוד ומפתחות
          </a>

          {/* Fields */}
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key}>
                <label
                  className="block text-xs font-medium text-muted-foreground mb-1"
                  style={{ fontFamily: HE }}
                >
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    type={
                      field.isSecret && !showSecrets[field.key]
                        ? "password"
                        : "text"
                    }
                    value={localValues[field.key] || ""}
                    onChange={(e) =>
                      setLocalValues((p) => ({
                        ...p,
                        [field.key]: e.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all pr-9"
                    dir="ltr"
                  />
                  {field.isSecret && (
                    <button
                      type="button"
                      onClick={() => toggleSecret(field.key)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      {showSecrets[field.key] ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
                {field.helpText && (
                  <p
                    className="mt-1 text-[10px] text-muted-foreground/70"
                    style={{ fontFamily: HE }}
                  >
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={!isDirty && !saved}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                saved
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : isDirty
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted/50 text-muted-foreground cursor-default",
              )}
              style={{ fontFamily: HE }}
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" /> נשמר!
                </>
              ) : (
                "שמור"
              )}
            </button>

            {testFn && (
              <button
                onClick={handleTest}
                disabled={!isFilled || testStatus === "testing"}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  testStatus === "ok"
                    ? "border-green-500/30 text-green-400 bg-green-500/10"
                    : testStatus === "error"
                      ? "border-red-500/30 text-red-400 bg-red-500/10"
                      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
                )}
                style={{ fontFamily: HE }}
              >
                {testStatus === "testing" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : testStatus === "ok" ? (
                  <Check className="w-3.5 h-3.5" />
                ) : testStatus === "error" ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                {testStatus === "testing"
                  ? "בודק..."
                  : testStatus === "ok"
                    ? "תקין!"
                    : testStatus === "error"
                      ? "שגיאה"
                      : "בדוק חיבור"}
              </button>
            )}

            {isActive && (
              <button
                onClick={() => {
                  setLocalValues({});
                  if (onRemove) onRemove(id);
                  else onSave(id, {});
                }}
                className="mr-auto text-[11px] text-red-400/70 hover:text-red-400 transition-colors"
                style={{ fontFamily: HE }}
              >
                נתק
              </button>
            )}
          </div>

          {testMessage && (
            <p
              className={cn(
                "mt-2 text-[11px]",
                testStatus === "ok" ? "text-green-400" : "text-red-400",
              )}
              style={{ fontFamily: HE }}
            >
              {testMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <div className="text-primary/70">{icon}</div>
      <h2
        className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
        style={{ fontFamily: HE, letterSpacing: "0.08em" }}
      >
        {title}
      </h2>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

export default function Integrations() {
  const [, navigate] = useLocation();
  const { saveCredential, removeCredential, getActiveIntegrations } =
    useIntegrations();
  const active = getActiveIntegrations();

  const handleSave = (provider: string, vals: Record<string, string>) => {
    void saveCredential(provider, vals);
  };

  const handleRemove = (provider: string) => {
    void removeCredential(provider);
  };

  // ── Test functions ──────────────────────────────────────────
  const testGitHub = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${vals.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      if (res.ok) {
        const user = await res.json();
        return { ok: true, message: `✓ מחובר כ-${user.login}` };
      }
      return { ok: false, message: "טוקן לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const testSupabase = async (vals: Record<string, string>) => {
    try {
      const res = await fetch(`${vals.supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: vals.supabaseAnonKey,
          Authorization: `Bearer ${vals.supabaseAnonKey}`,
        },
      });
      if (res.ok || res.status === 400)
        return { ok: true, message: "✓ Supabase פרויקט נגיש" };
      return { ok: false, message: `שגיאה: ${res.status}` };
    } catch {
      return { ok: false, message: "URL לא תקין" };
    }
  };

  const testOpenAI = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${vals.openaiKey}` },
      });
      if (res.ok) return { ok: true, message: "✓ מפתח OpenAI תקין" };
      return { ok: false, message: "מפתח לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const testAnthropic = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": vals.anthropicKey,
          "anthropic-version": "2023-06-01",
        },
      });
      if (res.ok) return { ok: true, message: "✓ מפתח Anthropic תקין" };
      return { ok: false, message: "מפתח לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const testGroq = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${vals.groqKey}` },
      });
      if (res.ok) return { ok: true, message: "✓ מפתח Groq תקין" };
      return { ok: false, message: "מפתח לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const testVercel = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://api.vercel.com/v2/user", {
        headers: { Authorization: `Bearer ${vals.vercelToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          message: `✓ מחובר כ-${data.user?.username || data.user?.email}`,
        };
      }
      return { ok: false, message: "טוקן לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const testStripe = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${vals.stripeSecretKey}` },
      });
      if (res.ok) return { ok: true, message: "✓ Stripe מחובר" };
      return { ok: false, message: "מפתח לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const testCloudinary = async (vals: Record<string, string>) => {
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${vals.cloudinaryCloudName}/resources/image?max_results=1`,
        {
          headers: {
            Authorization:
              "Basic " +
              btoa(`${vals.cloudinaryApiKey}:${vals.cloudinaryApiSecret}`),
          },
        },
      );
      if (res.ok || res.status === 200)
        return { ok: true, message: "✓ Cloudinary מחובר" };
      return { ok: false, message: "פרטים לא תקינים" };
    } catch {
      return { ok: false, message: "שגיאת חיבור" };
    }
  };

  const testHuggingFace = async (vals: Record<string, string>) => {
    try {
      const res = await fetch("https://huggingface.co/api/whoami", {
        headers: { Authorization: `Bearer ${vals.huggingfaceToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, message: `✓ מחובר כ-${data.name || data.id}` };
      }
      return { ok: false, message: "טוקן לא תקין" };
    } catch {
      return { ok: false, message: "שגיאת רשת" };
    }
  };

  const activeCount = Object.keys(active).length;

  return (
    <Layout>
      <div className="h-full bg-background overflow-y-auto" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border/40 bg-background/90 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-6 h-[57px] flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Link2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1
              className="font-semibold text-foreground text-sm"
              style={{ fontFamily: HE }}
            >
              אינטגרציות
            </h1>
            {activeCount > 0 && (
              <span
                className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full mr-auto"
                style={{ fontFamily: HE }}
              >
                ✓ {activeCount} מחוברים
              </span>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-6 py-6 space-y-3">
          {/* Intro */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p
              className="text-sm text-foreground/80 leading-relaxed"
              style={{ fontFamily: HE }}
            >
              💡 <strong>כיצד זה עובד:</strong> הפרטים שתזין נשמרים{" "}
              <strong>מקומית</strong> בדפדפן שלך ואינם נשלחים לשרת שלנו. הם
              מוזרקים לה-AI כשאתה בונה פרויקטים, כדי שיוכל ליצור קוד שמתחבר
              לשירותים שלך.
            </p>
          </div>

          {/* ── DEPLOY & SOURCE CONTROL ── */}
          <SectionHeader
            icon={<Cloud className="w-4 h-4" />}
            title="פריסה ובקרת קוד"
          />

          <IntegrationCard
            id="github"
            icon={<Github className="w-5 h-5" />}
            iconBg="bg-[#333]"
            name="GitHub"
            description="ייצוא קוד לגיסטים ורפוסיטורים ישירות מהתצוגה המקדימה"
            docsUrl="https://github.com/settings/tokens/new?description=BuilderAI&scopes=gist,repo"
            isActive={!!active.github}
            fields={[
              {
                key: "githubToken",
                label: "Personal Access Token",
                placeholder: "ghp_xxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText:
                  "GitHub Settings → Developer settings → Personal access tokens. הרשאות: gist, repo",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testGitHub}
          />

          <IntegrationCard
            id="vercel"
            icon={<span className="text-lg font-black leading-none">▲</span>}
            iconBg="bg-black"
            name="Vercel"
            description="פרסם אתרים ב-Vercel בלחיצה אחת מהתצוגה המקדימה"
            docsUrl="https://vercel.com/account/tokens"
            isActive={!!active.vercel}
            fields={[
              {
                key: "vercelToken",
                label: "Access Token",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "Vercel Account → Settings → Tokens",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testVercel}
          />

          <IntegrationCard
            id="railway"
            icon={<span className="text-base font-black leading-none">🚂</span>}
            iconBg="bg-[#0B0D0E]"
            name="Railway"
            description="Deploy אפליקציות Node, Python, Docker ו-Databases בקלות"
            docsUrl="https://railway.app/account/tokens"
            isActive={!!active.railway}
            fields={[
              {
                key: "railwayToken",
                label: "API Token",
                placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
                isSecret: true,
                helpText: "railway.app → Account → API Tokens",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="render"
            icon={<span className="text-base font-black leading-none">⬡</span>}
            iconBg="bg-[#46E3B7] text-black"
            name="Render"
            description="Hosting לאפליקציות web, API ו-databases ב-free tier נדיב"
            docsUrl="https://dashboard.render.com/u/settings#api-keys"
            isActive={!!active.render}
            fields={[
              {
                key: "renderApiKey",
                label: "API Key",
                placeholder: "rnd_xxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "Render Dashboard → Account Settings → API Keys",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* Netlify Drop — link only */}
          <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00ad9f] flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                N
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="text-sm font-semibold text-foreground"
                  style={{ fontFamily: HE }}
                >
                  Netlify Drop
                </h3>
                <p
                  className="text-[11px] text-muted-foreground"
                  style={{ fontFamily: HE }}
                >
                  גרור ושחרר HTML לפרסום מיידי — ללא הגדרות
                </p>
              </div>
              <a
                href="https://app.netlify.com/drop"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ad9f] text-white rounded-lg text-xs font-medium hover:bg-[#009d8f] transition-colors shrink-0"
                style={{ fontFamily: HE }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                פתח
              </a>
            </div>
          </div>

          {/* ── DATABASES & BACKEND ── */}
          <SectionHeader
            icon={<Database className="w-4 h-4" />}
            title="בסיסי נתונים ו-Backend"
          />

          <IntegrationCard
            id="supabase"
            icon={<Database className="w-5 h-5" />}
            iconBg="bg-[#3ecf8e]"
            name="Supabase"
            description="PostgreSQL, Auth, Storage ו-Realtime — הכל בפרויקט אחד"
            docsUrl="https://supabase.com/dashboard"
            isActive={!!active.supabase}
            fields={[
              {
                key: "supabaseUrl",
                label: "Project URL",
                placeholder: "https://xxxxxxxxxxx.supabase.co",
                helpText: "Project Settings → API → Project URL",
              },
              {
                key: "supabaseAnonKey",
                label: "Anon / Public Key",
                placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                isSecret: true,
                helpText: "Project Settings → API → anon public",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testSupabase}
          />

          <IntegrationCard
            id="firebase"
            icon={<span className="text-base leading-none">🔥</span>}
            iconBg="bg-[#FFCA28] text-black"
            name="Firebase / Google Cloud"
            description="Firestore, Realtime Database, Auth, Storage ו-Hosting מבית Google"
            docsUrl="https://console.firebase.google.com/"
            isActive={!!active.firebase}
            fields={[
              {
                key: "firebaseApiKey",
                label: "API Key",
                placeholder: "AIzaSyXXXXXXXXXXXXXXXXXX",
                isSecret: true,
                helpText:
                  "Firebase Console → Project Settings → General → Your apps → Web app",
              },
              {
                key: "firebaseProjectId",
                label: "Project ID",
                placeholder: "my-project-12345",
                helpText:
                  "Firebase Console → Project Settings → General → Project ID",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="mongodb"
            icon={<span className="text-base leading-none">🌿</span>}
            iconBg="bg-[#4DB33D]"
            name="MongoDB Atlas"
            description="NoSQL database בענן — מה-free tier ועד enterprise"
            docsUrl="https://www.mongodb.com/atlas/database"
            isActive={!!active.mongodb}
            fields={[
              {
                key: "mongodbUri",
                label: "Connection URI",
                placeholder:
                  "mongodb+srv://user:password@cluster.mongodb.net/dbname",
                isSecret: true,
                helpText:
                  "Atlas → Database → Connect → Connect your application → Copy connection string",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="planetscale"
            icon={<span className="text-base leading-none">⚡</span>}
            iconBg="bg-[#0a0a0a]"
            name="PlanetScale"
            description="MySQL serverless database עם branching כמו Git"
            docsUrl="https://planetscale.com/"
            isActive={!!active.planetscale}
            fields={[
              {
                key: "planetscaleUrl",
                label: "Database URL",
                placeholder:
                  "mysql://user:password@host.us-east-2.psdb.cloud/dbname",
                isSecret: true,
                helpText:
                  "PlanetScale Dashboard → Connect → Connect with Prisma/Node.js",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="redis"
            icon={<span className="text-base leading-none">📦</span>}
            iconBg="bg-[#DC382D]"
            name="Upstash Redis"
            description="Redis serverless לcaching, rate-limiting ו-sessions"
            docsUrl="https://console.upstash.com/"
            isActive={!!active.redis}
            fields={[
              {
                key: "upstashRedisUrl",
                label: "Redis URL",
                placeholder: "rediss://default:xxxxxx@us1-xxx.upstash.io:6379",
                helpText: "Upstash Console → Database → Connect → REST API",
              },
              {
                key: "upstashRedisToken",
                label: "REST Token",
                placeholder: "AXXXxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "Upstash Console → Database → REST Token",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* ── AI & LLM ── */}
          <SectionHeader icon={<Cpu className="w-4 h-4" />} title="AI ו-LLM" />

          <IntegrationCard
            id="openai"
            icon={<Cpu className="w-5 h-5" />}
            iconBg="bg-[#412991]"
            name="OpenAI"
            description="GPT-4, DALL-E, Whisper, Embeddings — המפתח יוזרק לקוד שלך"
            docsUrl="https://platform.openai.com/api-keys"
            isActive={!!active.openai}
            fields={[
              {
                key: "openaiKey",
                label: "API Key",
                placeholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "platform.openai.com → API keys",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testOpenAI}
          />

          <IntegrationCard
            id="anthropic"
            icon={<span className="text-base leading-none">🧠</span>}
            iconBg="bg-[#CC785C]"
            name="Anthropic (Claude)"
            description="Claude 3.5 Sonnet, Claude 3 Opus — AI ניתוח וכתיבה מתקדמים"
            docsUrl="https://console.anthropic.com/settings/keys"
            isActive={!!active.anthropic}
            fields={[
              {
                key: "anthropicKey",
                label: "API Key",
                placeholder: "sk-ant-apixx-xxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "console.anthropic.com → API Keys",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testAnthropic}
          />

          <IntegrationCard
            id="groq"
            icon={<span className="text-base leading-none">⚡</span>}
            iconBg="bg-[#F55036]"
            name="Groq"
            description="Inference מהיר במיוחד — Llama 3, Mixtral, Gemma עם זמן תגובה של מילישניות"
            docsUrl="https://console.groq.com/keys"
            isActive={!!active.groq}
            fields={[
              {
                key: "groqKey",
                label: "API Key",
                placeholder: "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "console.groq.com → API Keys",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testGroq}
          />

          <IntegrationCard
            id="huggingface"
            icon={<span className="text-base leading-none">🤗</span>}
            iconBg="bg-[#FF9A00]"
            name="Hugging Face"
            description="Inference API — עשרות אלפי מודלים open-source לתמונות, טקסט ואודיו"
            docsUrl="https://huggingface.co/settings/tokens"
            isActive={!!active.huggingface}
            fields={[
              {
                key: "huggingfaceToken",
                label: "Access Token",
                placeholder: "hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "huggingface.co → Settings → Access Tokens",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testHuggingFace}
          />

          <IntegrationCard
            id="replicate"
            icon={<span className="text-base leading-none">🔄</span>}
            iconBg="bg-[#0553b1]"
            name="Replicate"
            description="Run AI models בענן — Stable Diffusion, Flux, Whisper ועוד אלפי מודלים"
            docsUrl="https://replicate.com/account/api-tokens"
            isActive={!!active.replicate}
            fields={[
              {
                key: "replicateToken",
                label: "API Token",
                placeholder: "r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "replicate.com → Account Settings → API Tokens",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* ── AUTH ── */}
          <SectionHeader
            icon={<Lock className="w-4 h-4" />}
            title="אימות משתמשים (Auth)"
          />

          <IntegrationCard
            id="auth0"
            icon={<span className="text-base leading-none">🔐</span>}
            iconBg="bg-[#EB5424]"
            name="Auth0"
            description="Social login, MFA, RBAC — פתרון auth מלא enterprise-grade"
            docsUrl="https://manage.auth0.com/"
            isActive={!!active.auth0}
            fields={[
              {
                key: "auth0Domain",
                label: "Domain",
                placeholder: "your-tenant.auth0.com",
                helpText: "Auth0 Dashboard → Applications → Settings → Domain",
              },
              {
                key: "auth0ClientId",
                label: "Client ID",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                helpText:
                  "Auth0 Dashboard → Applications → Settings → Client ID",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="clerk"
            icon={<span className="text-base leading-none">👤</span>}
            iconBg="bg-[#6C47FF]"
            name="Clerk"
            description="Drop-in auth לReact/Next.js — UI מוכן, webhooks, user management"
            docsUrl="https://dashboard.clerk.com/"
            isActive={!!active.clerk}
            fields={[
              {
                key: "clerkPublishableKey",
                label: "Publishable Key",
                placeholder: "pk_test_xxxxxxxxxxxxxxxxxxxxxxxx",
                helpText: "Clerk Dashboard → API Keys → Publishable Key",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* ── PAYMENTS ── */}
          <SectionHeader
            icon={<CreditCard className="w-4 h-4" />}
            title="תשלומים"
          />

          <IntegrationCard
            id="stripe"
            icon={<CreditCard className="w-5 h-5" />}
            iconBg="bg-[#635BFF]"
            name="Stripe"
            description="תשלומים, subscriptions, invoices — סטנדרט התעשייה לעסקים דיגיטליים"
            docsUrl="https://dashboard.stripe.com/apikeys"
            isActive={!!active.stripe}
            fields={[
              {
                key: "stripePublishableKey",
                label: "Publishable Key",
                placeholder: "pk_test_YOUR_PUBLISHABLE_KEY",
                helpText: "Stripe Dashboard → Developers → API Keys",
              },
              {
                key: "stripeSecretKey",
                label: "Secret Key",
                placeholder: "sk_test_YOUR_SECRET_KEY",
                isSecret: true,
                helpText:
                  "⚠️ לא חושפים בקוד client-side. הAI ישתמש בו לייצר קוד server-side",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testStripe}
          />

          <IntegrationCard
            id="paypal"
            icon={<span className="text-base leading-none">🅿️</span>}
            iconBg="bg-[#003087]"
            name="PayPal"
            description="PayPal Checkout, Smart Buttons, Subscriptions — 400M+ לקוחות עולמיים"
            docsUrl="https://developer.paypal.com/dashboard/applications"
            isActive={!!active.paypal}
            fields={[
              {
                key: "paypalClientId",
                label: "Client ID",
                placeholder: "AXXXxxxxxxxxxxxxxxxxxxxxxxxxx",
                helpText:
                  "PayPal Developer → My Apps & Credentials → App → Client ID",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* ── STORAGE & MEDIA ── */}
          <SectionHeader
            icon={<Cloud className="w-4 h-4" />}
            title="אחסון ומדיה"
          />

          <IntegrationCard
            id="cloudinary"
            icon={<span className="text-base leading-none">☁️</span>}
            iconBg="bg-[#3448C5]"
            name="Cloudinary"
            description="העלאת תמונות/וידאו, transformations, CDN — media management מלא"
            docsUrl="https://cloudinary.com/console"
            isActive={!!active.cloudinary}
            fields={[
              {
                key: "cloudinaryCloudName",
                label: "Cloud Name",
                placeholder: "my-cloud",
                helpText: "Cloudinary Console → Dashboard → Cloud Name",
              },
              {
                key: "cloudinaryApiKey",
                label: "API Key",
                placeholder: "123456789012345",
                helpText: "Cloudinary Console → Dashboard → API Key",
              },
              {
                key: "cloudinaryApiSecret",
                label: "API Secret",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "Cloudinary Console → Dashboard → API Secret",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
            testFn={testCloudinary}
          />

          {/* ── COMMUNICATION ── */}
          <SectionHeader
            icon={<MessageSquare className="w-4 h-4" />}
            title="תקשורת והתראות"
          />

          <IntegrationCard
            id="twilio"
            icon={<span className="text-base leading-none">📱</span>}
            iconBg="bg-[#F22F46]"
            name="Twilio"
            description="SMS, WhatsApp, Voice calls, 2FA — API לתקשורת גלובלית"
            docsUrl="https://console.twilio.com/"
            isActive={!!active.twilio}
            fields={[
              {
                key: "twilioAccountSid",
                label: "Account SID",
                placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                helpText: "Twilio Console → Dashboard → Account SID",
              },
              {
                key: "twilioAuthToken",
                label: "Auth Token",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "Twilio Console → Dashboard → Auth Token",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="sendgrid"
            icon={<span className="text-base leading-none">✉️</span>}
            iconBg="bg-[#1A82E2]"
            name="SendGrid (Twilio)"
            description="Email transactional ו-marketing בנפחים גדולים עם analytics"
            docsUrl="https://app.sendgrid.com/settings/api_keys"
            isActive={!!active.sendgrid}
            fields={[
              {
                key: "sendgridApiKey",
                label: "API Key",
                placeholder: "SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "SendGrid → Settings → API Keys → Create API Key",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="resend"
            icon={<span className="text-base leading-none">📧</span>}
            iconBg="bg-[#000000]"
            name="Resend"
            description="Email API מודרני לדגולפרים — עם React Email templates"
            docsUrl="https://resend.com/api-keys"
            isActive={!!active.resend}
            fields={[
              {
                key: "resendApiKey",
                label: "API Key",
                placeholder: "re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "resend.com → API Keys → Create API Key",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="pusher"
            icon={<span className="text-base leading-none">📡</span>}
            iconBg="bg-[#300D4F]"
            name="Pusher Channels"
            description="WebSockets managed — real-time notifications, live chat, live feed"
            docsUrl="https://dashboard.pusher.com/"
            isActive={!!active.pusher}
            fields={[
              {
                key: "pusherAppId",
                label: "App ID",
                placeholder: "1234567",
                helpText: "Pusher Dashboard → App Keys",
              },
              {
                key: "pusherKey",
                label: "Key",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx",
              },
              {
                key: "pusherSecret",
                label: "Secret",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
              },
              {
                key: "pusherCluster",
                label: "Cluster",
                placeholder: "eu",
                helpText: "לדוגמה: eu, us2, ap3",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* ── MAPS & SEARCH ── */}
          <SectionHeader
            icon={<Map className="w-4 h-4" />}
            title="מפות וחיפוש"
          />

          <IntegrationCard
            id="googlemaps"
            icon={<Map className="w-5 h-5" />}
            iconBg="bg-[#4285F4]"
            name="Google Maps Platform"
            description="Maps, Places, Directions, Geocoding — API הגיאוגרפי הגדול בעולם"
            docsUrl="https://console.cloud.google.com/apis/credentials"
            isActive={!!active.googlemaps}
            fields={[
              {
                key: "googleMapsApiKey",
                label: "API Key",
                placeholder: "AIzaSyXXXXXXXXXXXXXXXXXXXXX",
                isSecret: true,
                helpText:
                  "Google Cloud Console → APIs & Services → Credentials → Create credentials → API Key",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="mapbox"
            icon={<Globe className="w-5 h-5" />}
            iconBg="bg-[#000000]"
            name="Mapbox"
            description="מפות מותאמות אישית, GL JS, Navigation SDK — חלופה יפה לGoogle Maps"
            docsUrl="https://account.mapbox.com/access-tokens/"
            isActive={!!active.mapbox}
            fields={[
              {
                key: "mapboxToken",
                label: "Access Token",
                placeholder: "pk.eyJ1Ijoixxxxxxxx",
                isSecret: true,
                helpText:
                  "mapbox.com → Account → Access Tokens → Create a token",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="algolia"
            icon={<Search className="w-5 h-5" />}
            iconBg="bg-[#003DFF]"
            name="Algolia"
            description="Search & Discovery API — חיפוש instant עם typo-tolerance ו-facets"
            docsUrl="https://www.algolia.com/account/api-keys"
            isActive={!!active.algolia}
            fields={[
              {
                key: "algoliaAppId",
                label: "Application ID",
                placeholder: "XXXXXXXXXX",
                helpText:
                  "Algolia Dashboard → Settings → API Keys → Application ID",
              },
              {
                key: "algoliaApiKey",
                label: "Search-Only API Key",
                placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText:
                  "Algolia Dashboard → Settings → API Keys → Search-Only API Key",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* ── SOCIAL & MESSAGING ── */}
          <SectionHeader
            icon={<MessageSquare className="w-4 h-4" />}
            title="רשתות חברתיות ומסרים"
          />

          <IntegrationCard
            id="slack"
            icon={<span className="text-base leading-none">💬</span>}
            iconBg="bg-[#4A154B]"
            name="Slack"
            description="שלח הודעות, notifications ואלרטים לערוצי Slack מהאפליקציה שלך"
            docsUrl="https://api.slack.com/apps"
            isActive={!!active.slack}
            fields={[
              {
                key: "slackBotToken",
                label: "Bot OAuth Token",
                placeholder: "xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText:
                  "api.slack.com → Your App → OAuth & Permissions → Bot User OAuth Token",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="discord"
            icon={<span className="text-base leading-none">🎮</span>}
            iconBg="bg-[#5865F2]"
            name="Discord"
            description="Discord Bot לשרתי גיימינג וקהילה — webhooks, slash commands, embeds"
            docsUrl="https://discord.com/developers/applications"
            isActive={!!active.discord}
            fields={[
              {
                key: "discordBotToken",
                label: "Bot Token",
                placeholder:
                  "MTxxxxxxxxxxxxxxxxxxxxxxx.Xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx",
                isSecret: true,
                helpText: "Discord Developer Portal → Your App → Bot → Token",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          <IntegrationCard
            id="twitter"
            icon={<span className="text-base leading-none">🐦</span>}
            iconBg="bg-[#000000]"
            name="X (Twitter) API"
            description="קרא ופרסם tweets, search tweets, user timeline — API v2"
            docsUrl="https://developer.twitter.com/en/portal/dashboard"
            isActive={!!active.twitter}
            fields={[
              {
                key: "twitterBearerToken",
                label: "Bearer Token",
                placeholder: "AAAAAAAAAAAAAAAAAAAAxxxxxx%2F...",
                isSecret: true,
                helpText:
                  "Twitter Developer Portal → Project → App → Keys and Tokens → Bearer Token",
              },
            ]}
            onSave={handleSave}
            onRemove={handleRemove}
          />

          {/* Bottom spacer */}
          <div className="h-8" />
        </div>
      </div>
    </Layout>
  );
}

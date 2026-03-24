import { useAuth } from "@workspace/replit-auth-web";
import { Sparkles, Wand2, Zap, Globe, Shield } from "lucide-react";
import { motion } from "framer-motion";

const HE = "'Rubik', sans-serif";

const FEATURES = [
  {
    icon: Wand2,
    label: "בנה כל אפליקציה",
    desc: "רק תכתוב מה אתה רוצה — ה-AI יבנה בשבילך",
  },
  {
    icon: Zap,
    label: "תצוגה חיה",
    desc: "ראה את האפליקציה שלך מתעדכנת בזמן אמת",
  },
  {
    icon: Globe,
    label: "פרסם בלחיצה",
    desc: "העלה לאינטרנט ושתף עם כולם בשנייה",
  },
  {
    icon: Shield,
    label: "הכל שמור",
    desc: "היסטוריית גרסאות מלאה ושחזור בקלות",
  },
];

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Google OAuth לא מוגדר בשרת",
  invalid_state: "בקשת הכניסה פגה — נסה שוב",
  token_exchange_failed: "שגיאה בהתחברות עם Google — נסה שוב",
  no_claims: "לא התקבלו פרטי משתמש — נסה שוב",
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Login() {
  const { loginWithGoogle, isLoading } = useAuth();

  const params = new URLSearchParams(window.location.search);
  const errorKey = params.get("error");
  const errorMsg = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "אירעה שגיאה — נסה שוב")
    : null;

  const handleDevLogin = () => {
    window.location.href = "/api/dev-login";
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-background relative overflow-hidden"
      style={{ fontFamily: HE }}
      dir="rtl"
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-6"
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-cyan-500/25">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              בונה AI
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              הפלטפורמה לבניית אפליקציות עם AI
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 w-full">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="bg-card/50 border border-border/40 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <f.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {f.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Error message */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-sm text-center"
          >
            {errorMsg}
          </motion.div>
        )}

        {/* Login buttons */}
        <div className="w-full flex flex-col gap-3">
          {/* Google sign-in button */}
          <button
            onClick={loginWithGoogle}
            disabled={isLoading}
            className="w-full h-12 bg-white text-gray-800 font-semibold rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-50 active:bg-gray-100 transition-all shadow-lg border border-gray-200 disabled:opacity-50"
          >
            <GoogleIcon />
            {isLoading ? "טוען..." : "המשך עם Google"}
          </button>

          {/* Dev login (only shown in development) */}
          {import.meta.env.DEV && (
            <button
              onClick={handleDevLogin}
              className="w-full h-10 bg-card/60 text-muted-foreground text-sm font-medium rounded-xl flex items-center justify-center gap-2 hover:bg-card border border-border/50 transition-all"
            >
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                DEV
              </span>
              כניסת פיתוח (ללא Google)
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground">
            חינם לגמרי · ללא כרטיס אשראי
          </p>
        </div>
      </motion.div>
    </div>
  );
}

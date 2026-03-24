import { motion } from "framer-motion";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { useLocation } from "wouter";

const plans = [
  {
    icon: Zap,
    name: "חינמי",
    price: "0",
    period: "",
    color: "border-white/10",
    highlight: false,
    features: [
      "5 פרויקטים",
      "50 הודעות לחודש",
      "AI בסיסי (Haiku)",
      "ייצוא HTML",
      "תמיכה בקהילה",
    ],
    cta: "התחל בחינם",
    href: "/",
  },
  {
    icon: Rocket,
    name: "Pro",
    price: "49",
    period: "/ חודש",
    color: "border-cyan-500/40",
    highlight: true,
    features: [
      "פרויקטים ללא הגבלה",
      "הודעות ללא הגבלה",
      "AI מתקדם (Sonnet)",
      "פרסום אוטומטי",
      "דומיין מותאם אישית",
      "GitHub Sync",
      "אנליטיקה מתקדמת",
      "תמיכה בעדיפות",
    ],
    cta: "בקרוב...",
    href: null,
  },
  {
    icon: Building2,
    name: "Enterprise",
    price: "בהתאמה",
    period: "",
    color: "border-purple-500/30",
    highlight: false,
    features: [
      "הכל מ-Pro",
      "SSO / SAML",
      "SLA מובטח",
      "On-Premise אופציונלי",
      "Account Manager ייעודי",
      "Audit Logs",
    ],
    cta: "צור קשר",
    href: "mailto:enterprise@example.com",
  },
];

export default function Pricing() {
  const [, navigate] = useLocation();

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center py-20 px-4"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <h1 className="text-4xl font-bold mb-4">מחירים פשוטים ושקופים</h1>
        <p className="text-white/50 text-lg max-w-xl">
          התחל בחינם, שדרג כשתצטרך. ללא הפתעות.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative rounded-2xl border p-7 flex flex-col ${plan.color} ${
              plan.highlight
                ? "bg-cyan-500/5 shadow-lg shadow-cyan-500/10"
                : "bg-white/[0.02]"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                הכי פופולרי
              </div>
            )}

            <div className="flex items-center gap-3 mb-5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  plan.highlight ? "bg-cyan-500/15" : "bg-white/[0.05]"
                }`}
              >
                <plan.icon
                  className={`w-5 h-5 ${plan.highlight ? "text-cyan-400" : "text-white/60"}`}
                />
              </div>
              <div>
                <p className="font-bold text-lg">{plan.name}</p>
                <p className="text-2xl font-extrabold">
                  {plan.price !== "בהתאמה" ? `₪${plan.price}` : plan.price}
                  <span className="text-sm font-normal text-white/40">
                    {plan.period}
                  </span>
                </p>
              </div>
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-center gap-2 text-sm text-white/70"
                >
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                if (plan.href && !plan.href.startsWith("mailto:"))
                  navigate(plan.href);
                else if (plan.href) window.location.href = plan.href;
              }}
              disabled={!plan.href}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                plan.highlight
                  ? "bg-cyan-500 hover:bg-cyan-400 text-white"
                  : plan.href
                    ? "bg-white/[0.07] hover:bg-white/[0.12] text-white"
                    : "bg-white/[0.03] text-white/30 cursor-not-allowed"
              }`}
            >
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

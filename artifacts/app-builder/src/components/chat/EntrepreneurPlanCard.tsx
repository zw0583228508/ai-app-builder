import { motion } from "framer-motion";

const HE = "'Rubik', sans-serif";

interface EntrepreneurPlanCardProps {
  plan: Record<string, unknown>;
  onClear: () => void;
}

export function EntrepreneurPlanCard({
  plan,
  onClear,
}: EntrepreneurPlanCardProps) {
  return (
    <motion.div
      key="entrepreneur-plan"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3"
      dir="rtl"
      style={{ fontFamily: HE }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <span className="font-semibold text-indigo-300 text-sm">
            תכנית ראשונית
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-slate-300"
        >
          ✕
        </button>
      </div>

      {typeof plan.business_idea === "string" && (
        <p className="text-xs text-slate-300 leading-relaxed">
          {plan.business_idea}
        </p>
      )}

      {Array.isArray(plan.key_features) && (
        <div>
          <p className="text-xs text-slate-500 mb-1">תכונות מרכזיות:</p>
          <div className="flex flex-wrap gap-1">
            {(plan.key_features as string[]).map((f, i) => (
              <span
                key={i}
                className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full"
              >
                {String(f)}
              </span>
            ))}
          </div>
        </div>
      )}

      {typeof plan.monetization === "string" && (
        <p className="text-xs text-emerald-400">💰 {plan.monetization}</p>
      )}
    </motion.div>
  );
}

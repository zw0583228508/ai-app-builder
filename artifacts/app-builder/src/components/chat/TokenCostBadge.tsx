import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const HE = "'Rubik', sans-serif";

const INPUT_PRICE_PER_M = 3.0;
const OUTPUT_PRICE_PER_M = 15.0;

function calcCostUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens * INPUT_PRICE_PER_M + outputTokens * OUTPUT_PRICE_PER_M) /
    1_000_000
  );
}

function formatCost(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

interface TokenCostBadgeProps {
  inputTokens: number;
  outputTokens: number;
  isRTL?: boolean;
}

export function TokenCostBadge({
  inputTokens,
  outputTokens,
  isRTL = true,
}: TokenCostBadgeProps) {
  const totalTokens = inputTokens + outputTokens;
  const costUsd = calcCostUsd(inputTokens, outputTokens);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        fontFamily: HE,
        direction: isRTL ? "rtl" : "ltr",
      }}
      title={
        isRTL
          ? `${inputTokens.toLocaleString()} קלט + ${outputTokens.toLocaleString()} פלט = ${totalTokens.toLocaleString()} טוקנים`
          : `${inputTokens.toLocaleString()} input + ${outputTokens.toLocaleString()} output = ${totalTokens.toLocaleString()} tokens`
      }
    >
      <Zap className="w-2.5 h-2.5 text-yellow-400/60 shrink-0" />
      <span className="text-[9px] text-white/25 font-mono tabular-nums">
        {totalTokens.toLocaleString()}
      </span>
      <span className="text-[9px] text-white/15">·</span>
      <span className="text-[9px] text-emerald-400/50 font-mono">
        {formatCost(costUsd)}
      </span>
    </motion.div>
  );
}

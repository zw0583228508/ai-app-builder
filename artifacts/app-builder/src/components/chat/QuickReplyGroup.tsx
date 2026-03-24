import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const HE = "'Rubik', sans-serif";

interface ReplyGroup {
  question: string;
  options: string[];
}

interface QuickReplyGroupProps {
  groups: ReplyGroup[];
  onSelect: (text: string) => void;
  isRTL?: boolean;
}

const FIRST_RESPONSE_GROUPS_HE: ReplyGroup[] = [
  {
    question: "למי זה מיועד?",
    options: ["יוצרים ופרילנסרים", "עסקים ומותגים", "משתמשים כלליים"],
  },
  {
    question: "מה הרמה שאתה רוצה?",
    options: ["MVP פשוט", "מוצר מתקדם", "מוצר שיסתער"],
  },
  {
    question: "איפה זה ירוץ?",
    options: ["רשת (Web)", "מובייל", "שניהם"],
  },
];

const FIRST_RESPONSE_GROUPS_EN: ReplyGroup[] = [
  {
    question: "Who is this for?",
    options: ["Creators & freelancers", "Businesses & brands", "General users"],
  },
  {
    question: "What level do you want?",
    options: ["Simple MVP", "Advanced product", "Something viral"],
  },
  {
    question: "Where should it run?",
    options: ["Web", "Mobile", "Both"],
  },
];

export function QuickReplyGroup({
  groups,
  onSelect,
  isRTL = true,
}: QuickReplyGroupProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="space-y-3 mt-1 max-w-sm"
      dir={isRTL ? "rtl" : "ltr"}
    >
      {groups.map((group, gi) => (
        <motion.div
          key={gi}
          initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: gi * 0.08 + 0.15, duration: 0.25 }}
        >
          <p
            className="text-[10px] text-slate-500 mb-1.5 font-medium"
            style={{ fontFamily: HE }}
          >
            {group.question}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((opt, oi) => (
              <button
                key={oi}
                type="button"
                onClick={() => onSelect(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-150",
                  "border border-indigo-500/20 bg-indigo-500/[0.06] text-indigo-300/80",
                  "hover:bg-indigo-500/15 hover:border-indigo-500/40 hover:text-indigo-200",
                  "active:scale-95",
                )}
                style={{ fontFamily: HE }}
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

export { FIRST_RESPONSE_GROUPS_HE, FIRST_RESPONSE_GROUPS_EN };

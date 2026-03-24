import { motion } from "framer-motion";
import { FileText } from "lucide-react";

const sections = [
  {
    title: "1. קבלת התנאים",
    content:
      'בשימוש בשירות, אתה מסכים לתנאי השימוש הבאים. אם אינך מסכים, אנא הפסק להשתמש בשירות.',
  },
  {
    title: "2. השירות",
    content:
      `אנו מספקים כלי בנייה לאפליקציות המופעל על ידי AI. השירות ניתן "כמות שהוא" ואנו שומרים לעצמנו את הזכות לשנות, להשהות או להפסיק אותו בכל עת.`,
  },
  {
    title: "3. חשבון משתמש",
    content:
      "אתה אחראי לשמירה על סודיות פרטי הכניסה לחשבון שלך ולכל הפעילות שתתרחש תחת חשבונך.",
  },
  {
    title: "4. תוכן",
    content:
      "אתה שומר על בעלות המלאה בתוכן שאתה יוצר. אתה מעניק לנו רישיון מוגבל לאחסן ולהציג את התוכן שלך למטרות מתן השירות.",
  },
  {
    title: "5. שימוש אסור",
    content:
      "אסור להשתמש בשירות למטרות בלתי חוקיות, להפיץ תוכן פוגעני, לפגוע במשתמשים אחרים, או לנסות לפרוץ לשרתי המערכת.",
  },
  {
    title: "6. הגבלת אחריות",
    content:
      "השירות לא יהיה אחראי לנזקים עקיפים, מקריים, או תוצאתיים הנובעים משימוש בשירות.",
  },
  {
    title: "7. שינויים בתנאים",
    content:
      "אנו עשויים לעדכן תנאים אלה מעת לעת. שימוש מתמשך בשירות לאחר שינויים מהווה הסכמה לתנאים המעודכנים.",
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center py-16 px-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">תנאי שימוש</h1>
            <p className="text-sm text-white/40">עדכון אחרון: מרץ 2026</p>
          </div>
        </div>

        <div className="space-y-6">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-white/[0.02] border border-white/[0.07] rounded-xl p-5"
            >
              <h2 className="font-semibold text-white/90 mb-2">{s.title}</h2>
              <p className="text-sm text-white/55 leading-relaxed">{s.content}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

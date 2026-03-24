import { motion } from "framer-motion";
import { Shield } from "lucide-react";

const sections = [
  {
    title: "1. המידע שאנו אוספים",
    content:
      "אנו אוספים מידע שמסרת לנו ישירות (שם, דוא\"ל), מידע על שימוש בשירות (פרויקטים, הודעות, לוגים טכניים), ומידע טכני (כתובת IP, סוג דפדפן).",
  },
  {
    title: "2. שימוש במידע",
    content:
      "המידע משמש למתן השירות ושיפורו, לתמיכה טכנית, לשליחת עדכונים חשובים (ניתן לבטל), ולאבטחת המערכת.",
  },
  {
    title: "3. שיתוף מידע",
    content:
      "איננו מוכרים את המידע שלך. אנו משתפים מידע עם ספקים טכניים הדרושים לתפעול השירות (ענן, AI) תחת הסכמי סודיות קפדניים.",
  },
  {
    title: "4. אבטחת מידע",
    content:
      "אנו מיישמים הצפנה (TLS בעת העברה, AES-256 באחסון), גישה מינימלית לפי עיקרון ה-Least Privilege, ואימות דו-שלבי לגישת צוות.",
  },
  {
    title: "5. זכויותיך (GDPR)",
    content:
      'יש לך זכות לעיין, לתקן, ולמחוק את המידע שלך. לבקשת מחיקה מלאה ("הזכות להישכח"), שלח בקשה לכתובת privacy@example.com.',
  },
  {
    title: "6. עוגיות",
    content:
      "אנו משתמשים בעוגיות חיוניות לאימות ובטיחות בלבד. לא נשתמש בעוגיות פרסומיות או מעקב.",
  },
  {
    title: "7. שינויים במדיניות",
    content:
      "שינויים מהותיים יופצו בדוא\"ל 30 יום מראש. שימוש מתמשך לאחר השינוי מהווה הסכמה.",
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center py-16 px-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">מדיניות פרטיות</h1>
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

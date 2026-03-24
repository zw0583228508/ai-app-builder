# Secret Rotation Guide

## ENCRYPTION_KEY

ה-ENCRYPTION_KEY מצפין את כל ה-GitHub tokens, Netlify tokens, ו-Vercel tokens של המשתמשים.

### מתי לעשות rotation:

- כל 90 ימים (best practice)
- מיד אם יש חשד לחשיפה
- לאחר עזיבת עובד עם גישה ל-env vars

### שלבי rotation:

**שלב 1** — צור מפתח חדש:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**שלב 2** — הרץ את script ההגירה לפני שינוי ה-env:

```bash
OLD_KEY=<current_hex_key> NEW_KEY=<new_hex_key> \
  pnpm --filter @workspace/scripts run rotate-encryption-key
```

**שלב 3** — וודא שהscript סיים בהצלחה (0 failures).

**שלב 4** — עדכן את ENCRYPTION_KEY בסביבת הפרודקשן.

**שלב 5** — בדוק שאינטגרציה אחת לפחות (GitHub/Netlify) עדיין עובדת.

### חירום — מפתח נחשף:

1. בטל מיידית את כל ה-GitHub PATs, Netlify tokens, Vercel tokens בפלטפורמות אלו.
2. עדכן ENCRYPTION_KEY למפתח חדש (ללא rotation — הנתונים כבר לא שמישים).
3. בקש מכל המשתמשים לחבר מחדש את האינטגרציות שלהם.

---

## SESSION_SECRET

ה-SESSION_SECRET חותם על session cookies.
**Rotation מנתק את כל המשתמשים הפעילים** — כולם יצטרכו להתחבר מחדש.

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

שנה ב-env ו-restart השרת. אין צורך ב-migration script.

---

## ANTHROPIC_API_KEY

אין rotation script — עדכן ישירות ב-Anthropic Console ואז בenv.
שינוי מיידי ללא downtime (הkey מופעל ב-runtime לכל בקשה).

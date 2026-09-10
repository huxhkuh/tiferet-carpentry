# ראיות ושחזור הביקורת

הבדיקה בוצעה ב־9 בספטמבר 2026 מול commit `c6817bc`, ללא שינוי בקוד המוצר. השרתים המקומיים, הבנייה וקובצי הביניים של הביקורת השתמשו בתיקיית TEMP. קבצים אלה נשמרו כראיות למסמך הביקורת.

[הדוח המלא](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/AUDIT-AND-ACTION-PLAN.he.md)

## תוכן

| קובץ                                  | משמעות                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `inventory.json`                      | אינדקס 440 קבצים, ספירת שורות, מפת שפות ותוצאות חיפוש מבני. התאמה לחיפוש כגון `unsafe` אינה כשלעצמה ממצא אבטחה.    |
| `quality.log`                         | תוצאת `npm run quality:fast` לפני הוספת דוח הביקורת                                                                |
| `tests.log`                           | 4,730 בדיקות יחידה שעברו ב־293 קבצים                                                                               |
| `production-e2e.log`                  | 48 בדיקות שעברו על הבנייה ב־Chromium וב־Firefox, עם `--ignore-snapshots`                                           |
| `build.log`                           | פלט Vite, גודל chunks ו־precache                                                                                   |
| `bundle.log`                          | בדיקת התקציבים על אותו פלט בנייה: שלוש חריגות                                                                      |
| `dead.log`                            | פלט Knip: 29 ייצואים ו־26 טיפוסים מיוצאים ללא שימוש מזוהה                                                          |
| `probes.json`                         | חפיפה בפינה, חריגה מהחדר, מצולע קעור, חלקי מדפים, PDF מרובה עמודים, כתובת פגומה, שמירה וסיכום, ריהוט וגובה כרטיסים |
| `probes-2.json`                       | דיאלוג וניגודיות, חומר מותאם, פענוח Flate, כיוון סיבים, PWA בבנייה ותגובת הכתובת הציבורית                          |
| `probes-3.json`                       | סינון גלריה, ייבוא מערך ארונות ריק ואובדן WebGL; בדיקת תוויות שפה שלא שחזרה כשל                                    |
| `probes*.cjs.txt`                     | קוד השחזורים כפי שהורץ; נשמר כטקסט ראיות, ואינו חלק ממערכת הבדיקות של המוצר                                        |
| `playwright.config.mjs.txt`           | התצורה הזמנית להרצת E2E על שרת preview                                                                             |
| `*-desktop.png`, `planner-mobile.png` | צילומי הממשק שנבדק; אינם בסיס מאושר לבדיקות screenshot                                                             |

## שחזור מקומי

נדרש להריץ משורש המאגר, עם החבילות והדפדפנים של Playwright מותקנים. הסקריפטים משתמשים בפרופילי דפדפן מבודדים. הם משנים רק את התכנון בפרופיל הבדיקה; אינם משתמשים בפרופיל הגלישה האישי.

הפעלת שרת פיתוח, בטרמינל נפרד:

```powershell
npm run dev -- --host 127.0.0.1 --port 5198 --strictPort
```

הכנת קובצי השחזור בתיקייה זמנית:

```powershell
$auditRunDir = Join-Path $env:TEMP 'tiferet-audit-20260909'
New-Item -ItemType Directory -Force -Path $auditRunDir | Out-Null
foreach ($auditProbeName in @('probes', 'probes-2', 'probes-3')) {
  Copy-Item -LiteralPath "docs/audits/2026-09-09/evidence/$auditProbeName.cjs.txt" -Destination (Join-Path $auditRunDir "$auditProbeName.cjs")
}
```

`probes-2` זקוק גם לבנייה ולשרת preview. הבנייה בביקורת השתמשה ישירות ב־Vite כדי להימנע מהפעלת prebuild שמשנה קובץ גרסה; TypeScript נבדק ב־quality.

```powershell
npm exec -- vite build --outDir "$auditRunDir/dist"
npm exec -- vite preview --host 127.0.0.1 --port 4198 --strictPort --outDir "$auditRunDir/dist"
```

כאשר שני השרתים זמינים, הרץ בטרמינל נוסף משורש המאגר:

```powershell
$auditRunDir = Join-Path $env:TEMP 'tiferet-audit-20260909'
node "$auditRunDir/probes.cjs"
node "$auditRunDir/probes-2.cjs"
node "$auditRunDir/probes-3.cjs"
```

השחזור השני כולל ביקור קריאה בכתובת הציבורית. תוצאתו אינה מוכיחה זהות בין הבנייה המקומית לפרסום. השחזורים הם כלי חקירה ממוקדים, עם קלטים סינתטיים וקריאות ישירות לפונקציות; יש להמירם לבדיקות רגרסיה מסודרות בעת התיקון. בפרט, בדיקות ה־PDF אינן חבילת תאימות לתקן PDF.

להרצת בדיקות הדפדפן על הבנייה:

```powershell
Copy-Item -LiteralPath 'docs/audits/2026-09-09/evidence/playwright.config.mjs.txt' -Destination "$auditRunDir/playwright.config.mjs"
npm exec -- playwright test --config "$auditRunDir/playwright.config.mjs" --ignore-snapshots
```

בדיקת ה־bundle הורצה באמצעות עותק של `scripts/bundle-report.js` בשם `bundle-report.mjs` בתיקיית TEMP, עם עותק של `config/bundle-budget.json` ומול `dist` הזמני. הקוד והספים לא שונו. אין להסיק מבדיקה זו שנמדדו זמני רשת או ביצועי מכשיר יעד.

## שימוש ברשימת המשימות

`ACTION-BACKLOG.csv` מכיל 40 שורות עם עדיפות, ראיות, שלב ראשי, אחריות מוצעת, תלויות, תיקון וקריטריון סיום. כל המשימות עדיין מתוכננות. S/M/L הם היקפים יחסיים: שינוי ממוקד, שינוי בכמה רכיבים, או שינוי רוחבי. אומדני הימים מופיעים בטבלת השלבים בדוח; אין לחבר אותם עם היקפי השורות כאילו היו הערכות נפרדות.

נשמרה תלות עיקרית לכל שורה. כמה משימות מופיעות ביותר משלב אחד בדוח משום שהן מתחילות בתיקון קטן ומסתיימות בהרחבת התשתית. האחריות היא תפקיד מוצע, ולא הקצאה לאדם או התחייבות מצד צוות קיים.

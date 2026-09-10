# תפארת — ביקורת מערכת ותוכנית פעולה

תאריך: 9 בספטמבר 2026 · גרסה: 5.32.0 · בסיס הבדיקה: commit `c6817bc`.

קבצים נלווים: [רשימת 40 המשימות ב־CSV](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/ACTION-BACKLOG.csv) · [אינדקס כל קובצי המקור](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/CODE-INVENTORY.md) · [תיעוד הבדיקות והשחזורים](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/README.md).

## ההחלטה המומלצת

להשקיע תחילה באמינות התכנון ובמסלול שלם מדירה עד מפרט. יש כאן תשתית שימושית ורחבה, אך החיבורים בין האתר, מתכנן הדירות וסביבת הנגרייה עדיין אינם מהווים מוצר רציף שאפשר לסמוך על כל תוצריו. תוספת ריהוט, אפקטים או מחשבונים לפני סגירת הפערים האלה תגדיל את היקף התחזוקה ואת הסיכוי לסתירות.

הכיוון המומלץ: **כלי בעברית שעוזר לדייר לתכנן נגרות בתוך הדירה שלו, להשוות חלופות ולהעביר לאיש מקצוע מפרט ראשוני עקבי וברור.** סביבת הנגרייה תהיה השלב המקצועי של אותו תכנון, עם בדיקות נוספות לפני ייצור.

זהו דוח ביקורת ותכנון. לא שונה קוד המוצר, לא פורסמה גרסה ולא בוצעו שינויים בשירות חיצוני.

## מה נבדק ומה אפשר להסיק

מופו כל 440 הקבצים ב־`src`: כ־99,163 שורות, לרבות תרגומים ונתונים. הסקירה כללה את מבנה המערכת, נקודות הכניסה, חיבורי המודולים, מסלולי שמירה וייבוא, חישובי הארונות, ייצוא, גאומטריה, ההדמיה, האתר, בדיקות ותהליכי בנייה ופרסום. בוצעו קריאות עומק במסלולים המרכזיים ושחזורים ממוקדים בקוד ובדפדפן.

| תחום                         |                             היקף | רמת בדיקה                                                                          |
| ---------------------------- | -------------------------------: | ---------------------------------------------------------------------------------- |
| מנוע חישובים                 |          177 קבצים, 38,175 שורות | מיפוי מלא; בדיקת עומק בחלקים, מידות, חומרים, אופטימיזציה וייצוא; הרצת בדיקות המנוע |
| רכיבי סביבת הנגרייה          |          121 קבצים, 20,618 שורות | מיפוי, קריאת מסלולים מרכזיים ובדיקות דפדפן                                         |
| מתכנן דירות                  |           42 קבצים, 11,140 שורות | קריאת עומק בגאומטריה, מצב, שמירה, ייבוא, 2D ו־3D; שחזורי קצה                       |
| אתר תפארת                    |            23 קבצים, 4,305 שורות | מעבר בכל 11 סוגי המסכים; צילומי מסך במחשב ובמובייל                                 |
| מצב, כלים, שירותים ו־Workers | 62 קבצים בקבוצות אלה, כולל hooks | סקירת גבולות, שגיאות, התמדה ותלות בחישוב אסינכרוני                                 |
| תרגום                        |                     שישה מילונים | השוואת מפתחות בכל השפות ובדיקת מנגנון השפות                                        |
| תשתית                        | קובצי תצורה, scripts ו־workflows | איכות, גודל חבילה, בדיקות, PWA ופרסום                                              |

**אין כאן טענה שכל שורה הוכחה כנכונה או שכל באג אפשרי אותר.** לא בוצע אימות פיזי של נגרות, לא נבדקו כל נוסחאות המחשבונים מול איש מקצוע, ולא אומתו מחדש 99 מסמכי הדירות מול המקור. אלה משימות מוגדרות בתוכנית ההמשך. הכתובת הציבורית החזירה HTTP 200; ממצאי ההתנהגות מיוחסים לגרסה המקומית שנבדקה, בלי להניח שהפרסום הציבורי זהה לה.

### תוצאות שנמדדו

| בדיקה                                   | תוצאה                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run quality:fast`                  | עבר, כולל TypeScript, lint, עיצוב, תיעוד, EN/HE ותקציב PDF                                 |
| `npm test -- --maxWorkers=3`            | 293 קובצי בדיקות, 4,730 בדיקות עברו                                                        |
| בניית Vite אל תיקייה זמנית              | עברה; בדיקת TypeScript הורצה בנפרד במסגרת quality                                          |
| E2E על הבנייה ב־Chromium וב־Firefox     | 48 עברו; השוואת תמונות baseline הושבתה במפורש                                              |
| E2E על שרת פיתוח                        | 23 עברו ואחת נכשלה ברישום SW; אותה בדיקה עברה על הבנייה                                    |
| תקציב bundle על הבנייה                  | נכשל: JS 2,911.9 KB מול 2,850; CSS 111.8 מול 110; חבילה לפי הגדרת התקציב 3,114.6 מול 3,050 |
| `npm run dead:check`                    | נכשל: 29 ייצואים ו־26 טיפוסים מיוצאים ללא שימוש מזוהה                                      |
| axe בחלון הגרסאות                       | נמצאה הפרת ניגודיות אחת; בנוסף שוחזרו בעיות מקלדת                                          |
| גלישה לא מקוונת בביקור ראשון באתר הבנוי | נכשלה; לא נרשם service worker במסלול האתר                                                  |

בדיקות E2E שעברו אינן אישור לנגישות מלאה או לנאמנות חזותית. ב־CI מוגדר `--ignore-snapshots`; גם כאן הצילומים נבדקו בעין ולא הושוו אוטומטית לבסיס מאושר. לא בוצעו Lighthouse, benchmark מלא, בדיקת Safari אמיתי, קורא מסך או סריקת חולשות חבילות מול מאגר חיצוני. לא ידוע מכאן שהמערכת חפה מחולשות.

קובצי השחזור, התוצאות וצילומי המסך נמצאים בתיקיית `evidence` הסמוכה. קיים גם אינדקס של כל 440 קובצי המקור.

## ממצאים ותיקונים

סדר עדיפות: **P1** — דיוק, אובדן עבודה או תקלה בתהליך מרכזי; **P2** — שימושיות, אמינות ותשתית שיש להשלים לפני הרחבה; **P3** — שיפור מתוכנן. סוג הראיה מצוין בכל ממצא: שחזור בפועל, ממצא קוד, או המלצת מוצר/עיצוב. לא נמצא בסיס לקביעה גורפת של אירוע P0 פעיל.

### A01 — מעבר לסיכום מאבד את השינויים האחרונים · P1 · שוחזר

נשמר ארון ברוחב 180 ס״מ, הרוחב שונה ל־200, ונלחץ ״סיכום״. הסיכום הציג 180. כפתור הסיכום מנווט ללא שמירה; הדף הבא קורא localStorage והמצב בזיכרון מתפרק.

**תיקון:** מסמך תכנון משותף, סימון שינויים שלא נשמרו, שמירה לפני מעבר עם טיפול בכישלון, ושחזור טיוטה. **סיום:** שינוי → סיכום → חזרה → רענון שומרים על אותו רוחב; כישלון אחסון אינו מאבד את המצב.

ראיות: [src/apartment/PlannerApp.tsx:903](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:903), [src/site/pages/SummaryPage.tsx:49](C:/Users/yosi/Downloads/DFDF/src/site/pages/SummaryPage.tsx:49), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A02 — סיכום חלקי שאינו משקף את התכנון · P1 · שוחזר

פריט ״צמח״ נוסף ונשמר, אך לא הופיע בסיכום. הסיכום עובר רק על `placements`, ללא הריהוט הנוסף, השינויים בריהוט המקורי או תצוגת התכנון המעודכן. התמונה היא תוכנית דירה סטטית.

**תיקון:** להפיק סיכום מאותה גרסת מסמך: נגרות, ריהוט, פריטים מוסתרים והסבר משמעות ההסתרה, מידות, מיקום, חומרים, הערות ואי־ודאות. **סיום:** לכל פריט במסמך יש ייצוג בסיכום או סיבה גלויה להחרגתו.

ראיות: [src/site/pages/SummaryPage.tsx:52](C:/Users/yosi/Downloads/DFDF/src/site/pages/SummaryPage.tsx:52), [src/apartment/PlannerApp.tsx:589](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:589), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A03 — מחיצות אמצע אינן תואמות לחלקי המדפים · P1 · פלט המנוע שוחזר

בארון ברוחב 1,800 מ״מ עם תמיכת אמצע, חישוב השקיעה משתמש בחצי מפתח; ברשימת החיתוך נשארו מדפים ברוחב כמעט מלא: 1,764 מ״מ, מדף קבוע 1,766 מ״מ, ומחיצה מלאה בגובה 2,366 מ״מ. אין פירוט חיבור שמאפשר ללוחות המלאים לעבור זה דרך זה.

**תיקון:** להכריע בשיטת בנייה: מדפים מחולקים לתאים או מחיצה מחולקת עם חיבור מתאים. לגזור ממנה אורכים, כמויות, קידוחים, הרכבה והדמיה. **סיום:** חלקים שאפשר להרכיב פיזית, בלי חפיפה, עם חישוב שקיעה לפי המפתח האמיתי.

ראיות: [src/engine/dimensions.ts:34](C:/Users/yosi/Downloads/DFDF/src/engine/dimensions.ts:34), [src/engine/parts.ts:178](C:/Users/yosi/Downloads/DFDF/src/engine/parts.ts:178), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A04 — ארונות על קירות ניצבים יכולים לחפוף · P1 · שוחזר

שני ארונות בעומק 600 וברוחב 1,000 מ״מ התקבלו באותה פינת חדר, אחד לכל קיר. ההצבה בודקת ארונות על אותו `wallId`; היא אינה בודקת חפיפת נפחים בין קירות שונים.

**תיקון:** בדיקת מעטפת בין כל הארונות בחדר, כולל פינות, זוויות והפרדה בגובה. **סיום:** ההצבה השנייה נדחית עם סימון האזור והצעת מיקום תקין, והבדיקה פועלת גם בעריכה, שחזור וייבוא.

ראיות: [src/apartment/geometry/intervals.ts:107](C:/Users/yosi/Downloads/DFDF/src/apartment/geometry/intervals.ts:107), [src/apartment/cabinet/adapter.ts:76](C:/Users/yosi/Downloads/DFDF/src/apartment/cabinet/adapter.ts:76), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A05 — ארון יכול לצאת מגבולות החדר · P1 · שוחזר

חדר בדיקה בעומק 400 מ״מ קיבל ארון בעומק 600. תקינות ההצבה נשענת על קטע פנוי לאורך הקיר ועל ריהוט, ללא בדיקה כוללת של גבול החדר, קבועות ונפח מותר.

**תיקון:** validator אחד לכל מעטפת ההצבה: רצפה, קירות, עמודים, פירים, קבועות ותחום גובה. **סיום:** אי אפשר ליצור או לשמור ארון החורג מהמעטפת המאומתת; מידות לא ידועות מדווחות במפורש.

ראיות: [src/apartment/cabinet/adapter.ts:76](C:/Users/yosi/Downloads/DFDF/src/apartment/cabinet/adapter.ts:76), [src/apartment/PlannerApp.tsx:548](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:548), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A06 — בדיקת פנים חדר אינה תקינה לכל מצולע קעור · P1 · שוחזר

מלבן שכל פינותיו בתוך חדר בצורת U התקבל אף שצלעותיו חוצות את המגרעת שמחוץ לחדר. בדיקת פינות בלבד אינה מוכיחה הכלה של כל הפריט.

**תיקון:** הכלת מצולע מלאה באמצעות חיתוך צלעות/חיסור שטחים, עם tolerance אחיד ביחידות המודל. **סיום:** בדיקות L/U, קירות אלכסוניים, מגע בגבול, צלעות קצרות ופריטים מסובבים.

ראיות: [src/apartment/geometry/scene-collision.ts:79](C:/Users/yosi/Downloads/DFDF/src/apartment/geometry/scene-collision.ts:79), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A07 — בדיקת פתחים ומרחבי שימוש מוגבלת · P2 · ממצא קוד

קטעי פתחים נחסמים לאורך הקיר ללא הבחנה בגובה; התנגשות ריהוט מתבססת בעיקר על היטל רצפה. חסרים כללים מחוברים לפתיחת דלת, שליפת מגירה, מעבר, שימוש במכשיר וארון עליון. במודלים מיובאים הפתחים עדיין ריקים ומסומנים כטעוני אימות.

**תיקון:** מעטפת גוף ומעטפת שימוש נפרדות, טווחי גובה, וסטטוס ״לא ניתן לקבוע״ כשהמקור חסר. **סיום:** בדיקות לחלון מעל ארון נמוך, ארון עליון, מגירה מול מיטה ופתחים מיובאים שלא אומתו. ספים מקצועיים ייקבעו עם איש מקצוע.

ראיות: [src/apartment/geometry/intervals.ts:42](C:/Users/yosi/Downloads/DFDF/src/apartment/geometry/intervals.ts:42), [src/apartment/geometry/scene-collision.ts:132](C:/Users/yosi/Downloads/DFDF/src/apartment/geometry/scene-collision.ts:132), [src/apartment/import/model.ts:36](C:/Users/yosi/Downloads/DFDF/src/apartment/import/model.ts:36).

### A08 — ייבוא PDF מערבב עמודים · P1 · שוחזר

קובץ בדיקה עם שני עמודים ושני מלבנים נפרדים החזיר את שניהם באותה גאומטריה, לצד ההודעה ״בשלב זה מיובא העמוד הראשון בלבד״. הקוד עובר על כל ה־streams בלי לשייך אותם לעמוד הנבחר.

**תיקון:** בחירת עמוד ומעקב אחר עץ הדפים, Contents ו־Resources; עד השלמה, לדחות בבירור מסמכים מרובי עמודים. **סיום:** עמוד ראשון אינו מכיל אף פריט מהשני, כולל בדיקות Form XObject וסיבוב.

ראיות: [src/apartment/import/pdf-vector-parser.ts:318](C:/Users/yosi/Downloads/DFDF/src/apartment/import/pdf-vector-parser.ts:318), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A09 — שני מסלולי PDF בעלי יכולות שונות · P2 · שוחזר חלקית

דף הייבוא משתמש במפרש וקטורים עם תקציבי זיכרון. חלון ״גרסאות ושיתוף״ משתמש במנתח אחר: הוא ממיר PDF בינארי ל־UTF-8 לפני החזרת ה־stream לבתים. זרם Flate תקין בתוך קובץ בדיקה סינתטי לא פוענח שם. במסלול הישן גם אין אותה הגבלת נפח לאחר פריסה וקיימת פריסה מקבילית של streams.

**תיקון:** לאחד את שני הממשקים לצינור ייבוא אחד, עם קלט בינארי, מגבלות פענוח, ביטול, Worker ואותו מילון מצבים. **סיום:** אותו קובץ נותן אותן ראיות ואותן מגבלות מכל נקודת כניסה.

ראיות: [src/apartment/import/pdf-import.ts:50](C:/Users/yosi/Downloads/DFDF/src/apartment/import/pdf-import.ts:50), [src/apartment/import/pdf-vector-parser.ts:231](C:/Users/yosi/Downloads/DFDF/src/apartment/import/pdf-vector-parser.ts:231), [probes-2.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-2.json).

### A10 — חומרים מותאמים אינם עוברים למנוע · P1 · שוחזר

חומר חדש מופיע במאגר החומרים ובבורר, אך בחירתו ב־store גורמת ל־`Unknown material`. חלק מהפונקציות מקבלות `extraMaterials`; חישוב הבסיס, החלקים וה־Workers עדיין מחפשים בקטלוג המובנה.

**תיקון:** הקשר חומרים מפורש ומשותף לכל החישובים, ה־Workers והשמירות. **סיום:** חומר חדש בעובי 19 מ״מ משפיע באופן עקבי על המידות, החיתוך, המחיר והייצוא, ונשמר בייבוא/ייצוא בין מכשירים.

ראיות: [src/components/configurator/MaterialSelector.tsx:32](C:/Users/yosi/Downloads/DFDF/src/components/configurator/MaterialSelector.tsx:32), [src/store/cabinet-store.ts:210](C:/Users/yosi/Downloads/DFDF/src/store/cabinet-store.ts:210), [src/engine/parts.ts:16](C:/Users/yosi/Downloads/DFDF/src/engine/parts.ts:16), [probes-2.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-2.json).

### A11 — אילוץ כיוון סיבים ברמת חלק אינו מחובר · P1 · שוחזר

`applyGrainConstraints` קיים ונבדק ביחידה, אך אינו נקרא במסלול הייצור. חלק עם `along-width` נשאר באוריינטציה המקורית כאשר נשלח ישירות לאופטימייזר. נעילת סיבוב רגילה קיימת, אך אינה מממשת את מלוא התכונה המתועדת.

**תיקון:** לחבר אילוץ סיבים בנקודה יחידה לפני האופטימיזציה ולשמור את האוריינטציה המקורית עבור מידות ותוויות. **סיום:** בדיקת מסלול שלם מבחירה בממשק ועד תוצאת nesting, כולל שמירה ו־co-nesting.

ראיות: [src/engine/grain-constraint.ts:19](C:/Users/yosi/Downloads/DFDF/src/engine/grain-constraint.ts:19), [src/store/worker-schedule.ts:142](C:/Users/yosi/Downloads/DFDF/src/store/worker-schedule.ts:142), [src/engine/cut-optimizer.ts:82](C:/Users/yosi/Downloads/DFDF/src/engine/cut-optimizer.ts:82), [probes-2.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-2.json).

### A12 — ריווח החיתוך אינו מותאם לכלי CNC · P1 · ממצא קוד ופלט

ברירת המחדל של ריווח המסור היא 4 מ״מ, בעוד שייצוא CNC משתמש בכרסום בקוטר 6 מ״מ ופיצוי חיצוני. בחלקים סמוכים במרחק 4 מ״מ, מעטפת הכלי של פרופיל אחד יכולה לחדור לחלק השכן. הערות הקוד מזכירות tabs, אך מסלול הפרופיל המוצג אינו מייצר אותם.

**תיקון:** פרופיל ייצור שמגדיר כלי, ריווח מינימלי, אחיזה, גבולות מכונה ופסולת קצה; nesting וייצוא נגזרים ממנו. **סיום:** הדמיית מעטפת הכלי מוכיחה שאינה פוגעת בחלק אחר, וחבילת CNC עוברת ביקורת איש מקצוע. קואורדינטות שליליות לבדן אינן הוכחה לתקלה, כי הן תלויות בהגדרת המכונה.

ראיות: [src/engine/materials.ts:236](C:/Users/yosi/Downloads/DFDF/src/engine/materials.ts:236), [src/utils/gcode-export.ts:41](C:/Users/yosi/Downloads/DFDF/src/utils/gcode-export.ts:41), [src/utils/gcode-export.ts:101](C:/Users/yosi/Downloads/DFDF/src/utils/gcode-export.ts:101).

### A13 — ייצוא כל הלוחות ל־G-code מחבר תוכניות שכבר הסתיימו · P1 · ממצא קוד

`downloadAllSheetsGcode` מחבר את התוכניות לקובץ אחד, כאשר כל לוח מסתיים ב־M2. בבקרים כגון LinuxCNC שורות אחרי M2 אינן מבוצעות; אין כאן תהליך אמיתי להחלפת לוחות.

**תיקון:** ZIP עם קובץ עבודה נפרד לכל לוח ומניפסט, או job מפורש המותאם לבקר ולתהליך ההחלפה. **סיום:** שני לוחות מייצרים שני jobs ניתנים לזיהוי, ולא קובץ שהתוכנית בו מסתיימת לאחר הראשון.

ראיות: [src/utils/gcode-export.ts:92](C:/Users/yosi/Downloads/DFDF/src/utils/gcode-export.ts:92), [src/utils/gcode-export.ts:139](C:/Users/yosi/Downloads/DFDF/src/utils/gcode-export.ts:139). התנהגות M2: [תיעוד LinuxCNC](https://linuxcnc.org/docs/html/gcode/m-code.html#_m2_m30_program_end).

### A14 — ייבוא פרויקט מאמת מעטפת ולא תוכן · P1 · שוחזר

`migrateProject` מקבל מערך ארונות ריק, ומבצע cast לתוכן המערך בלי אימות מלא. טעינת התוצאה גורמת ל־TypeError בחישוב `config` של הארון הראשון. קיימים גם מסלולי שמירה לפני אימות סמנטי מלא.

**תיקון:** אימות מלא לפני החלת מצב או כתיבה: כמות פריטים, מזהים, יחידות, טווחים, חומרים, קשרים, גרסת סכימה ונפח קלט. **סיום:** קלט פגום נדחה עם הודעה ממוקדת וללא שינוי הפרויקט הקיים; קלט ישן תקין עובר migration.

ראיות: [src/utils/project-storage.ts:102](C:/Users/yosi/Downloads/DFDF/src/utils/project-storage.ts:102), [src/store/cabinet-store.ts:638](C:/Users/yosi/Downloads/DFDF/src/store/cabinet-store.ts:638), [src/apartment/persistence/design.ts:99](C:/Users/yosi/Downloads/DFDF/src/apartment/persistence/design.ts:99), [probes-3.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-3.json).

### A15 — ניתן לייצא לפני שחישובי הרקע תואמים לגרסה · P1 · ממצא קוד

מידות וחלקים מתעדכנים מיד, ואופטימיזציה מתעדכנת לאחר Worker. כפתורי ה־PDF נחסמים בזמן יצירת קובץ, אך אינם תלויים ב־`optimizationPending`. לכן יש חלון שבו המפרט החדש ותוכנית החיתוך הישנה יכולים להיכלל באותו ייצוא.

**תיקון:** מספר revision או hash לכל מסמך ותוצאת חישוב; ייצוא רק מתצלום מצב שכל תוצריו שייכים לאותה גרסה. **סיום:** Worker מושהה + שינוי מידות + ייצוא אינם מאפשרים ערבוב גרסאות.

ראיות: [src/store/cabinet-store.ts:210](C:/Users/yosi/Downloads/DFDF/src/store/cabinet-store.ts:210), [src/store/worker-schedule.ts:164](C:/Users/yosi/Downloads/DFDF/src/store/worker-schedule.ts:164), [src/components/pdf/PdfExportPanel.tsx:35](C:/Users/yosi/Downloads/DFDF/src/components/pdf/PdfExportPanel.tsx:35), [src/components/pdf/PdfExportPanel.tsx:324](C:/Users/yosi/Downloads/DFDF/src/components/pdf/PdfExportPanel.tsx:324).

### A16 — התאוששות Workers חלקית · P2 · ממצא קוד

קיימת הגנת latest-wins במסלול ההצלחה, אך catch יכול לשנות pending גם כשקריאה חדשה יותר פועלת. אין timeout וסגירה/יצירה מחדש של Worker תקוע. כישלון משאיר תוצאות קודמות בלי מצב שגיאה עשיר.

**תיקון:** בעלות על חיי Worker, מזהה בקשה בכל מסלול, timeout, ביטול, retry מוגבל ומצב ״תוצאה לא מעודכנת״. **סיום:** בדיקות לתשובות בסדר הפוך, דחייה ישנה, קריסה ובקשה שאינה מחזירה תשובה.

ראיות: [src/store/worker-schedule.ts:120](C:/Users/yosi/Downloads/DFDF/src/store/worker-schedule.ts:120), [src/store/worker-schedule.ts:243](C:/Users/yosi/Downloads/DFDF/src/store/worker-schedule.ts:243).

### A17 — ההדמיה בונה ארון לפי נוסחאות שונות · P1 · ממצא קוד

בתלת־ממד עובי הדופן נקבע בטווח 24–36 מ״מ לפי רוחב הארון; המנוע משתמש בעובי החומר. מדפים בהדמיה בעובי 24, אזור המגירות הוא 34% מהגובה, והלוגיקה אינה מפצלת את סוגי הרהיטים כמו מחולל החלקים. כך מראה הארון, המדפים והחזיתות אינו חוזה ייצור של אותו מפרט.

**תיקון:** תיאור חלקים מרחבי אחד עם position, rotation, material ויחסים. ממנו לייצר 2D, 3D, BOM וייצוא. **סיום:** שינוי עובי, גב, סוג רהיט, תמיכה או גובה מגירה מתבטא זהה בכל המבטים.

ראיות: [src/apartment/three/scene.ts:580](C:/Users/yosi/Downloads/DFDF/src/apartment/three/scene.ts:580), [src/apartment/three/scene.ts:636](C:/Users/yosi/Downloads/DFDF/src/apartment/three/scene.ts:636), [src/engine/dimensions.ts:29](C:/Users/yosi/Downloads/DFDF/src/engine/dimensions.ts:29), [src/engine/parts.ts:24](C:/Users/yosi/Downloads/DFDF/src/engine/parts.ts:24).

### A18 — רצפה וקבועות אדריכליות אינן מיוצגות באופן מלא ב־3D · P2 · ממצא קוד

הרצפה נוצרת כמניפת משולשים מהנקודה הראשונה. שיטה זו אינה מבטיחה נכונות לכל מצולע קעור. הסצנה בונה קירות סמנטיים, ארונות וריהוט, בלי צריכה ישירה של `wallMasses`, `fixedElements` ו־`fixtures` כתשתית אדריכלית אחת.

**תיקון:** triangulation למרובים קעורים ולחורים, ויצירת מעטפת אדריכלית מאותה גאומטריה שמוצגת ב־2D. **סיום:** חדר מדורג, פיר, עמוד ומסתור נשארים זהים ב־2D וב־3D. אין להסיק מכאן שכל חדר קיים מצויר באופן שגוי.

ראיות: [src/apartment/three/scene.ts:175](C:/Users/yosi/Downloads/DFDF/src/apartment/three/scene.ts:175), [src/apartment/three/scene.ts:711](C:/Users/yosi/Downloads/DFDF/src/apartment/three/scene.ts:711), [src/apartment/components/Plan2D.tsx:115](C:/Users/yosi/Downloads/DFDF/src/apartment/components/Plan2D.tsx:115).

### A19 — אובדן WebGL אינו מחליף את מצב ההדמיה · P2 · שוחזר

לאחר `WEBGL_lose_context` הקנבס המשיך לדווח `ready` ולא הוצג fallback. קיימת בדיקת אי־זמינות בזמן ההקמה, אך לא טיפול באובדן הקשר אחרי שהרכיב כבר פועל.

**תיקון:** טיפול ב־contextlost/contextrestored, מצב התאוששות, ניקוי משאבים ופעולת מעבר ל־2D. להשתמש גם ב־ResizeObserver לשינוי גודל המשטח. **סיום:** כשל יזום ושחזור אינם מאבדים את התכנון או משאירים מסך שנראה פעיל.

ראיות: [src/apartment/components/Room3D.tsx:130](C:/Users/yosi/Downloads/DFDF/src/apartment/components/Room3D.tsx:130), [src/apartment/three/renderer.ts:119](C:/Users/yosi/Downloads/DFDF/src/apartment/three/renderer.ts:119), [probes-3.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-3.json).

### A20 — איכות החומרים והתאורה מוגבלת · P3 · המלצת עיצוב מבוססת קוד

המשטחים נראים גושיים; הטקסטורה היא חישוב בסיסי, התאורה קבועה ואלפא הפלט תמיד 1, גם לחומר זכוכית. צל מוצג כגאומטריה שטוחה. זה מספיק להמחשת נפח, אך לא להחלטת גוון וגמר.

**תיקון:** קודם נאמנות גאומטרית; לאחר מכן טקסטורות בקנה מידה אמיתי, כיוון סיבים לפי חלק, roughness, צל מגע, קצוות עדינים ותאורה ניטרלית. **סיום:** סצנת בדיקה קבועה שמבדילה בבירור עץ/בד/מתכת/זכוכית בלי לעוות מידות או גוון.

ראיות: [src/apartment/three/renderer.ts:78](C:/Users/yosi/Downloads/DFDF/src/apartment/three/renderer.ts:78), [planner-3d-desktop.png](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/planner-3d-desktop.png).

### A21 — בחירה ותפעול במודל דורשים מעבר לבקרים חיצוניים · P2 · קוד ובדיקה חזותית

בחירת ריהוט בתלת־ממד נעשית באמצעות רשימת כפתורים; לחיצה על הקנבס מיועדת לסיבוב. חסרים picking של הגוף, pan, מדידת מרווח והצגה ברורה של הפריט הנבחר. שינוי שם וסוג ברשימה אינו מספיק כאשר בחדר יש פריטים דומים.

**תיקון:** בחירה מסונכרנת במודל וברשימה, outline, הצגה/הסתרה/נעילה, בקרי הזזה וסיבוב ומידות סביב הפריט. **סיום:** משתמש חדש מזהה, בוחר ומשנה את הפריט הנכון בלי לנחש איזה כפתור מייצג אותו; כל פעולה נגישה גם במקלדת.

ראיות: [src/apartment/components/Room3D.tsx:260](C:/Users/yosi/Downloads/DFDF/src/apartment/components/Room3D.tsx:260), [src/apartment/components/Plan2D.tsx:94](C:/Users/yosi/Downloads/DFDF/src/apartment/components/Plan2D.tsx:94).

### A22 — תכנון במובייל מחייב גלילה בין המודל לבקרים · P2 · נצפה

אין גלישה אופקית בתרחישים שנבדקו, אך זו בדיקה חלשה ביחס לשימושיות. במובייל המשטח, בחירת הקיר, בחירת החדר, קטלוג, שכבות ועריכה נערמים לאורך הדף; כותרת דביקה בעלת מספר שורות צורכת חלק משמעותי מהמסך.

**תיקון:** משטח עבודה נשאר גלוי, סרגל פעולות קצר ותפריט עריכה תחתון במצבי גובה. חדרים וקטלוג נפתחים לפי צורך. **סיום:** הוספה, עריכת מידות, סיבוב, ביטול ושמירה ב־390×844 בלי לאבד את המודל מהעין ובלי חסימה על ידי המקלדת.

ראיות: [src/apartment/PlannerApp.tsx:875](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:875), [src/apartment/PlannerApp.tsx:1178](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:1178), [planner-mobile.png](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/planner-mobile.png).

### A23 — חלונות דיאלוג אינם עקביים בנגישות · P2 · שוחזר

בחלון הגרסאות המיקוד נשאר מאחור ו־Escape לא סגר אותו; axe מצא הפרת ניגודיות אחת. חלון גלריה מממש דיאלוג בנפרד. לעומת זאת, לתפריט המובייל הראשי כבר קיימות בדיקות מיקוד טובות.

**תיקון:** רכיב Dialog/Drawer משותף עם initial focus, focus trap, Escape, החזרת מיקוד, נעילת גלילת רקע ומצב שגיאה. **סיום:** בדיקת מקלדת לכל חלון פתוח, מעבר Tab לשני הכיוונים ו־axe במצב הפעיל.

ראיות: [src/apartment/components/DesignLibraryPanel.tsx:20](C:/Users/yosi/Downloads/DFDF/src/apartment/components/DesignLibraryPanel.tsx:20), [src/site/pages/EditorialPages.tsx:53](C:/Users/yosi/Downloads/DFDF/src/site/pages/EditorialPages.tsx:53), [probes-2.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-2.json).

### A24 — מסנני גלריה משנים מראה בלי לסנן · P2 · שוחזר

לחיצה על ״מטבחים״ השאירה את כל ששת הפריטים. המשתנה `filter` משמש לסימון הכפתור, אך הגלריה ממשיכה לעבור על `SPACE_CATEGORIES` ללא סינון.

**תיקון:** קטגוריה סמנטית בכל פריט, רשימה מסוננת, מצב ריק ומספר תוצאות. **סיום:** ״מטבחים״ מחזיר רק מטבחים; ״הכול״ משחזר את הרשימה; בחירת פרויקט יכולה לשאת את ההקשר לתכנון.

ראיות: [src/site/pages/EditorialPages.tsx:10](C:/Users/yosi/Downloads/DFDF/src/site/pages/EditorialPages.tsx:10), [probes-3.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-3.json).

### A25 — טופס הקשר אינו יוצר פנייה או תיעוד · P2 · ממצא קוד

הטופס מצהיר שהוא אינו מחובר לשליחה, אך גם ״תיעוד מקומי״ אינו נשמר: השליחה מעדכנת הודעת מצב בלבד. הדירה המופיעה בו קבועה. אחרי רענון אין פנייה ואין מזהה להמשך.

**תיקון:** לבחור ערוץ עסקי אמיתי עם הבעלים; עד אז להציע הורדת בקשה או העתקת סיכום. לאחר חיבור: validation, אישור קבלה, retry ומזהה פנייה, תוך צירוף גרסת התכנון בהסכמה. **סיום:** בקשה מגיעה לערוץ שנבחר, אפשר לזהות אותה ואין הודעת הצלחה כוזבת. פרטי עסק לא יומצאו.

ראיות: [src/site/pages/ContactPage.tsx:4](C:/Users/yosi/Downloads/DFDF/src/site/pages/ContactPage.tsx:4).

### A26 — אורך דף הבית אינו נשלט היטב · P2 · נמדד

ברוחב 1,440 נמדד דף בגובה 9,737 פיקסלים. כרטיס ״חדרי ילדים״ בגובה 1,818 פיקסלים בגלל יחס התמונה האנכית בתוך הכרטיס הרחב. התוצאה דוחקת את החומרים והקריאה לפעולה הרחק למטה. תמונות שלא נטענו בצילום הראשוני נבדקו שוב לאחר גלילה; הן אינן מדווחות כקבצים חסרים.

**תיקון:** יחסי תמונה מכוונים לכל סוג כרטיס, גובה מרבי וחיתוך מוקד מתאים; לקצר חזרות במסרים. ליצור גדלים רספונסיביים גם לתמונות הגלריה, ולא רק ל־hero. **סיום:** אין כרטיס מקרי בגובה כמעט שני מסכים, והמשתמש מבין את השירות והפעולה המרכזית מוקדם.

ראיות: [src/site/site.css:756](C:/Users/yosi/Downloads/DFDF/src/site/site.css:756), [src/site/components/EditorialImage.tsx:10](C:/Users/yosi/Downloads/DFDF/src/site/components/EditorialImage.tsx:10), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A27 — אתר התדמית והמתכנן אינם חולקים שפה חזותית מלאה · P2 · המלצת עיצוב

לאתר יש פלטה חמה ושפה של סטודיו, אך המתכנן נראה כמו כלי נפרד: משקלים שונים, כפתורים רבים באותה חשיבות, לוגו אנכי לא תמיד קריא ובקרים מפוזרים. ההיררכיה צריכה להבחין בין ניווט, כלי עבודה, מאפיינים ואזהרות.

**תיקון:** tokens משותפים לצבע, טיפוגרפיה, צפיפות, גובה בקרים, רדיוס ופוקוס; לוגו קומפקטי קריא; פעולה ראשית אחת בכל הקשר. **סיום:** מפרט רכיבים שמיושם באתר, במתכנן ובחלונות, עם בדיקת עברית ומצבי ניגודיות.

ראיות: [src/site/site.css:1](C:/Users/yosi/Downloads/DFDF/src/site/site.css:1), [src/index.css:1](C:/Users/yosi/Downloads/DFDF/src/index.css:1), [src/site/components/BrandMark.tsx:1](C:/Users/yosi/Downloads/DFDF/src/site/components/BrandMark.tsx:1), צילומי הראיות.

### A28 — ניווט אינו מנהל את מצב העמוד והפרויקט · P2 · ממצא קוד

ניווט מעדכן history ו־state בלבד, ללא מדיניות גלילה, מיקוד כותרת או שינויים לא שמורים. זהויות דירה ותכנון אינן חלק עקבי מכל הכתובות; מספר הגיליון ומספר הדירה משמשים לעיתים כמונחים מתחלפים.

**תיקון:** חוזה ניווט עם apartmentId, designId ו־roomId, breadcrumbs ומדיניות focus/scroll. **סיום:** קישור ישיר, אחורה/קדימה ורענון משחזרים את ההקשר; דף חדש נפתח באזור הרלוונטי.

ראיות: [src/site/TiferetSite.tsx:74](C:/Users/yosi/Downloads/DFDF/src/site/TiferetSite.tsx:74), [src/site/router.ts:1](C:/Users/yosi/Downloads/DFDF/src/site/router.ts:1), [src/site/pages/MyApartmentPage.tsx:7](C:/Users/yosi/Downloads/DFDF/src/site/pages/MyApartmentPage.tsx:7).

### A29 — המערכת הציבורית מקובעת למודל דירה יחיד · P2 · ממצא קוד

״הדירה שלי״ והסיכום משתמשים ב־`TIFERET_5_1`; מסלול דירה מיובאת נפרד ואין לו אותו סיכום. האינוונטר מתעד 99 תוכניות דירה, אך רק אחת מסומנת כבעלת מודל חלקי. לפי הדוח הקיים 48 קבצים נגישים כ־PDF ווקטורים ו־51 כטקסט בלבד; נתוני המקור האלה לא אומתו מחדש בביקורת זו.

**תיקון:** registry דירות וגרסאות מקור, בחירה לפי מזהה, אותו מסלול לדירה מובנית ומיובאת, וסטטוס זמינות ברור לכל דירה. **סיום:** מודל שני נכנס ללא תנאים ייחודיים בקוד המסכים; אין הצגת גאומטריה משוערת כמאומתת.

ראיות: [src/site/pages/ApartmentsPage.tsx:125](C:/Users/yosi/Downloads/DFDF/src/site/pages/ApartmentsPage.tsx:125), [src/site/pages/MyApartmentPage.tsx:1](C:/Users/yosi/Downloads/DFDF/src/site/pages/MyApartmentPage.tsx:1), [src/site/pages/SummaryPage.tsx:13](C:/Users/yosi/Downloads/DFDF/src/site/pages/SummaryPage.tsx:13), [docs/evidence/tiferet-apartment-audit.md:1](C:/Users/yosi/Downloads/DFDF/docs/evidence/tiferet-apartment-audit.md:1).

### A30 — שמירות, גרסאות ושיתוף אינם מסמך נייד אחד · P2 · ממצא קוד

המצב הפעיל וספריית הגרסאות נשמרים בשתי כתיבות נפרדות. כישלון חלקי יכול להשאירם שונים. דירה מיובאת נשמרת בנפרד מהתכנון; קישור אליה לא מספיק במכשיר אחר. ייצוא ״גרסה פעילה״ קורא גרסה שמורה, שאינה בהכרח הטיוטה שעל המסך.

**תיקון:** snapshot עקבי עם version, מקור הדירה, חומרים, ריהוט ומטא־נתונים; כתיבה אטומית ב־IndexedDB ומנגנון התאוששות. **סיום:** ייצוא → דפדפן נקי → ייבוא משחזר את אותו תכנון, כולל דירה מיובאת וחומרים פרטיים.

ראיות: [src/apartment/PlannerApp.tsx:615](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:615), [src/apartment/PlannerApp.tsx:692](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:692), [src/apartment/persistence/imported-apartments.ts:1](C:/Users/yosi/Downloads/DFDF/src/apartment/persistence/imported-apartments.ts:1).

### A31 — האתר הראשי אינו נרשם לעבודה לא מקוונת · P2 · שוחזר בבנייה

בפרופיל חדש, ביקור באתר הבנוי לא יצר service worker; ניתוק רשת ורענון נכשלו. הרישום נמצא ב־SwUpdateBanner של סביבת הנגרייה. מעבר קודם לנגרייה יכול להסתיר את הבעיה בבדיקות.

**תיקון:** רישום ועדכונים בשורש האפליקציה, קאש לפי המסלול הנדרש ומצב ״מוכן לעבודה לא מקוונת״ שמבוסס על הצלחה אמיתית. **סיום:** ביקור רק באתר/מתכנן, סגירה, ניתוק ורענון פועלים; המקורות החסרים מזוהים בלי לטעון שהכול זמין.

ראיות: [src/hooks/useSwUpdate.ts:31](C:/Users/yosi/Downloads/DFDF/src/hooks/useSwUpdate.ts:31), [src/components/layout/SwUpdateBanner.tsx:19](C:/Users/yosi/Downloads/DFDF/src/components/layout/SwUpdateBanner.tsx:19), [src/main.tsx:1](C:/Users/yosi/Downloads/DFDF/src/main.tsx:1), [probes-2.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes-2.json).

### A32 — תקציבי גודל החבילה כבר נכשלים · P2 · נמדד

JS, CSS והגודל הכולל לפי הגדרת התקציב חורגים מהספים. chunk ה־PDF הוא כ־1.34 MB לא דחוס וכ־475 KB gzip; ה־precache כולל כ־4.07 MiB. אלה גדלי פלט בנייה, ולא מדידת זמן טעינה או טענה שכל הקבצים נדרשים בכניסה הראשונה.

**תיקון:** לנתח imports וטעינה לפי מסך, להסיר כפילויות, למדוד CSS של שני הממשקים ולצמצם precache לגרעין הנדרש. **סיום:** תקציבים עוברים ללא העלאה שרירותית; דוח רשת לכניסה ראשונה ולמעבר למתכנן.

ראיות: [config/bundle-budget.json:1](C:/Users/yosi/Downloads/DFDF/config/bundle-budget.json:1), [vite.config.ts:66](C:/Users/yosi/Downloads/DFDF/vite.config.ts:66), [build.log](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/build.log), [bundle.log](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/bundle.log).

### A33 — פרסום יכול להתחיל בלי להמתין לאיכות · P1 · ממצא תצורה

workflow הפרסום ל־Pages מתחיל על push ל־main ומריץ build. הוא אינו תלוי ב־workflow הבדיקות ואינו משתמש בארטיפקט שכבר עבר אותו. לכן ההגדרה אינה מבטיחה שהגרסה המפורסמת עברה unit, E2E או bundle.

**תיקון:** פרסום של אותו artifact ואותו commit רק לאחר הצלחת שערי החובה; שמירת גרסה קודמת ונתיב rollback. **סיום:** כשל מכוון בתקציב או בבדיקה מונע פרסום, ולא רק מסמן workflow אחר באדום. לא נבדקו הגנות branch או אישורי environment בשרת.

ראיות: [.github/workflows/pages.yml:24](C:/Users/yosi/Downloads/DFDF/.github/workflows/pages.yml:24), [.github/workflows/ci.yml:18](C:/Users/yosi/Downloads/DFDF/.github/workflows/ci.yml:18).

### A34 — שערי הבדיקות אינם כוללים את כל המוצר · P2 · ממצא תצורה

תקציב הקומפוננטות סורק רק `src/components`, ואינו כולל `src/apartment` או `src/site`. מדידת coverage אינה כוללת אותם. `PlannerApp` הגיע ל־1,522 שורות, ו־site.css ל־2,121. מבחני צילום ב־CI רצים עם השוואת snapshot מושבתת.

**תיקון:** בעלות ותקציבים לכל שלושת המשטחים, כיסוי לפי מסלולי סיכון, ובסיס תמונות מאושר ל־RTL/מובייל/3D. **סיום:** שינוי שובר במתכנן או במצב דיאלוג נכשל בשער הרלוונטי; ירוק משקף תוצאה שימושית ולא רק מספר בדיקות גדול.

ראיות: [scripts/check-component-budgets.js:7](C:/Users/yosi/Downloads/DFDF/scripts/check-component-budgets.js:7), [vitest.config.ts:47](C:/Users/yosi/Downloads/DFDF/vitest.config.ts:47), [.github/workflows/ci.yml:85](C:/Users/yosi/Downloads/DFDF/.github/workflows/ci.yml:85).

### A35 — התמיכה בשש שפות אינה שלמה · P2 · נמדד וממצא קוד

EN/HE מכילים 2,168 מפתחות ותואמים. בערבית חסרים 270 ממפתחות האנגלית; בגרמנית, ספרדית וצרפתית חסרים 251 בכל שפה. מדד ה־100% ב־quality משווה רק EN/HE. שמות החומרים במנוע הם דו־לשוניים, ובכמה רכיבים השפה מומרת ל־`Lang` בעזרת cast; זה אינו fallback אמיתי. אתר תפארת עצמו כתוב בעברית ישירות.

**תיקון:** להגדיר במפורש אילו שפות נתמכות בכל משטח, fallback מתועד לשמות דומיין ומדידה לכל השפות המוצעות. **סיום:** אין תוויות ריקות או מפתחות גולמיים; לא מוצגת הבטחה לשפה שהמסלול המרכזי בה חלקי.

ראיות: [src/i18n/index.ts:6](C:/Users/yosi/Downloads/DFDF/src/i18n/index.ts:6), [src/engine/types.ts:45](C:/Users/yosi/Downloads/DFDF/src/engine/types.ts:45), [src/components/configurator/MaterialSelector.tsx:29](C:/Users/yosi/Downloads/DFDF/src/components/configurator/MaterialSelector.tsx:29), [inventory.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/inventory.json). היעלמות תוויות לא שוחזרה בדפדפן בבדיקה זו.

### A36 — מסלול שגיאה באתר יכול להפיל את המסך כולו · P2 · שוחזר ברמת הפונקציה

כתובת עם קידוד אחוזים פגום זרקה `URIError`. קיימים Error Boundaries לפאנלים בנגרייה, אך לא מעטפת מקבילה לאתר ולמתכנן. מספר קריאות localStorage נמצאות מחוץ ל־try/catch.

**תיקון:** parsing בטוח, 404 ברור, boundary לכל מסלול ופעולות התאוששות השומרות טיוטה. **סיום:** כתובת פגומה, כישלון טעינת chunk וחסימת אחסון אינם משאירים מסך ריק.

ראיות: [src/site/router.ts:38](C:/Users/yosi/Downloads/DFDF/src/site/router.ts:38), [src/site/TiferetSite.tsx:1](C:/Users/yosi/Downloads/DFDF/src/site/TiferetSite.tsx:1), [src/apartment/persistence/imported-apartments.ts:36](C:/Users/yosi/Downloads/DFDF/src/apartment/persistence/imported-apartments.ts:36), [probes.json](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/probes.json).

### A37 — PDF רץ על התהליך הראשי; ייצוא תלת־ממד אינו תמיד סצנה מורכבת · P2 · ממצא קוד

בניגוד לתיאור בתיעוד, `pdf(doc).toBlob()` מופעל ברכיב עצמו. יצואי STEP/glTF הפעילים מייצגים חלקים מסודרים בערימה ולא את הארון המורכב בחדר; STEP מעגל מידות חלקים למ״מ שלמים. זה עשוי להיות תוצר מועיל, אבל שמו ודיוקו צריכים להיות מפורשים.

**תיקון:** יצירת PDF הניתנת לביטול עם תצלום מצב קבוע; להפריד ״חלקים לייצוא״ מ״מודל מורכב״ ולהחליט על דיוק פורמטים. **סיום:** PDF כבד אינו חוסם עריכה לזמן בלתי סביר; כל ייצוא נפתח בכלי יעד חיצוני ושומר מידות לפי החוזה שהוגדר.

ראיות: [src/components/pdf/PdfExportPanel.tsx:55](C:/Users/yosi/Downloads/DFDF/src/components/pdf/PdfExportPanel.tsx:55), [src/engine/export/gltf-export.ts:1](C:/Users/yosi/Downloads/DFDF/src/engine/export/gltf-export.ts:1), [src/engine/export/step-export.ts:226](C:/Users/yosi/Downloads/DFDF/src/engine/export/step-export.ts:226).

### A38 — הערכת העלות חסרה חוזה עסקי ונתוני מקור · P2 · ממצא קוד/מוצר

מחירי פרזול חסרים נופלים לאפס; לחומרים יש שדה מטבע, אך הסיכום החשבונאי אינו מנהל המרה. אין במסלול הדייר הצעה הכוללת מדידה, ייצור, התקנה, הובלה ושינויי מפרט. חלק מהחסר מכוון, אך נדרש להגדירו כדי שלא תיווצר תחושת מחיר שלם.

**תיקון:** מחיר בעל תאריך ומקור, מצב ״חסר מחיר״, מטבע אחיד, פירוט כלולים/לא כלולים וטווח אומדן. **סיום:** רכיב ללא מחיר מסומן כחסר ולא כחינמי; אפשר להסביר את האומדן עד שורת המקור. מספרי מחיר חדשים יגיעו מהעסק, לא מהנחה בקוד.

ראיות: [src/engine/cost-estimator.ts:116](C:/Users/yosi/Downloads/DFDF/src/engine/cost-estimator.ts:116), [src/engine/types.ts:63](C:/Users/yosi/Downloads/DFDF/src/engine/types.ts:63), [src/site/pages/SummaryPage.tsx:116](C:/Users/yosi/Downloads/DFDF/src/site/pages/SummaryPage.tsx:116).

### A39 — כפילות ומודולים מבודדים מגדילים את עלות התחזוקה · P2 · נמדד וממצא מבנה

נמצאו 29 ייצואים ו־26 טיפוסים ללא שימוש מזוהה. קיימים מנגנונים חופפים ל־PDF, גאומטריה, גרסאות וייצוא glTF, לצד קובצי מנוע שעיקרם תשתית עתידית. קובץ ה־barrel הראשי במנוע מכיל 1,449 שורות. אין להסיק שכל ייצוא ש־Knip מסמן מיותר: חלקם עשויים להיות API מכוון.

**תיקון:** מפת יכולות: פעיל, ניסיוני, API חיצוני או מיועד להסרה; בעלים וקריאת שימוש לכל יכולת. פיצול PlannerApp לפי אחריות אחרי הוספת מבחני מסלול. **סיום:** הייצואים המתים מוסרים או מתועדים במכוון, בלי לשבור APIs; dependencies בין תחומים ברורים.

ראיות: [package.json:112](C:/Users/yosi/Downloads/DFDF/package.json:112), [src/engine/index.ts:1](C:/Users/yosi/Downloads/DFDF/src/engine/index.ts:1), [src/apartment/PlannerApp.tsx:166](C:/Users/yosi/Downloads/DFDF/src/apartment/PlannerApp.tsx:166), [dead.log](C:/Users/yosi/Downloads/DFDF/docs/audits/2026-09-09/evidence/dead.log).

### A40 — התיעוד ושמות המצבים אינם מקור אמין מספיק · P2 · ממצא תיעוד

AGENTS ו־ROADMAP עדיין מתארים בעיקר את הנגרייה; דוח claim audit מסמן תכונות כמאומתות על סמך קיום קבצים. למשל, טענת PDF ברקע אינה תואמת למסלול הנוכחי. מדריך הניווט שההנחיות מפנות אליו, `docs/CODEX-NAVIGATION-GUIDE.md`, אינו קיים. יש קוד שהערותיו מתארות שירותים עתידיים כאילו הם כבר שכבה פעילה.

**תיקון:** מסמך מוצר מרכזי ומפת ארכיטקטורה מעודכנת; ליד כל יכולת לציין סטטוס, מסלול שימוש ובדיקה מוכיחה. **סיום:** אפשר למצוא את נקודת הכניסה, בעלות, מקור אמת ובדיקת הקבלה של כל יכולת בלי להסיק זאת משם קובץ.

ראיות: [AGENTS.md:1](C:/Users/yosi/Downloads/DFDF/AGENTS.md:1), [ROADMAP.md:1](C:/Users/yosi/Downloads/DFDF/ROADMAP.md:1), [docs/CLAIM-AUDIT.md:29](C:/Users/yosi/Downloads/DFDF/docs/CLAIM-AUDIT.md:29), [docs/ARCHITECTURE.md:1](C:/Users/yosi/Downloads/DFDF/docs/ARCHITECTURE.md:1).

## כיוון המוצר והרעיון

### קהל ומשימה מרכזית

הקהל הראשון המוצע הוא דייר בפרויקט תפארת שרוצה להחליט איך לנצל קיר או חדר ולהגיע לשיחה עם נגר עם מפרט ברור. הקהל השני הוא איש המקצוע שמקבל את התכנון, מאמת את המידות וממיר אותו למסמך עבודה. זו הנחת עבודה הנגזרת מהאתר ומהתיאור ב־package.json; אין כאן נתוני שימוש שמוכיחים התאמת מוצר לשוק.

המסלול המוצע: בחירת דירה זמינה → בחירת חדר → סימון צורך → הצעת סידור ראשונה → התאמה → בדיקת מרווחים ואי־ודאות → שמירת חלופות → סיכום → מדידה מקצועית → מסמך מאושר. תכנון מקצועי צריך לקבל את אותו projectId, פריטים וגרסה, במקום להתחיל מחדש בנגרייה נפרדת.

### מה כדאי לחזק ברעיון

1. **אמינות ברמת מידה:** לחיצה על מידה מציגה מקור, קנה מידה, סטטוס והאם אושרה בשטח. עדיפות על הוספת מאות פריטי קישוט.
2. **ערך תוך דקות:** טעינת דירה לדוגמה זמינה ושינוי ארון ראשון. מסך בחירה עמוס בדירות שטרם מודלו אינו תחליף למסלול התחלה מוצלח.
3. **חלופות ברורות:** ״יותר אחסון״, ״יותר מרחב״ ו״תקציב נמוך יותר״, עם הסבר לפשרה ומידות שניתנות לבדיקה.
4. **רצף מול איש מקצוע:** הערות על קיר/פריט, מדידות חסרות, השוואת גרסה ותיעוד אישור. זהו הערך העסקי של הסיכום.
5. **מוצר עובד מקומית:** לשמור את העבודה בבעלות המשתמש; סנכרון וחשבון יהיו תוספת אם יימצא צורך, ולא תנאי לתכנון הראשון.

כלים קיימים כבר מציעים תכנון חדרים וספריות אובייקטים רחבות, ואחרים מתמקדים ברשימות חלקים, חיתוך, תוויות ועלויות. לכן הבידול המוצע הוא החיבור בין דירה מקומית מאומתת, עברית ותכנון נגרות שממשיך לאיש מקצוע. זו מסקנת מוצר, לא מדידת ביקוש. מקורות השוואה רשמיים: [Floorplanner](https://floorplanner.com/) ו־[OpenCutList](https://docs.opencutlist.org/).

### שאלות שעל הבעלים להכריע לפני הפיתוח העסקי

| החלטה                   | הנחת עבודה לתוכנית                              | מה ההכרעה משנה                       |
| ----------------------- | ----------------------------------------------- | ------------------------------------ |
| מי משלם ומי משתמש?      | מתחילים ככלי תכנון ושירות לדיירי תפארת          | מסלול פנייה, תמחור, חשבון והרשאות    |
| מהי הצלחה?              | מפרט שאיש מקצוע יכול להמשיך ממנו ללא הקלדה מחדש | קדימות לסיכום ולדיוק לעומת רינדור    |
| מי מאמת מידות?          | מודד/נגר מאשר לפני ייצור                        | סטטוסים, חתימת גרסה וחסימות ייצוא    |
| היקף הדירות?            | דירה אחת סגורה היטב ואז טיפוס שני               | השקעת דאטה והרחבת registry           |
| איזה שירות עסקי קיים?   | נדרש לקבל פרטי עסק וערוץ אמיתי                  | סיום טופס הקשר ותהליך לידים          |
| האם נדרש רינדור שיווקי? | קודם המחשה מדויקת; איכות צילום היא מסלול נוסף   | תקציב GPU, ספריית assets וזמני טעינה |

ההכרעות האלה אינן מונעות תיקון של הממצאים המוכחים. אין צורך להמתין להן כדי לתקן אובדן עבודה, סינון, גאומטריה או gate של פרסום.

## תוכנית עיצוב וחוויית שימוש

| מסך           | השינוי המוצע                                                                                                   | בדיקת קבלה                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| דף הבית       | כותרת קצרה על תכנון נגרות בדירה, תמונה שמדגימה את התועלת, פעולה ראשית אחת, דוגמה אינטראקטיבית לפני גלריה ארוכה | משתמש מסביר מה עושים כאן ומגיע לתכנון ראשון בלי הכוונה |
| קטלוג דירות   | חיפוש לפי בניין/דירה; הבחנה ברורה בין ״אפשר לתכנן״, ״מקור בלבד״ ו״בבדיקה״                                      | אין בחירה שמסתיימת בהפתעה או בדירה אחרת                |
| הדירה שלי     | סקירה שמראה תכנון קיים, חללים שהושלמו ומדידות חסרות                                                            | אפשר להמשיך מאותו מקום אחרי רענון                      |
| מתכנן במחשב   | משטח מרכזי גדול; רשימת חדרים/אובייקטים בצד אחד; עריכת הפריט הנבחר בצד השני; סרגל קצר למבטים                    | פחות פעולות במקביל; הבחירה נראית בכל המשטחים           |
| מתכנן במובייל | קנבס גלוי ותפריט עריכה תחתון; מצב מספרי נוח; פתיחת קטלוג ושכבות לפי צורך                                       | המקלדת אינה מסתירה את השדה או פעולת האישור             |
| סיכום         | תוכנית עם הפריטים, תמונות, מידות, חומרים, חסרים, מקור וגרסה                                                    | תואם למסמך הפעיל ומודפס בצורה קריאה                    |
| גרסאות        | תמונה ממוזערת, שם, זמן, הבדל מול הנוכחית; ייצוא/ייבוא של חבילה ניידת                                           | משתמש יודע איזו גרסה שמורה ואיזו בעריכה                |
| חומרים        | דוגמת גוון לצד עובי, סוג מצע וגמר; חיבור לבחירה במתכנן                                                         | בחירת חומר משנה את הפריט הנכון ואת מחירו/מידותיו       |
| פנייה         | סיכום הבקשה וגרסת תכנון מצורפת; אימות קבלה                                                                     | אפשר להמשיך את הטיפול בפנייה אמיתית                    |

מבחינה חזותית כדאי לשמור על החום והאיפוק של המותג, להוסיף ניגודיות ברורה בטקסט ובמצבי בחירה ולהפחית מסגרות ובקרים מתחרים. המספרים והמידות צריכים להיות עקביים, עם יחידה תמיד גלויה. ״בדיקת חפיפה״ יכולה להפוך ל״השוואה לתוכנית המקור״ כדי לא להתבלבל עם בדיקת התנגשויות בין רהיטים.

אין הצדקה להחלפת React, Zustand או Vite לצורך השיפור. בחירת ספריית רינדור היא החלטה נפרדת: תחילה לבנות מודל סצנה עצמאי, ואז לערוך ניסוי קטן מול הרינדור הקיים. Three.js היא אפשרות לבדיקה בשל ממשקי renderer וניהול משאבים מתועדים, אך עדיין יש למדוד bundle, זיכרון ותמיכה לפני הוספת תלות. [תיעוד WebGLRenderer הרשמי](https://threejs.org/docs/pages/WebGLRenderer.html).

## מודל נתונים וארכיטקטורה מוצעים

| שכבה            | אחריות                                           | גבול ברור                            |
| --------------- | ------------------------------------------------ | ------------------------------------ |
| מקור אדריכלי    | מסמך, checksum, עמוד, כיול, revision וראיות מידה | אין המצאת ערכי מקור חסרים            |
| מודל דירה       | חדרים, מסות קיר, פתחים, קבועות ומערכת צירים      | יחידות מ״מ; קשרים וגבולות מאומתים    |
| מסמך תכנון      | דירה, רהיטים, נגרות, חומרים, גרסאות וסטטוס       | מקור אמת משותף למסכים ולסיכום        |
| פקודות עריכה    | הוספה, הזזה, שינוי, מחיקה, undo/redo             | כל פקודה אטומית, נבדקת וניתנת לשחזור |
| גאומטריית ייצור | חלקים, מיקומים, חיבורים, קידוחים וקנטים          | מופרדת מהחלטות תאורה ותצוגה          |
| חישובי רקע      | אופטימיזציה, עלויות, מסמכים                      | כל תוצאה קשורה ל־revision ומצב הצלחה |
| תצוגה           | SVG, WebGL, thumbnails ובחירה                    | אינה ממציאה מידות או חלקים חדשים     |
| ייצוא           | מפרט, חבילת שיתוף, CAD ו־CNC                     | חוזה ברור לכל פורמט ורמת אימות       |

סטטוס מסמך מוצע: טיוטה → נבדק גאומטרית → חסרות מדידות / אומת בשטח → אושר למפרט → אושר לייצור. לא לערבב בין ״הקובץ נוצר״ לבין ״התכנון אושר״. אישור ברמה גבוהה צריך להיפסל כאשר משתנה נתון רלוונטי.

## תוכנית עבודה לפי שלבים

האומדנים הם **ימי עבודה נטו של מפתח מנוסה שמכיר את המאגר**, בתוספת עיצוב וביקורת מקצועית לפי הצורך. הם אומדני תכנון, לא התחייבות לתאריך. שלבים חופפים בחלקם; אין לסכום את כל הטווחים כדי לקבל מועד השקה בלי להגדיר צוות והיקף.

| שלב | תוצאה                               | משימות                                                              | אומדן                  | תלות                   | תנאי מעבר                                                      |
| --- | ----------------------------------- | ------------------------------------------------------------------- | ---------------------- | ---------------------- | -------------------------------------------------------------- |
| 0   | מסלול בדיקה ופרסום שניתן לסמוך עליו | A32–A34; לקבע fixtures לממצאים המשוחזרים; פרסום רק מ־artifact מאומת | 2–4 ימים               | אין                    | bundle עובר; כשל בדיקה מונע פרסום; ממצאי הביקורת ניתנים לשחזור |
| 1   | העבודה אינה הולכת לאיבוד            | A01–A02, A14, A28, A30, A36; מסמך משותף, טיוטה, revision            | 4–7 ימים               | שלב 0                  | עריכה→סיכום→רענון וייבוא פגום עוברים ללא איבוד מצב             |
| 2   | הצבה אמינה בחדר                     | A04–A07; validator לכל נפח וגבול; הבחנת גוף/מרחב שימוש              | 5–9 ימים               | fixtures משלב 0        | פינות, חדרים קעורים, פתחים וקבועות מכוסים בבדיקות              |
| 3   | מקור אדריכלי וייבוא עקביים          | A08–A09, A29; בחירת עמוד, parser אחד, כיול, ראיות                   | 5–10 ימים              | שלבים 1–2              | דירה נוספת ומסמך מיובא פועלים באותו מסלול בלי תנאים מיוחדים    |
| 4   | חלקים שאפשר לייצר                   | A03, A10–A11, A15–A17; context חומרים ומודל חלקים מרחבי             | 7–12 ימים              | שלבים 1–2              | חלקים/מבט/חיתוך תואמים; איש מקצוע מאשר ארונות ייחוס            |
| 5   | אתר וממשק עריכה אחידים              | A22–A28; tokens, היררכיה, מובייל, dialogs, סיכום                    | 6–10 ימים              | חוזה מסמך משלב 1       | מסלול שלם ב־375/390/768/1440, מקלדת ו־RTL                      |
| 6   | הדמיה איכותית ואמינה                | A18–A21; מעטפת מלאה, בחירה, מצלמה, חומרים ו־context loss            | 7–12 ימים              | מודל חלקים משלב 4      | נאמנות בין 2D/3D, התאוששות GPU ותקציב ביצועים מוסכם            |
| 7   | ייצוא והעברה לאיש מקצוע             | A12–A13, A25, A37–A38; מפרט עקבי, jobs נפרדים ואומדן מוסבר          | 5–9 ימים               | שלבים 1 ו־4; פרטי העסק | ייצוא נפתח בכלי יעד; פנייה מגיעה; ביקורת CNC נפרדת             |
| 8   | עמידות ותחזוקה                      | A16, A31, A34–A36, A39–A40; offline, i18n, תיעוד ומבחני כשל         | 4–7 ימים               | לאורך כל העבודה        | בדיקות התאוששות, מסלולי שפה ו־release checklist ממוקד          |
| 9   | פיילוט והרחבה מבוססת שימוש          | סשנים עם דיירים ונגרים, מדידת הצלחה, טיפוסי דירה נוספים             | שבוע–שבועיים של פיילוט | שלבים 1–5 ומפרט        | תכנון מובן ללא ליווי צמוד ופערי מדידה מתועדים                  |

### עשרת הצעדים הראשונים לביצוע

1. להפוך את שחזורי A01, A04, A05, A06, A08, A10 ו־A14 לבדיקות רגרסיה קטנות וממוקדות.
2. לחסום פרסום בלי הצלחת שערי החובה ולסגור את חריגות ה־bundle.
3. לתקן מעבר לסיכום ושמירת טיוטה; זהו התיקון הראשון למשתמש.
4. להפיק סיכום מלא מאותה גרסת מסמך.
5. לאחד בדיקות הצבה ולסגור חפיפות בפינות וחריגה מהחדר.
6. להפסיק ערבוב עמודים בייבוא ולאחד את מסלולי ה־PDF.
7. להעביר קטלוג חומרים מפורש דרך המנוע וה־Workers.
8. לתקן מדפים/מחיצות ולחבר אילוצי סיבים עד האופטימייזר.
9. לתקן סינון, נגישות דיאלוגים וכרטיסי גלריה, ולבנות תכנון מובייל ממוקד.
10. להעביר שני תרחישי ייחוס לבדיקת נגר: ארון פשוט וארון עם מחיצה ומגירות; רק אז להרחיב ייצוא לייצור.

## תוספות שכדאי לשקול אחרי תיקון הבסיס

| רעיון                            | ערך                                  | קדימות        | תנאי להתחלה                                 |
| -------------------------------- | ------------------------------------ | ------------- | ------------------------------------------- |
| עוזר מדידה עם רשימת חסרים        | מקטין אי־ודאות ומחבר בין תוכנית לשטח | גבוהה         | מודל ראיות וגרסאות                          |
| השוואת שתי חלופות זו לצד זו      | מאפשר החלטה על מקום, עלות ואחסון     | גבוהה         | סיכום מלא וגרסאות עקביות                    |
| תבניות נגרות לפי קיר וצורך       | מקצר תכנון ראשון                     | גבוהה         | מודל חלקים תקין ובדיקת fit                  |
| סימולציית פתיחת דלתות ומגירות    | מגלה בעיות שימוש לפני הזמנה          | גבוהה         | מעטפות שימוש וחיבורי פרזול                  |
| הערות ואישור איש מקצוע           | יוצר מסלול שירות אמיתי               | גבוהה         | זהות מסמך וערוץ עסקי                        |
| התאמת חומר מהקטלוג להדמיה ולמפרט | מצמצמת אי־הבנות בגוון ובמצע          | בינונית       | קטלוג מאוחד ונתוני ספק                      |
| צילום מצב/קישור תצוגה            | מאפשר שיתוף מהיר                     | בינונית       | חבילה ניידת, פרטיות וגרסה קבועה             |
| הצעות סידור מוסברות              | עוזר להגיע לחלופה ראשונה             | בינונית       | אילוצים אמינים; כל הצעה עוברת validator     |
| תכנון מטבח מערכתי                | מרחיב ערך עסקי                       | מאוחרת        | מכשירים, תשתיות, חיבורים וקטלוג מידות מאומת |
| רינדור איכות צילום               | מסייע לבחירת גמר ולשיווק             | מאוחרת        | תקציב ביצועים ומקור assets מסודר            |
| AR, סנכרון חי ו־AI שיחתי         | נוחות נוספת                          | נמוכה בשלב זה | צורך שהוכח בפיילוט; אינו פותר את פערי הליבה |

אם יתווסף AI, נכון להשתמש בו להבנת הצורך ולהצעת חלופות. מידות ביצוע, התאמה לפתחים ורשימות חיתוך צריכות להיקבע באמצעות נתונים מאומתים ומנוע דטרמיניסטי. כל הצעה צריכה להסביר אילו הנחות חסרות לה.

## בדיקות קבלה לפיילוט

| מסלול           | תוצאה נדרשת                                                                      |
| --------------- | -------------------------------------------------------------------------------- |
| שינוי ושחזור    | כל שינוי תקין נשמר או מסומן כלא שמור; אין אובדן שקט ביציאה, רענון או כשל אחסון   |
| פינות וגאומטריה | אין חפיפות גוף בלתי מותרות; מצולעים קעורים ופתחים מטופלים במפורש                 |
| מקור והדמיה     | לכל מידה ביצועית יש מקור/אישור; מידת תצוגה משוערת מזוהה ככזו                     |
| ייצור           | רשימת חלקים ומיקום חלקים מסכימים; ארונות ייחוס נבדקו בידי נגר                    |
| ייבוא/ייצוא     | סבב שמירה לדפדפן נקי משחזר זהויות, חומרים, דירה וגרסה; קלט לא תקין אינו משנה מצב |
| מובייל          | תכנון ראשון במכשיר מגע, עריכת מספרים ושמירה בלי בקרים מוסתרים                    |
| נגישות          | axe במצבים המרכזיים, מקלדת מלאה ובדיקת קורא מסך מדגמית                           |
| ביצועים         | עמידה בתקציבי build וביעדי תגובה שיימדדו על מכשיר יעד; אין ייצוא מתוצאה ישנה     |
| תפעול           | פרסום מותנה בבדיקות, rollback זמין, הודעות כשל ברורות ותיעוד גרסה                |
| שירות           | משתמש ואיש מקצוע מסכימים שהסיכום מספיק להמשך שיחה ומדידה                         |

יעדי שימוש מוצעים לפיילוט, שטרם נמדדו: לפחות 4 מתוך 5 דיירים משלימים תכנון ראשון ללא התערבות; בחירה ושינוי ראשון בתוך כ־3 דקות; כל תכנון מועבר כולל רשימת חסרים; איש מקצוע יכול להסביר אילו נתונים חסרים בלי לבנות את התכנון מחדש. אלה יעדים לבדיקה ולא נתוני הצלחה קיימים.

## מגבלות והמשך אימות מקצועי

יש לבצע בנפרד בדיקה של נוסחאות עומס, פרזול, חיבורים ועמידות עם איש מקצוע ושל יצואי CAD/CNC בכלי יעד. זיהוי טענה בקוד או מעבר בדיקת יחידה אינם הוכחה לתקן הנדסי. אבטחה דורשת גם בדיקת החבילות המותקנות, כותרות בפלטפורמת הפרסום בפועל והגדרות שאינן נמצאות במאגר. מסמכי המקור והאפשרות להשתמש בתמונות ובפרטי העסק דורשים בעלות ותיעוד מקור מסודרים.

אפשר להתחיל מיד בשלבים 0–2. התוצאה הראשונה הרצויה היא מסלול אחד שלם ואמין — דירה, חדר, רהיט, שמירה וסיכום — שיהיה בסיס להרחבת הקטלוג, ההדמיה והשירות.

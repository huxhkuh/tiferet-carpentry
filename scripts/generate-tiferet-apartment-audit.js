import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const workspace = process.cwd();
const evidencePath = resolve(workspace, 'public/tiferet/catalog/titleblock-evidence.json');
const vectorEvidencePath = resolve(workspace, 'public/tiferet/catalog/vector-evidence.json');
const reportPath = resolve(workspace, 'docs/evidence/tiferet-apartment-audit.md');
const implementedSourceId = '1RTrFsQ1eBTVzudl3wC0Ocv5DirPh6tBq';

const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const vectorEvidence = JSON.parse(readFileSync(vectorEvidencePath, 'utf8'));
const vectorEvidenceById = new Map(vectorEvidence.documents.map((document) => [document.driveFileId, document]));
if (!Array.isArray(evidence.records) || evidence.records.length !== 99) {
  throw new Error('Expected exactly 99 title-block evidence records');
}

const formatHebrewList = (items) => {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} ו${items.at(-1)}`;
};

const unresolvedLabel = (record) => {
  const titleBlockFields = String(record.unresolvedFields ?? '')
    .split(',')
    .filter(Boolean)
    .map((field) => (field === 'edition' ? 'מהדורה' : field === 'floorPrinted' ? 'מספר קומה מודפס' : field));
  const architecturalFields =
    record.driveFileId === implementedSourceId
      ? ['פתחים', 'גבהים', 'סגירת שרשרת']
      : vectorEvidenceById.has(record.driveFileId)
        ? ['כיול למ״מ', 'פתחים', 'גבהים', 'סגירה מתמטית וחזותית']
        : ['גישה ל-PDF מלא', 'גאומטריה', 'פתחים', 'גבהים'];
  return formatHebrewList([...titleBlockFields, ...architecturalFields]);
};

const records = [...evidence.records].sort((left, right) => {
  const buildingOrder = left.buildingId.localeCompare(right.buildingId, 'en');
  if (buildingOrder !== 0) return buildingOrder;
  if (left.floorFromSourceFolder !== right.floorFromSourceFolder) {
    return left.floorFromSourceFolder - right.floorFromSourceFolder;
  }
  return Number(left.sheet.split('-')[1]) - Number(right.sheet.split('-')[1]);
});

const rows = records.map((record) => {
  const isWorkingModel = record.driveFileId === implementedSourceId;
  const vectorDocument = vectorEvidenceById.get(record.driveFileId);
  const hasVectorEvidence = vectorDocument !== undefined;
  const sourceName = basename(record.sourcePath);
  const driveLink = `[${sourceName}](https://drive.google.com/file/d/${record.driveFileId}/view)`;
  const sourceLink = hasVectorEvidence
    ? `${driveLink} · [עותק מלא](../../public/tiferet/source-pdfs/${record.driveFileId}.pdf)`
    : driveLink;
  const page = hasVectorEvidence ? vectorDocument.pages.map((item) => item.page).join(', ') : 'לא אומת';
  const evidenceStatus = hasVectorEvidence ? 'PDF+וקטורים' : 'טקסט בלבד';
  const modelStatus = isWorkingModel ? 'מודל עבודה חלקי' : 'טרם שוחזר';
  const dimensionStatus = isWorkingModel
    ? 'ממדי חדרים מרכזיים עוגנו; סגירת שרשרת בהמתנה'
    : hasVectorEvidence
      ? 'מסות קיר וקטוריות חולצו; סגירה סמנטית בהמתנה'
      : 'תוויות טקסט חולצו; ללא קואורדינטות';
  return `| ${record.buildingType} | ${record.floorFromSourceFolder} | ${record.sheet} | ${page} | ${record.apartmentNumber} | ${record.roomCount} | ${record.areaSqm} | ${sourceLink} | ${evidenceStatus} | ${modelStatus} | ${dimensionStatus} | לא אומת | ${unresolvedLabel(record)} |`;
});

const report = `# ביקורת תוכניות הדירה — תפארת

הדוח מכסה את כל 99 קובצי תוכניות הדירה שנמצאו בתיקיות תכלת וארגמן. זהות הדירה, מספר החדרים והשטח נשלפו מלוח הכותרת של כל גיליון. קובצי הקטלוג הקומתי וקובצי הקרקע מתועדים בנפרד ב-\`public/tiferet/catalog/source-inventory.json\` ואינם נספרים כאן כתוכנית דירה טיפוסית.

## מצב אימות

- 48 קובצי PDF עברו התאמת גודל ו-hash, נשמרו כעותק מלא וחולצו מהם קואורדינטות וקטוריות וטקסט ממוקם. כולם בני עמוד אחד.
- 51 קובצי דירה נוספים זמינים דרך המחבר כטקסט בלבד; תגובת הקובץ הגולמי נחתכה ונתיב ההורדה הישיר נחסם על-ידי נטפרי. הם אינם משמשים מקור לגאומטריה.
- ב-5-1 עוגנו ממדי חדרים מרכזיים ומסות קיר, אך טרם הושלמו סגירת כל שרשראות המידה, ביקורת הפתחים, הגבהים וההשוואה החזותית המאשרת.
- ב-47 התוכניות הווקטוריות האחרות קיימות ראיות מקור מפורטות, אך טרם הושלמו כיול שרשראות המידה למ״מ, שיוך פתחים, גבהים ואימות overlay; לכן הן אינן מוצגות כמודל נקי.
- לא נמצאה זהות מלאה בין fingerprints של מסות הקיר ואף לא התאמת מראה מלאה. לכן לא אוחדו טיפוסים על סמך דמיון חזותי.
- עמוד PDF מסומן רק כשקיים קובץ גולמי מאומת; מספר הגיליון הרשמי מופיע לכל שורה.

## ביקורת דירה-אחר-דירה

| בניין/טיפוס | קומה | גיליון | עמוד | מספר דירה בלוח | חדרים | שטח מ״ר | PDF מקור | ראיות מקור | סטטוס מודל | מידות חשובות | גובה תקרה | אי-בהירויות פתוחות |
| --- | ---: | --- | --- | --- | ---: | ---: | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## כללי אישור

תוכנית תעבור מ״טרם שוחזר״ או מ״מודל עבודה חלקי״ ל״מאומת״ רק לאחר שכל אלה מתקיימים: גישה ל-PDF הגולמי; בניית קואורדינטות במ״מ מתוך שרשראות מידות; שיוך פתחים וקירות; סגירה מתמטית ללא פערים; אימות גבהים ממקור מפורש; והשוואת overlay חזותית מול גיליון המקור.
`;

writeFileSync(reportPath, report, 'utf8');
console.log(`Generated ${reportPath} with ${records.length} apartment rows.`);

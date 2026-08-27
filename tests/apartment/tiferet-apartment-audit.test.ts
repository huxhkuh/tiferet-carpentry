import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const auditPath = resolve(process.cwd(), 'docs/evidence/tiferet-apartment-audit.md');

describe('Tiferet apartment-by-apartment audit', () => {
  it('contains one auditable row for each of the 99 source apartment plans', () => {
    const report = readFileSync(auditPath, 'utf8');
    const dataRows = report.split('\n').filter((line) => /^\| (?:ארגמן|תכלת)/u.test(line));

    expect(dataRows).toHaveLength(99);
    expect(dataRows.filter((line) => line.includes('מודל עבודה חלקי'))).toHaveLength(1);
    expect(dataRows.filter((line) => line.includes('טרם שוחזר'))).toHaveLength(98);
    expect(dataRows.filter((line) => line.includes('PDF+וקטורים'))).toHaveLength(48);
    expect(dataRows.filter((line) => line.includes('טקסט בלבד'))).toHaveLength(51);
  });

  it('records the real title-block identity and unresolved verification state for Techelet sheet 5-1', () => {
    const report = readFileSync(auditPath, 'utf8');

    expect(report).toContain('| תכלת א | 5 | 5-1 | 1 | 23-א | 4 | 97.4 |');
    expect(report).toContain('פתחים, גבהים וסגירת שרשרת');
    expect(report).not.toContain('אימות מלא עבר');
  });
});

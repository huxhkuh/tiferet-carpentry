import type { NavigateSite } from '../types';
import { BrandMark } from './BrandMark';
import { DiamondMark } from './DiamondMark';
import { SiteLink } from './SiteLink';

export function SiteFooter({ navigate }: { navigate: NavigateSite }) {
  return (
    <footer className="ng-site-footer">
      <div className="ng-footer-grid">
        <div className="ng-footer-brand">
          <BrandMark decorative />
          <p>נגרות מדויקת לבתי פרויקט תפארת ברמלה.</p>
        </div>
        <div>
          <p className="ng-footer-title">תכנון</p>
          <SiteLink route={{ id: 'apartments' }} navigate={navigate}>
            בחירת דירה
          </SiteLink>
          <SiteLink route={{ id: 'my-apartment' }} navigate={navigate}>
            הדירה שלי
          </SiteLink>
          <SiteLink route={{ id: 'summary' }} navigate={navigate}>
            סיכום התכנון
          </SiteLink>
        </div>
        <div>
          <p className="ng-footer-title">השראה וידע</p>
          <SiteLink route={{ id: 'inspiration' }} navigate={navigate}>
            פרויקטים
          </SiteLink>
          <SiteLink route={{ id: 'materials' }} navigate={navigate}>
            חומרים וגימורים
          </SiteLink>
          <SiteLink route={{ id: 'process' }} navigate={navigate}>
            תהליך העבודה
          </SiteLink>
        </div>
        <div>
          <p className="ng-footer-title">נשארים בקשר</p>
          <SiteLink route={{ id: 'about' }} navigate={navigate}>
            אודות
          </SiteLink>
          <SiteLink route={{ id: 'contact' }} navigate={navigate}>
            צור קשר
          </SiteLink>
          <p className="ng-footer-note">פרטי התקשרות עסקיים יתווספו לאחר אישורם.</p>
        </div>
      </div>
      <div className="ng-footer-legal">
        <DiamondMark light />
        <p>ההדמיות והמידות מיועדות לתכנון ראשוני בלבד. לפני ייצור נדרשת מדידה מקצועית בדירה בפועל.</p>
        <span>© {new Date().getFullYear()} נגרות תפארת</span>
      </div>
    </footer>
  );
}

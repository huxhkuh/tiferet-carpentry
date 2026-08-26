import type { NavigateSite } from '../types';
import { SiteLink } from '../components/SiteLink';

export function NotFoundPage({ navigate }: { navigate: NavigateSite }) {
  return (
    <section className="ng-not-found">
      <p>404</p>
      <h1>העמוד לא נמצא</h1>
      <SiteLink route={{ id: 'home' }} navigate={navigate} className="ng-button">
        חזרה לדף הבית
      </SiteLink>
    </section>
  );
}

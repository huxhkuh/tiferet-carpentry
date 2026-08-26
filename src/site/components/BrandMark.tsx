export function BrandMark({ compact = false, decorative = false }: { compact?: boolean; decorative?: boolean }) {
  return (
    <span
      className={`ng-brand-mark ${compact ? 'ng-brand-mark--compact' : ''}`}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'נגרות — תפארת'}
      aria-hidden={decorative || undefined}
    >
      <span>נג</span>
      <span>ר</span>
      <span>ות</span>
    </span>
  );
}

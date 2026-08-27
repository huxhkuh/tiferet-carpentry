interface EditorialImageProps {
  alt: string;
  className?: string;
  eager?: boolean;
  src: string;
  testId?: string;
}

export function EditorialImage({ alt, className = '', eager = false, src, testId }: EditorialImageProps) {
  return (
    <figure className={`ng-editorial-image ${className}`.trim()}>
      <img
        src={`${import.meta.env.BASE_URL}tiferet/brand/${src}`}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
        data-testid={testId}
      />
      <span className="ng-editorial-image__wash" aria-hidden="true" />
      <span className="ng-editorial-image__corner" aria-hidden="true" />
    </figure>
  );
}

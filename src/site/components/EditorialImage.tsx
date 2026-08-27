interface EditorialImageProps {
  alt: string;
  className?: string;
  eager?: boolean;
  src: string;
  testId?: string;
}

const IMAGE_DIMENSIONS: Readonly<Record<string, Readonly<{ height: number; width: number }>>> = {
  'hero-bedroom-cabinetry.jpg': { width: 1800, height: 1201 },
  'space-bedroom.jpg': { width: 1800, height: 1201 },
  'space-children.jpg': { width: 1800, height: 2696 },
  'space-kitchen.jpg': { width: 1800, height: 1200 },
  'space-media.jpg': { width: 1800, height: 1201 },
  'space-niches.jpg': { width: 1800, height: 1201 },
  'space-wardrobe.jpg': { width: 1800, height: 1350 },
};

function imagePath(src: string): string {
  return `${import.meta.env.BASE_URL}tiferet/brand/${src}`;
}

function resizedImagePath(src: string, width: number): string {
  return imagePath(src.replace(/\.jpg$/u, `-${width}.jpg`));
}

function resizedWebpPath(src: string, width: number): string {
  return imagePath(src.replace(/\.jpg$/u, `-${width}.webp`));
}

export function EditorialImage({ alt, className = '', eager = false, src, testId }: EditorialImageProps) {
  const dimensions = IMAGE_DIMENSIONS[src] ?? { width: 1800, height: 1200 };
  const responsiveSources =
    src === 'hero-bedroom-cabinetry.jpg'
      ? `${resizedImagePath(src, 720)} 720w, ${resizedImagePath(src, 1200)} 1200w, ${imagePath(src)} 1800w`
      : undefined;
  const responsiveWebpSources =
    src === 'hero-bedroom-cabinetry.jpg'
      ? `${resizedWebpPath(src, 720)} 720w, ${resizedWebpPath(src, 1200)} 1200w`
      : undefined;

  return (
    <figure className={`ng-editorial-image ${className}`.trim()}>
      <picture>
        {responsiveWebpSources ? (
          <source
            type="image/webp"
            srcSet={responsiveWebpSources}
            sizes="(max-width: 60rem) 100vw, 58vw"
            data-testid={testId ? `${testId}-webp-source` : undefined}
          />
        ) : null}
        <img
          src={imagePath(src)}
          srcSet={responsiveSources}
          sizes={responsiveSources ? '(max-width: 60rem) 100vw, 58vw' : undefined}
          alt={alt}
          width={dimensions.width}
          height={dimensions.height}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
          data-testid={testId}
        />
      </picture>
      <span className="ng-editorial-image__wash" aria-hidden="true" />
      <span className="ng-editorial-image__corner" aria-hidden="true" />
    </figure>
  );
}

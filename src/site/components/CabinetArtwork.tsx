type ArtworkVariant = 'kitchen' | 'wardrobe' | 'closet' | 'children' | 'media' | 'niche';

const VARIANT_LABELS: Record<ArtworkVariant, string> = {
  kitchen: 'המחשת נגרות למטבח',
  wardrobe: 'המחשת חדר ארונות',
  closet: 'המחשת ארון חדר שינה',
  children: 'המחשת נגרות לחדר ילדים',
  media: 'המחשת יחידת מדיה',
  niche: 'המחשת נישה ואחסון',
};

export function HeroCabinetScene() {
  return (
    <svg className="ng-hero-art" viewBox="0 0 960 660" role="img" aria-label="המחשת נגרות אגוז מותאמת אישית">
      <defs>
        <linearGradient id="hero-wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#efe9df" />
          <stop offset="1" stopColor="#bcb0a2" />
        </linearGradient>
        <linearGradient id="hero-walnut" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3d2b21" />
          <stop offset="0.48" stopColor="#75533d" />
          <stop offset="1" stopColor="#4c3428" />
        </linearGradient>
        <linearGradient id="hero-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#aa9d8d" />
          <stop offset="1" stopColor="#d7cec2" />
        </linearGradient>
        <filter id="hero-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#17130f" floodOpacity="0.28" />
        </filter>
      </defs>
      <rect width="960" height="660" fill="url(#hero-wall)" />
      <path d="M0 515 L960 472 L960 660 L0 660 Z" fill="url(#hero-floor)" />
      <g opacity="0.28" stroke="#6e6256" strokeWidth="2">
        <path d="M80 520 L80 660" />
        <path d="M210 512 L210 660" />
        <path d="M345 505 L345 660" />
        <path d="M490 498 L490 660" />
        <path d="M650 490 L650 660" />
        <path d="M820 480 L820 660" />
      </g>
      <g filter="url(#hero-shadow)">
        <rect x="170" y="62" width="590" height="470" fill="url(#hero-walnut)" />
        <g stroke="#2a201a" strokeWidth="4" fill="none">
          <path d="M170 245 H760" />
          <path d="M318 62 V532" />
          <path d="M470 62 V532" />
          <path d="M620 62 V532" />
        </g>
        <g stroke="#1d1814" strokeWidth="8" strokeLinecap="round">
          <path d="M296 282 V390" />
          <path d="M448 282 V390" />
          <path d="M598 282 V390" />
        </g>
      </g>
      <g filter="url(#hero-shadow)">
        <rect x="760" y="62" width="160" height="470" fill="#251e19" />
        <rect x="780" y="92" width="120" height="112" fill="#5e4434" />
        <rect x="780" y="224" width="120" height="112" fill="#5e4434" />
        <rect x="780" y="356" width="120" height="146" fill="#5e4434" />
        <g fill="#d5a66f">
          <rect x="780" y="92" width="120" height="6" />
          <rect x="780" y="224" width="120" height="6" />
          <rect x="780" y="356" width="120" height="6" />
        </g>
        <g fill="#d7c7b3">
          <circle cx="840" cy="160" r="24" />
          <rect x="823" y="268" width="34" height="48" rx="8" />
          <path d="M811 470 Q840 408 869 470 Z" />
        </g>
      </g>
      <g>
        <rect x="24" y="70" width="114" height="380" fill="#f5f1eb" />
        <rect x="42" y="88" width="78" height="344" fill="#bec3c2" />
        <path d="M81 88 V432 M42 260 H120" stroke="#52585a" strokeWidth="5" />
        <path d="M42 88 L170 62 V532 L42 432 Z" fill="#ffffff" opacity="0.12" />
      </g>
      <g transform="translate(56 478)">
        <path d="M0 32 H155 L134 78 H24 Z" fill="#27231f" />
        <path d="M26 78 L14 164 M129 78 L142 164" stroke="#27231f" strokeWidth="10" />
        <path d="M36 110 H120" stroke="#27231f" strokeWidth="7" />
      </g>
    </svg>
  );
}

export function CabinetArtwork({ variant }: { variant: ArtworkVariant }) {
  const isKitchen = variant === 'kitchen';
  const isMedia = variant === 'media';
  const isChildren = variant === 'children';
  const isNiche = variant === 'niche';

  return (
    <svg
      className={`ng-cabinet-art ng-cabinet-art--${variant}`}
      viewBox="0 0 640 430"
      role="img"
      aria-label={VARIANT_LABELS[variant]}
    >
      <rect width="640" height="430" fill="#ded7cd" />
      <path d="M0 350 H640 V430 H0 Z" fill="#c7bdb0" />
      <g stroke="#302721" strokeWidth="4">
        {isKitchen ? (
          <>
            <rect x="70" y="84" width="500" height="245" fill="#6b4e3d" />
            <path d="M70 215 H570 M190 84 V329 M335 84 V329 M468 84 V329" />
            <rect x="85" y="235" width="470" height="80" fill="#f0ece5" />
            <path d="M85 235 H555" stroke="#292929" strokeWidth="12" />
            <rect x="270" y="245" width="95" height="54" fill="#817b73" />
          </>
        ) : isMedia ? (
          <>
            <rect x="60" y="90" width="125" height="245" fill="#6b4e3d" />
            <rect x="210" y="230" width="365" height="105" fill="#6b4e3d" />
            <rect x="260" y="105" width="270" height="145" fill="#272725" />
            <path d="M320 230 V335 M440 230 V335" />
          </>
        ) : isChildren ? (
          <>
            <rect x="64" y="80" width="170" height="260" fill="#795a43" />
            <rect x="250" y="190" width="310" height="150" fill="#ede7df" />
            <rect x="275" y="95" width="260" height="80" fill="#795a43" />
            <path d="M149 80 V340 M250 275 H560 M360 190 V340" />
          </>
        ) : isNiche ? (
          <>
            <rect x="70" y="70" width="500" height="285" fill="#594033" />
            <rect x="105" y="105" width="195" height="215" fill="#2c2622" />
            <rect x="335" y="105" width="200" height="90" fill="#2c2622" />
            <rect x="335" y="230" width="200" height="90" fill="#2c2622" />
            <path d="M125 120 H280 M355 120 H515 M355 245 H515" stroke="#c99966" />
          </>
        ) : (
          <>
            <rect x="76" y="58" width="488" height="302" fill="#6b4e3d" />
            <path d="M198 58 V360 M320 58 V360 M442 58 V360 M76 254 H564" />
            {variant === 'wardrobe' ? (
              <path d="M95 90 H179 M217 90 H301 M339 90 H423 M461 90 H545" stroke="#d4a56d" />
            ) : null}
            {variant === 'closet' ? (
              <g stroke="#1e1e1c" strokeWidth="8" strokeLinecap="round">
                <path d="M184 140 V230 M306 140 V230 M428 140 V230" />
              </g>
            ) : null}
          </>
        )}
      </g>
      <path d="M40 375 H600" stroke="#9b8d7d" strokeWidth="2" />
    </svg>
  );
}

export function WardrobeElevation() {
  return (
    <svg
      className="ng-elevation"
      viewBox="0 0 760 520"
      role="img"
      aria-label="שרטוט חזית ארון במידות 340 על 260 סנטימטרים"
    >
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M110 84 H650 V448 H110 Z" />
        <path d="M245 84 V448 M380 84 V448 M515 84 V448" />
        <path d="M110 320 H650" />
        <path d="M65 84 V448 M54 84 H76 M54 448 H76" />
        <path d="M110 45 H650 M110 34 V56 M650 34 V56" />
        <path d="M176 150 V248 M311 150 V248 M446 150 V248 M581 150 V248" strokeWidth="5" />
      </g>
      <g fill="currentColor" fontSize="24" fontFamily="Noto Sans Hebrew, sans-serif">
        <text x="350" y="30" textAnchor="middle">
          340 ס״מ
        </text>
        <text x="36" y="275" textAnchor="middle" transform="rotate(-90 36 275)">
          260 ס״מ
        </text>
        <text x="177" y="490" textAnchor="middle">
          80
        </text>
        <text x="312" y="490" textAnchor="middle">
          80
        </text>
        <text x="447" y="490" textAnchor="middle">
          80
        </text>
        <text x="582" y="490" textAnchor="middle">
          80
        </text>
      </g>
    </svg>
  );
}

export function BrandServiceIcon({ kind }: { kind: 'consultation' | 'craft' | 'planning' | 'materials' }) {
  const commonProps = {
    'aria-hidden': true,
    'data-testid': 'brand-service-icon',
    className: 'ng-service-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.5,
    viewBox: '0 0 24 24',
  };

  if (kind === 'consultation') {
    return (
      <svg {...commonProps}>
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2Z" />
        <path d="M8 21.168V14l4-7 4 7v7.168M8 14s1.127 1 2 1 2-1 2-1 1.127 1 2 1 2-1 2-1" />
      </svg>
    );
  }

  if (kind === 'craft') {
    return (
      <svg {...commonProps}>
        <path d="m10.05 10.607-7.07 7.07a2 2 0 1 0 2.828 2.829l7.071-7.071M17.193 13.799l3.878 3.879a2 2 0 1 1-2.828 2.828l-6.209-6.208" />
        <path d="m6.733 5.904-2.122.707L2.49 3.075 3.904 1.66 7.44 3.782l-.707 2.122 2.83 2.83" />
        <path d="M10.05 10.607c-.844-2.153-.679-4.978 1.061-6.718 1.739-1.74 4.95-2.121 6.717-1.06l-3.04 3.04-.283 3.111 3.111-.282 3.041-3.041c1.061 1.768.679 4.978-1.061 6.717-1.74 1.74-4.564 1.905-6.717 1.061" />
      </svg>
    );
  }

  if (kind === 'planning') {
    return (
      <svg {...commonProps}>
        <path d="M2 21.4V2.6a.6.6 0 0 1 .6-.6h18.8a.6.6 0 0 1 .6.6v6.8a.6.6 0 0 1-.6.6H10.6a.6.6 0 0 0-.6.6v10.8a.6.6 0 0 1-.6.6H2.6a.6.6 0 0 1-.6-.6Z" />
        <path d="M16 10V7M10 10V7M10 16H7M10 10H7" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M12 22v-8m0-4v4m0 0 4-2M17 7a5 5 0 0 0-10 0" />
      <path d="M12 18H7.5a5.5 5.5 0 1 1 0-11H9M12 18h4.5A5.5 5.5 0 0 0 17 7.022" />
    </svg>
  );
}

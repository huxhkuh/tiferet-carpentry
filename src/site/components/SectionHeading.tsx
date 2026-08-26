import type { ReactNode } from 'react';
import { DiamondMark } from './DiamondMark';

export function SectionHeading({
  eyebrow,
  title,
  children,
  light = false,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  light?: boolean;
}) {
  return (
    <div className={`ng-section-heading ${light ? 'is-light' : ''}`}>
      <p className="ng-eyebrow">
        <DiamondMark light={light} />
        {eyebrow}
      </p>
      <h2>{title}</h2>
      {children ? <div className="ng-section-intro">{children}</div> : null}
    </div>
  );
}

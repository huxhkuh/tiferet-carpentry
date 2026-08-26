export function DiamondMark({ light = false }: { light?: boolean }) {
  return <span className={`ng-diamond ${light ? 'ng-diamond--light' : ''}`} aria-hidden="true" />;
}

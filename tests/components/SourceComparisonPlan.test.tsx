import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SourceComparisonPlan } from '../../src/apartment/components/SourceComparisonPlan';
import { TIFERET_5_1 } from '../../src/apartment/data/tiferet';

describe('SourceComparisonPlan', () => {
  it('aligns the canonical source crop with every traced structural wall mass', () => {
    render(<SourceComparisonPlan apartment={TIFERET_5_1} />);

    expect(screen.getByRole('img', { name: 'השוואת תוכנית 5-1 למודל הנקי' })).toBeVisible();
    expect(screen.getAllByTestId(/^source-overlay-wall-mass-/)).toHaveLength(48);
    expect(screen.getByText('48 מסות קיר מהמקור')).toBeVisible();
  });

  it('lets the user inspect source and model with a live opacity control', () => {
    render(<SourceComparisonPlan apartment={TIFERET_5_1} />);

    const opacity = screen.getByLabelText('שקיפות שכבת המודל');
    expect(opacity).toHaveValue('55');
    expect(screen.getByTestId('source-model-overlay')).toHaveAttribute('opacity', '0.55');

    fireEvent.change(opacity, { target: { value: '25' } });

    expect(screen.getByTestId('source-model-overlay')).toHaveAttribute('opacity', '0.25');
  });

  it('overlays every modeled opening and fixed sanitary fixture for visual auditing', () => {
    render(<SourceComparisonPlan apartment={TIFERET_5_1} />);

    const openingCount = TIFERET_5_1.walls.reduce((total, wall) => total + wall.openings.length, 0);
    expect(screen.getAllByTestId(/^source-overlay-opening-/)).toHaveLength(openingCount);
    expect(screen.getAllByTestId(/^source-overlay-fixture-/)).toHaveLength(8);
    expect(screen.getByText(`${openingCount} פתחים ממופים`)).toBeVisible();
    expect(screen.getByText('8 קבועות סניטריות')).toBeVisible();
  });
});

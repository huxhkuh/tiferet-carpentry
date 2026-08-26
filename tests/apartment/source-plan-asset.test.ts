import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const asset = (name: string) => readFileSync(resolve('public', 'tiferet', name));
const sha256 = (contents: Buffer) => createHash('sha256').update(contents).digest('hex').toUpperCase();

describe('Tiferet 5-1 complete source assets', () => {
  it('keeps the original official PDF byte-for-byte', () => {
    expect(sha256(asset('sheet-5-1-original.pdf'))).toBe(
      '2165ED6217A04A5A56AC00B5B3DBF0AC477F6224884CFD1A513FCF6B478F6DBE',
    );
  });

  it('keeps the lossless 200 DPI full-sheet render at its native dimensions', () => {
    const png = asset('sheet-5-1-full.png');

    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(6_300);
    expect(png.readUInt32BE(20)).toBe(3_314);
    expect(sha256(png)).toBe('54DDEB3693D12AF164A1FF0582EB783DEB2E235DC426B385EB95F4F22AD65D68');
  });
});

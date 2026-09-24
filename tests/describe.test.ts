import { describe, expect, it } from 'vitest';
import { describeExpectancy, describePositionSize, describeStreak, describeUsualLots } from '../src/lib/calc/describe';

const summary = { endedLosing: 1, worstEnd: -3, bestEnd: 2, deepestDrawdown: 3 };

describe('kalimat ringkasan alat hitung', () => {
  it('nilai harapan memakai 2 desimal, sama dengan tampilan hasil', () => {
    expect(describeExpectancy(-0.25, 33.33, 20, 100, summary)).toContain('−0,25R');
    expect(describeExpectancy(0.2, 33.33, 20, 100, summary)).toContain('+0,2R');
  });

  it('ukuran posisi di bawah lot minimum diberi pesan khusus', () => {
    expect(describePositionSize({ riskAmount: 10_000, lots: 0, lossAtStop: 0 }, 0.01)).toContain('Posisi terkecil');
    expect(describePositionSize({ riskAmount: 500_000, lots: 0.5, lossAtStop: 500_000 }, 0.01)).toContain('0,5 lot');
  });

  it('lot biasa di atas batas risiko menyebut kelipatannya', () => {
    expect(describeUsualLots(3, 1_500_000, 3, 1)).toContain('3× batas risiko');
    expect(describeUsualLots(0.5, 500_000, 1, 1)).toContain('masih dalam batas');
  });

  it('kalah beruntun: modal habis disebut eksplisit', () => {
    expect(describeStreak(10, 90.4, 0)).toContain('modal habis');
  });
});

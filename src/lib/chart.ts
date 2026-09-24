// Koordinat SVG untuk grafik garis simulasi (fungsi murni; dipakai server dan browser).

export interface LineChart {
  width: number;
  height: number;
  /** Atribut `points` per rangkaian. */
  lines: string[];
  /** Garis nilai harapan (EV × jumlah transaksi). */
  expected: string;
  /** Posisi y untuk nilai 0 (impas). */
  zeroY: number;
  min: number;
  max: number;
}

export function lineChart(paths: number[][], evPerTrade: number, width = 640, height = 240, pad = 8): LineChart {
  const trades = Math.max(1, (paths[0]?.length ?? 1) - 1);
  const values = paths.flat();
  const expectedEnd = evPerTrade * trades;
  const min = Math.min(0, expectedEnd, ...values);
  const max = Math.max(0, expectedEnd, ...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / trades) * (width - pad * 2);
  const y = (v: number) => pad + ((max - v) / span) * (height - pad * 2);
  const fmt = (n: number) => Math.round(n * 10) / 10;
  return {
    width,
    height,
    lines: paths.map((p) => p.map((v, i) => `${fmt(x(i))},${fmt(y(v))}`).join(' ')),
    expected: `${fmt(x(0))},${fmt(y(0))} ${fmt(x(trades))},${fmt(y(expectedEnd))}`,
    zeroY: fmt(y(0)),
    min,
    max,
  };
}

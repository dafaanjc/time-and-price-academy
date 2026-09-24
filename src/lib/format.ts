// Format angka Indonesia: titik ribuan, koma desimal (Rp1.000.000; 0,5).
const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
const rupiah = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

export const formatNumber = (value: number): string => number.format(value);
export const formatRupiah = (value: number): string => `Rp${rupiah.format(value)}`;

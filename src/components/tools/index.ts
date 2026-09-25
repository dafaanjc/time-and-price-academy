// Alat hitung yang bisa dipakai di MDX konsep dan masalah trader tanpa import
// (diteruskan lewat prop `components` di halaman). Nama komponen = nama tag di MDX.
import PenjelajahDistribusi from './PenjelajahDistribusi.astro';
import PenjelajahNilaiHarapan from './PenjelajahNilaiHarapan.astro';
import SimulasiEkuitas from './SimulasiEkuitas.astro';
import SimulasiMargin from './SimulasiMargin.astro';
import TabelKalahBeruntun from './TabelKalahBeruntun.astro';
import UkuranPosisi from './UkuranPosisi.astro';

export const toolComponents = {
  UkuranPosisi,
  SimulasiMargin,
  TabelKalahBeruntun,
  PenjelajahNilaiHarapan,
  PenjelajahDistribusi,
  SimulasiEkuitas,
};

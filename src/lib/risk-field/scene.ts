// Risk Field — adegan three.js untuk hero beranda. Modul ini HANYA dimuat lewat import() dinamis dari
// RiskField.astro setelah kualitas ≠ "low" dan kanvas terlihat, jadi three.js tidak ikut bundel awal.
// Geometri dari ./geometry (murni, teruji); warna dari token CSS (--field-*) yang dibaca komponen.
// Gaya: garis rambut grafit di atas dinding galeri, satu lintasan kuningan (nilai harapan), tanpa
// pendaran, tanpa bayangan, tanpa putaran — kamera hanya melayang pelan dan bergeser sedikit.
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import {
  branchPaths,
  buildTerrain,
  buildWallGrid,
  densityCurve,
  field,
  fieldBounds,
  historyPath,
  labelAnchors,
  meanAt,
  densityAt,
  meanPath,
  type Segments,
  type Vec3,
} from './geometry';
import type { QualitySettings } from './quality';

export interface FieldPalette {
  /** Kisi dinding waktu × harga (--field-grid). */
  grid: string;
  /** Garis relief bernilai tinggi (--field-line). */
  line: string;
  /** Garis relief di ekor / kisi dinding (--field-line-faint). */
  lineFaint: string;
  /** Sumbu & tick (--field-axis). */
  axis: string;
  /** Jalur masa lalu & kurva probabilitas (--field-trace). */
  trace: string;
  /** Satu-satunya aksen: lintasan nilai harapan (--field-highlight). */
  highlight: string;
  /** Isian lembut di bawah kurva di T (--field-fill). */
  fill: string;
}

export type AnchorKey = keyof ReturnType<typeof labelAnchors>;

export interface MountOptions {
  canvas: HTMLCanvasElement;
  /** Label HTML yang diposisikan mengikuti proyeksi titik 3D. */
  labels: Partial<Record<AnchorKey, HTMLElement>>;
  settings: QualitySettings;
  palette: FieldPalette;
  /** Periode drift kamera (ms), dari --field-drift-period. */
  driftPeriodMs: number;
  /** Durasi "gambar jejak sekali" lintasan kuningan (ms). 0 = langsung penuh. */
  revealMs: number;
  /** Gerak diizinkan (drift, paralaks, reveal). */
  motion: boolean;
  onFirstFrame?: () => void;
  onContextLost?: () => void;
}

export interface RiskFieldController {
  /** Jalankan/hentikan loop render (mis. saat keluar layar atau tab tersembunyi). */
  setActive(active: boolean): void;
  setPalette(palette: FieldPalette): void;
  setMotion(motion: boolean): void;
  dispose(): void;
}

const BASE_AZIMUTH = 0.68; // rad, kamera di kanan-depan: masa depan lebih dekat ke pengamat
const BASE_ELEVATION = 0.44; // cukup tinggi untuk membaca medan, tidak sampai tampak atas

const FOV = 30;

/** [t, p, d] → dunia: waktu ke kanan (x), kepadatan ke atas (y), harga ke belakang (−z). */
const toWorld = ([t, p, d]: Vec3): Vec3 => [t, d, -p];
const toVector = (point: Vec3) => new Vector3(...toWorld(point));
const toVectors = (points: Vec3[]) => points.map(toVector);

/** Buffer posisi dari deretan [t, p, d] datar. */
function worldPositions(flat: number[]): Float32Array {
  const out = new Float32Array(flat.length);
  for (let i = 0; i < flat.length; i += 3) out.set(toWorld([flat[i]!, flat[i + 1]!, flat[i + 2]!]), i);
  return out;
}

function segmentsGeometry(seg: Segments, withColor: boolean): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(worldPositions(seg.positions), 3));
  if (withColor) geometry.setAttribute('color', new BufferAttribute(new Float32Array(seg.weights.length * 4), 4));
  return geometry;
}

function polylineGeometry(points: Vec3[]): BufferGeometry {
  return new BufferGeometry().setFromPoints(toVectors(points));
}

/** Warna & opasitas per titik relief: ekor datar memudar ke --field-line-faint, punggung ke --field-line. */
function paintTerrain(geometry: BufferGeometry, weights: number[], palette: FieldPalette): void {
  const faint = new Color(palette.lineFaint);
  const strong = new Color(palette.line);
  const c = new Color();
  const attr = geometry.getAttribute('color') as BufferAttribute;
  weights.forEach((w, i) => {
    c.copy(faint).lerp(strong, Math.min(1, w * 1.4));
    attr.setXYZW(i, c.r, c.g, c.b, 0.28 + 0.62 * w);
  });
  attr.needsUpdate = true;
}

export function mountRiskField(options: MountOptions): RiskFieldController {
  const { canvas, labels, settings } = options;
  let palette = options.palette;
  let motion = options.motion;

  // Gagal membuat konteks → lempar; pemanggil kembali ke figur SVG.
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: settings.antialias,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const { tPast, tHorizon, pRange } = field;
  const { detail } = settings;

  // --- Bahan (warna diisi applyPalette) ---
  const mat = {
    terrain: new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
    wall: new LineBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false }),
    axis: new LineBasicMaterial(),
    guide: new LineDashedMaterial({ dashSize: 0.045, gapSize: 0.045, transparent: true, opacity: 0.8 }),
    curve: new LineBasicMaterial(),
    curveFaint: new LineBasicMaterial({ transparent: true, opacity: 0.5 }),
    branch: new LineBasicMaterial({ transparent: true, opacity: 0.7, depthWrite: false }),
    fill: new MeshBasicMaterial({ transparent: true, opacity: 0.55, side: DoubleSide, depthWrite: false }),
    trace: new MeshBasicMaterial(),
    highlight: new MeshBasicMaterial(),
    highlightGuide: new LineDashedMaterial({ dashSize: 0.035, gapSize: 0.035 }),
  };

  // --- Relief kawat ---
  const terrainSeg = buildTerrain(detail);
  const terrainGeometry = segmentsGeometry(terrainSeg, true);
  scene.add(new LineSegments(terrainGeometry, mat.terrain));

  // --- Lantai waktu × harga: kisi samar, sumbu dari satu titik asal, tick ---
  scene.add(new LineSegments(segmentsGeometry(buildWallGrid(), false), mat.wall));
  const axis: number[] = [
    tPast, -pRange, 0, tHorizon + 0.22, -pRange, 0, // waktu
    tPast, -pRange, 0, tPast, pRange + 0.04, 0, // harga
    tPast, -pRange, 0, tPast, -pRange, 0.85, // kepadatan f(P)
  ];
  for (let t = tPast; t <= tHorizon + 1e-9; t += 0.2) {
    const major = Math.abs(t) < 1e-6 || Math.abs(t - tHorizon) < 1e-6;
    axis.push(t, -pRange, 0, t, -pRange - (major ? 0.09 : 0.045), 0);
  }
  for (let p = -pRange; p <= pRange + 1e-9; p += 0.2) axis.push(tPast, p, 0, tPast - 0.045, p, 0);
  scene.add(new LineSegments(segmentsGeometry({ positions: axis, weights: [] }, false), mat.axis));

  const dashed = (points: Vec3[], material: LineDashedMaterial) => {
    const line = new Line(polylineGeometry(points), material);
    line.computeLineDistances();
    scene.add(line);
  };
  dashed([[0, -pRange, 0], [0, pRange, 0]], mat.guide); // "sekarang"
  dashed([[tHorizon, -pRange, 0], [tHorizon, pRange, 0]], mat.guide); // horizon T

  // --- Kurva probabilitas: tiga irisan tebal; di T dengan isian lembut ---
  const curveSamples = Math.max(32, detail.samples);
  for (const t of [tHorizon / 3, (2 * tHorizon) / 3]) {
    scene.add(new Line(polylineGeometry(densityCurve(t, curveSamples)), mat.curveFaint));
  }
  const horizonCurve = densityCurve(tHorizon, curveSamples);
  scene.add(new Line(polylineGeometry(horizonCurve), mat.curve));
  const fillPositions: number[] = [];
  for (let i = 0; i < horizonCurve.length - 1; i++) {
    const [x0, y0, z0] = horizonCurve[i]!;
    const [x1, y1, z1] = horizonCurve[i + 1]!;
    fillPositions.push(x0, y0, 0, x0, y0, z0, x1, y1, z1, x0, y0, 0, x1, y1, z1, x1, y1, 0);
  }
  const fillGeometry = new BufferGeometry();
  fillGeometry.setAttribute('position', new BufferAttribute(worldPositions(fillPositions), 3));
  scene.add(new Mesh(fillGeometry, mat.fill));

  // --- Jalur bercabang (kemungkinan masa depan) ---
  for (const path of branchPaths(detail.branchDepth, Math.round(detail.samples / (detail.branchDepth + 1)))) {
    scene.add(new Line(polylineGeometry(path), mat.branch));
  }

  // --- Masa lalu: satu jalur tebal di lantai, berakhir di titik "sekarang" ---
  const tube = (points: Vec3[], radius: number, segments: number) =>
    new TubeGeometry(new CatmullRomCurve3(toVectors(points)), segments, radius, 6, false);
  scene.add(new Mesh(tube(historyPath(90), 0.01, 140), mat.trace));
  const nowDot = new Mesh(new SphereGeometry(0.032, 16, 12), mat.trace);
  scene.add(nowDot);

  // --- Nilai harapan: lintasan kuningan di punggung relief (digambar sekali) + penanda E[P] di T ---
  const meanGeometry = tube(meanPath(80), 0.014, 160);
  scene.add(new Mesh(meanGeometry, mat.highlight));
  const meanIndexCount = meanGeometry.index?.count ?? 0;
  const evPoint: Vec3 = [tHorizon, meanAt(tHorizon), densityAt(tHorizon, meanAt(tHorizon))];
  const evDot = new Mesh(new SphereGeometry(0.042, 16, 12), mat.highlight);
  evDot.position.copy(toVector(evPoint));
  scene.add(evDot);
  dashed([evPoint, [tHorizon, evPoint[1], 0]], mat.highlightGuide);

  function applyPalette(): void {
    paintTerrain(terrainGeometry, terrainSeg.weights, palette);
    mat.wall.color.set(palette.grid);
    mat.axis.color.set(palette.axis);
    mat.guide.color.set(palette.line);
    mat.curve.color.set(palette.trace);
    mat.curveFaint.color.set(palette.trace);
    mat.branch.color.set(palette.line);
    mat.fill.color.set(palette.fill);
    mat.trace.color.set(palette.trace);
    mat.highlight.color.set(palette.highlight);
    mat.highlightGuide.color.set(palette.highlight);
  }
  applyPalette();

  // --- Kamera: dipaskan ke kotak pembatas, lalu diberi offset kecil (drift, penunjuk, gulir) ---
  const bounds = fieldBounds();
  const center = toVector(bounds.center);
  let distance = 10;

  function resize(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.maxPixelRatio));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const vfov = (FOV * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    distance = (bounds.radius / Math.sin(Math.min(vfov, hfov) / 2)) * 0.7;
    camera.updateProjectionMatrix();
    requestFrame();
  }

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const scroll = { v: 0, t: 0 };

  function placeCamera(elapsed: number): void {
    const phase = (2 * Math.PI * elapsed) / options.driftPeriodMs;
    const drift = motion ? settings.drift : 0;
    const az = BASE_AZIMUTH + drift * 0.05 * Math.sin(phase) + pointer.x * 0.07;
    const el = BASE_ELEVATION + drift * 0.02 * Math.sin(phase * 0.73 + 1) - pointer.y * 0.04 + scroll.v * 0.14;
    camera.position.set(
      center.x + distance * Math.sin(az) * Math.cos(el),
      center.y + distance * Math.sin(el),
      center.z + distance * Math.cos(az) * Math.cos(el),
    );
    camera.lookAt(center);
  }

  const anchors = labelAnchors();
  const projected = new Vector3();
  function placeLabels(): void {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    for (const [key, el] of Object.entries(labels) as [AnchorKey, HTMLElement | undefined][]) {
      if (!el) continue;
      projected.set(...toWorld(anchors[key])).project(camera);
      const x = ((projected.x + 1) / 2) * width;
      const y = ((1 - projected.y) / 2) * height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    }
  }

  // --- Loop render: hanya saat aktif (terlihat & tab tampil); dibatasi fps kualitas ---
  let active = false;
  let raf = 0;
  let start = -1;
  let revealStart = -1;
  let lastFrame = -Infinity;
  let firstFrameDone = false;
  const frameInterval = 1000 / settings.fps;

  function setReveal(now: number): boolean {
    if (!motion || options.revealMs <= 0) {
      meanGeometry.setDrawRange(0, meanIndexCount);
      evDot.visible = true;
      return false;
    }
    if (revealStart < 0) revealStart = now;
    const u = Math.min(1, (now - revealStart) / options.revealMs);
    const eased = 1 - Math.pow(1 - u, 3);
    const quad = 6 * 6; // indeks per segmen tabung (6 sisi × 2 segitiga × 3)
    meanGeometry.setDrawRange(0, Math.floor((eased * meanIndexCount) / quad) * quad);
    evDot.visible = u >= 1;
    return u < 1;
  }

  function render(now: number): boolean {
    if (start < 0) start = now;
    const k = 1 - Math.exp(-(now - lastFrame) / 450);
    const ease = Number.isFinite(k) ? k : 1;
    pointer.x += (pointer.tx - pointer.x) * ease;
    pointer.y += (pointer.ty - pointer.y) * ease;
    scroll.v += (scroll.t - scroll.v) * ease;
    lastFrame = now;
    const revealing = setReveal(now);
    placeCamera(now - start);
    renderer.render(scene, camera);
    placeLabels();
    if (!firstFrameDone) {
      firstFrameDone = true;
      options.onFirstFrame?.();
    }
    const settling =
      Math.abs(pointer.tx - pointer.x) > 1e-3 || Math.abs(pointer.ty - pointer.y) > 1e-3 || Math.abs(scroll.t - scroll.v) > 1e-3;
    return motion || revealing || settling;
  }

  function tick(now: number): void {
    raf = 0;
    if (!active) return;
    if (now - lastFrame < frameInterval - 1) {
      raf = requestAnimationFrame(tick);
      return;
    }
    if (render(now)) raf = requestAnimationFrame(tick);
  }

  function requestFrame(): void {
    if (active && !raf) raf = requestAnimationFrame(tick);
  }

  // --- Masukan: penunjuk (hanya high) & gulir; keduanya pasif dan tanpa layout paksa di loop ---
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !motion) return;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    requestFrame();
  };
  const onScroll = () => {
    if (!motion) return;
    const rect = canvas.getBoundingClientRect();
    scroll.t = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
    requestFrame();
  };
  if (settings.pointerParallax) window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    active = false;
    options.onContextLost?.();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  resize();

  return {
    setActive(next) {
      active = next;
      if (active) {
        lastFrame = -Infinity;
        requestFrame();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    setPalette(next) {
      palette = next;
      applyPalette();
      requestFrame();
    },
    setMotion(next) {
      motion = next;
      if (!motion) {
        pointer.tx = pointer.ty = 0;
        scroll.t = 0;
      }
      requestFrame();
    },
    dispose() {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver.disconnect();
      scene.traverse((object: Object3D) => {
        if ('geometry' in object) (object.geometry as BufferGeometry).dispose();
      });
      Object.values(mat).forEach((m: Material) => m.dispose());
      renderer.dispose();
    },
  };
}

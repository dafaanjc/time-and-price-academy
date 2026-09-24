import type { APIRoute, GetStaticPaths } from 'astro';
import { renderOgImage } from '../../../lib/og-image';
import { getProblems, type Problem } from '../../../lib/problems';
import { displayUrl } from '../../../lib/url';

// Satu gambar pratinjau per masalah trader: /og/masalah/<slug>.png
export const getStaticPaths = (async () => {
  const problems = await getProblems();
  return problems.map((problem) => ({ params: { slug: problem.id }, props: { problem } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ problem: Problem }> = async ({ props, site }) => {
  const { title, decision } = props.problem.data;
  const png = await renderOgImage({
    kicker: 'Masalah trader',
    title: `“${title}”`,
    description: decision,
    url: displayUrl(site),
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

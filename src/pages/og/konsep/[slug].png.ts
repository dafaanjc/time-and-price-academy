import type { APIRoute, GetStaticPaths } from 'astro';
import { getCategory } from '../../../data/categories';
import { getConcepts, type Concept } from '../../../lib/concepts';
import { renderOgImage } from '../../../lib/og-image';
import { displayUrl } from '../../../lib/url';

// Satu gambar pratinjau per konsep: /og/konsep/<slug>.png
export const getStaticPaths = (async () => {
  const concepts = await getConcepts();
  return concepts.map((concept) => ({ params: { slug: concept.id }, props: { concept } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ concept: Concept }> = async ({ props, site }) => {
  const { title, termEn, description, category } = props.concept.data;
  const png = await renderOgImage({
    kicker: getCategory(category).title,
    title,
    subtitle: termEn,
    description,
    url: displayUrl(site),
  });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

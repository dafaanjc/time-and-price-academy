import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { categoryIds } from './data/categories';
import { sourceTypeIds } from './data/source-types';

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug harus kebab-case (a-z, 0-9, -)');

const source = z.object({
  type: z.enum(sourceTypeIds),
  title: z.string().min(1),
  authors: z.array(z.string().min(1)).default([]),
  year: z.number().int().min(1000).max(2100).optional(),
  publisher: z.string().optional(),
  url: z.url().optional(),
  doi: z.string().optional(),
  isbn: z.string().optional(),
  note: z.string().optional(),
});

const concepts = defineCollection({
  // `slug` di frontmatter menjadi `entry.id`.
  loader: glob({ pattern: '**/*.mdx', base: './src/content/concepts' }),
  schema: z.object({
    title: z.string().min(1),
    /** Istilah asli dalam bahasa Inggris, ditampilkan sebagai padanan. */
    termEn: z.string().optional(),
    slug,
    category: z.enum(categoryIds),
    /** Urutan dalam kategori (menaik). */
    order: z.number().int().nonnegative(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
    description: z.string().min(1).max(220),
    status: z.enum(['draft', 'review', 'published']).default('draft'),
    featured: z.boolean().default(false),
    prerequisites: z.array(slug).default([]),
    related: z.array(slug).default([]),
    sources: z.array(source).default([]),
    sections: z.array(z.object({ id: z.string(), title: z.string() })).optional(),
  }),
});

export const collections = { concepts };

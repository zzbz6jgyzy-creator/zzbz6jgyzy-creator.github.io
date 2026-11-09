// Dispatch stories written in Markdown (content/dispatch/<slug>.md at the repo root, see docs/publish-from-phone.md).
// Step B1 of the Astro migration (docs/migration.md): Astro reads the same files the live pipeline renders
// (scripts/render-article.py) and validates their front matter with the same rules, so a story that would break
// the Python renderer also fails `astro build`. No page is built from this collection yet; ported.json is unchanged.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const plain = z
  .string()
  .trim()
  .min(1)
  .refine((s) => !/[<>*`\[\]]/.test(s), 'plain text only (it becomes a meta tag): no Markdown or HTML')
  .refine((s) => !/\bDRAFT\b/.test(s), 'still says DRAFT');

export const DispatchStory = z
  .object({
    title: plain,
    summary: plain,
    topic: z.enum(['tesla', 'spacex', 'xai', 'x']),
    tag: z.string().trim().min(1),
    date: z.coerce.date().optional(),
    image: z.string().startsWith('/assets/').optional(),
    imageAlt: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
  })
  .refine((d) => !d.image || !!d.imageAlt, { message: 'an image needs imageAlt', path: ['imageAlt'] });

const dispatch = defineCollection({
  loader: glob({ pattern: '*.md', base: '../content/dispatch' }),
  schema: DispatchStory,
});

export const collections = { dispatch };

import { z } from 'zod';

const httpUrl = z.string().url().refine(
  (url) => url.startsWith('https://') || url.startsWith('http://'),
  { message: 'URL must use http or https' }
);

// Accepts a native Date (from YAML) or a date string (from tests / JSON),
// but rejects null/undefined/number so the schema stays strict.
const flexDate = z.union([z.date(), z.string().pipe(z.coerce.date())]);

export const blogSchema = z.object({
  title:         z.string().min(1),
  date:          flexDate,
  lang:          z.enum(['en', 'pt']),
  tags:          z.array(z.string()),
  dek:           z.string().min(1),
  readingTime:   z.number().int().min(1).optional(),
  featured:      z.boolean().default(false),
  draft:         z.boolean().default(false),
  translationOf: z.string().min(1).optional(),
});

export const projectSchema = z.object({
  title:    z.string().min(1),
  year:     z.number().int().min(2000).max(2100),
  category: z.enum(['work', 'personal', 'sim-racing', 'ai-tooling']),
  dek:      z.string().min(1),
  featured: z.boolean().default(false),
  stack:    z.string().optional(),
  metric:   z.string().optional(),
  url:      httpUrl.optional(),
  status:   z.enum(['active', 'archived', 'discontinued']),
});

export const talkSchema = z.object({
  title:     z.string().min(1),
  kind:      z.enum(['talk', 'podcast', 'workshop', 'interview', 'video']),
  venue:     z.string().min(1),
  location:  z.string().optional(),
  date:      flexDate,
  lang:      z.enum(['en', 'pt']),
  url:       httpUrl,
  views:     z.number().int().optional(),
});

export const usesSchema = z.object({
  title: z.string().default('Uses'),
});

export const nowSchema = z.object({
  updated:     flexDate,
  location:    z.string().min(1),
  building:    z.string().min(1),
  reading:     z.string().min(1),
  listening:   z.string().min(1),
  learning:    z.string().min(1),
  lookingFor:  z.string().min(1),
});

export const aboutSchema = z.object({
  lang:  z.enum(['en', 'pt']),
  title: z.string().default('About'),
});

export const resumeSchema = z.object({
  title:   z.string().default('Resume'),
  updated: flexDate,
});

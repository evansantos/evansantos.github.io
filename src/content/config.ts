import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  blogSchema,
  projectSchema,
  talkSchema,
  usesSchema,
  nowSchema,
  aboutSchema,
  resumeSchema,
} from './schemas.js';

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: blogSchema,
  }),
  projects: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
    schema: projectSchema,
  }),
  talks: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/talks' }),
    schema: talkSchema,
  }),
  uses: defineCollection({
    loader: glob({ pattern: 'uses.{md,mdx}', base: './src/content' }),
    schema: usesSchema,
  }),
  now: defineCollection({
    loader: glob({ pattern: 'now.{md,mdx}', base: './src/content' }),
    schema: nowSchema,
  }),
  about: defineCollection({
    loader: glob({ pattern: 'about/**/*.{md,mdx}', base: './src/content' }),
    schema: aboutSchema,
  }),
  resume: defineCollection({
    loader: glob({ pattern: 'resume.{md,mdx}', base: './src/content' }),
    schema: resumeSchema,
  }),
};

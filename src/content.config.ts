import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  schema: z.object({
    author: z.string().optional(),
    pubDatetime: z.date(),
    title: z.string(),
    postSlug: z.string().optional(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["others"]),
    ogImage: z.string().optional(),
    description: z.string(),
  }),
});

export const collections = {
  blog: blogCollection,
};

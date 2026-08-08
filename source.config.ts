import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
} from "fumadocs-mdx/config";
import { z } from "zod";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    schema: frontmatterSchema.extend({
      /**
       * ISO date this page was last meaningfully revised. Drives sitemap
       * `lastModified` — file mtime is useless here because a fresh CI clone
       * stamps every file with the checkout time.
       */
      lastModified: z.string().optional(),
    }),
  },
});

export const blog = defineCollections({
  type: "doc",
  dir: "content/blog",
  schema: frontmatterSchema.extend({
    date: z.string(),
    readingMinutes: z.number().optional(),
  }),
});

export default defineConfig();

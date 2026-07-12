import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCta } from "@/components/tools/product-cta";
import { getMDXComponents } from "@/components/mdx";
import { blog } from "@/lib/source";

export function generateStaticParams() {
  return blog.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = blog.getPage(params.slug);
  if (!page) return {};
  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function BlogPostPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = blog.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
      <div className="mb-4 flex items-center gap-2 text-xs text-fd-muted-foreground">
        <Link href="/blog" className="hover:text-fd-foreground">
          Blog
        </Link>
        <span>/</span>
        <span className="text-fd-foreground">{page.data.title}</span>
      </div>
      <p className="mb-2 text-xs text-fd-muted-foreground">
        {String(page.data.date)}
        {typeof page.data.readingMinutes === "number"
          ? ` · ${page.data.readingMinutes} min read`
          : null}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {page.data.title}
      </h1>
      {page.data.description ? (
        <p className="mt-3 text-lg text-fd-muted-foreground leading-relaxed">
          {page.data.description}
        </p>
      ) : null}
      <article className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
        <MDX components={getMDXComponents()} />
      </article>
      {page.data.toc && page.data.toc.length > 0 ? (
        <aside className="mt-12 rounded-lg border border-fd-border p-4 text-sm">
          <p className="mb-2 font-medium">On this page</p>
          <ul className="space-y-1 text-fd-muted-foreground">
            {page.data.toc.map((item) => (
              <li
                key={item.url}
                style={{ paddingLeft: `${Math.max(0, item.depth - 2) * 12}px` }}
              >
                <a href={item.url} className="hover:text-fd-foreground">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
      <div className="mt-10">
        <ProductCta />
      </div>
    </main>
  );
}

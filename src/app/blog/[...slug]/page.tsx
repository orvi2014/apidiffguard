import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCta } from "@/components/tools/product-cta";
import { getMDXComponents } from "@/components/mdx";
import { JsonLd } from "@/components/seo/json-ld";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { articleJsonLd, breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
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
  return buildMetadata({
    title: page.data.title,
    description: page.data.description ?? "",
    path: page.url,
    type: "article",
    publishedTime: String(page.data.date),
  });
}

export default async function BlogPostPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = blog.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const date = String(page.data.date);

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:py-16">
        <JsonLd
          data={[
            articleJsonLd({
              title: page.data.title,
              description: page.data.description ?? "",
              path: page.url,
              datePublished: date,
            }),
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: page.data.title, path: page.url },
            ]),
          ]}
        />
        <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <span>/</span>
          <span className="text-foreground">{page.data.title}</span>
        </div>
        <p className="mb-2 text-xs text-muted-foreground">
          {date}
          {typeof page.data.readingMinutes === "number"
            ? ` · ${page.data.readingMinutes} min read`
            : null}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.data.title}
        </h1>
        {page.data.description ? (
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            {page.data.description}
          </p>
        ) : null}
        <article className="prose prose-neutral dark:prose-invert mt-10 max-w-none">
          <MDX components={getMDXComponents()} />
        </article>
        <div className="mt-10">
          <ProductCta />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { posts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — API monitoring, JSON diffs, and CI gates",
  description:
    "Technical writing on detecting breaking API changes, monitoring third-party APIs, and shipping safer integrations.",
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
          Blog
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Notes on API drift and safer releases.
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Practical guides for teams who depend on third-party and internal APIs
          every day.
        </p>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <li key={post.slug} className="py-6">
              <Link href={`/blog/${post.slug}`} className="group block">
                <time className="text-xs text-muted-foreground">{post.date}</time>
                <h2 className="mt-1 text-lg font-medium group-hover:text-accent">
                  {post.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {post.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {post.readingMinutes} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <MarketingFooter />
    </div>
  );
}

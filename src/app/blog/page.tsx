import type { Metadata } from "next";
import Link from "next/link";
import { blog } from "@/lib/source";

export const metadata: Metadata = {
  title: "Blog — API monitoring, JSON diffs, and CI gates",
  description:
    "Technical writing on detecting breaking API changes, monitoring third-party APIs, and shipping safer integrations.",
};

export default function BlogIndexPage() {
  const posts = [...blog.getPages()].sort((a, b) => {
    const da = String(a.data.date ?? "");
    const db = String(b.data.date ?? "");
    return db.localeCompare(da);
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fd-primary">
        Blog
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Notes on API drift and safer releases.
      </h1>
      <p className="mt-3 text-fd-muted-foreground leading-relaxed">
        Practical guides for teams who depend on third-party and internal APIs
        every day.
      </p>

      <ul className="mt-12 divide-y divide-fd-border border-y border-fd-border">
        {posts.map((post) => (
          <li key={post.url} className="py-6">
            <Link href={post.url} className="group block">
              <time className="text-xs text-fd-muted-foreground">
                {String(post.data.date)}
              </time>
              <h2 className="mt-1 text-lg font-medium group-hover:text-fd-primary">
                {post.data.title}
              </h2>
              {post.data.description ? (
                <p className="mt-2 text-sm text-fd-muted-foreground leading-relaxed">
                  {post.data.description}
                </p>
              ) : null}
              {typeof post.data.readingMinutes === "number" ? (
                <p className="mt-2 text-xs text-fd-muted-foreground">
                  {post.data.readingMinutes} min read
                </p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

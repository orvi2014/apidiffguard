import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/chrome";
import { ProductCta } from "@/components/tools/product-cta";
import { getPost, posts } from "@/lib/blog";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

const bodies: Record<string, ReactNode> = {
  "detect-breaking-api-changes-in-ci": (
    <>
      <p>
        Most CI pipelines test <em>your</em> code. Few of them notice when a
        dependency’s JSON shape quietly changes — a renamed field in a payments
        API, a pagination default that jumps from 20 to 25, a null that used to
        be a string.
      </p>
      <p>
        Those breaks show up in production dashboards, not unit tests. The fix
        is not another one-off curl script. It’s treating the live response as a
        contract you can gate on.
      </p>
      <h2>A minimal CI pattern</h2>
      <ol>
        <li>Capture a known-good response as a baseline (checked into the repo or stored by a monitor).</li>
        <li>On every PR / deploy, fetch the same endpoint.</li>
        <li>Diff the bodies. Fail the job on breaking changes (removed fields, type changes).</li>
      </ol>
      <pre>
        <code>{`# Conceptual gate
npx apidiff check --fail-on breaking`}</code>
      </pre>
      <p>
        Under the hood that’s a JSON compare with severity rules — the same
        engine behind our free{" "}
        <Link href="/tools/json-diff">JSON Diff tool</Link> and the open-source{" "}
        <code>@apidiffguard/diff</code> package.
      </p>
      <h2>What counts as breaking?</h2>
      <ul>
        <li>Field removed</li>
        <li>Type changed (string → number, object → null)</li>
        <li>HTTP status class change (200 → 4xx/5xx)</li>
      </ul>
      <p>
        Value churn on volatile fields (<code>request_id</code>, timestamps)
        should be ignored — otherwise every check is noise.
      </p>
      <h2>Where hosted monitoring helps</h2>
      <p>
        CI catches changes you trigger. Scheduled monitoring catches changes{" "}
        <em>someone else</em> shipped overnight. If your product depends on
        Stripe, Shopify, or a partner API, you want both.
      </p>
    </>
  ),
  "stripe-api-updates-breaking-production": (
    <>
      <p>
        Stripe (and every mature API vendor) iterates carefully — but “carefully”
        still means fields get deprecated, enums grow, and nested objects
        rearrange. Your integration might not notice until a webhook handler
        throws or a mobile client crashes on a missing key.
      </p>
      <p>
        Waiting for Stripe’s changelog email is not a monitoring strategy. You
        need a baseline of the responses <em>your</em> account actually receives.
      </p>
      <h2>What to baseline</h2>
      <ul>
        <li>Customer / subscription retrieve payloads you parse in production</li>
        <li>Webhook event bodies for the events you handle</li>
        <li>List endpoints with the query params your app uses</li>
      </ul>
      <h2>A practical workflow</h2>
      <ol>
        <li>Import or register the endpoints you care about.</li>
        <li>Capture a baseline while things are healthy.</li>
        <li>Schedule checks (hourly is enough for most SaaS integrations).</li>
        <li>Alert on breaking diffs to Slack before customers open tickets.</li>
      </ol>
      <p>
        If you’re still exploring, start with a one-off compare in the{" "}
        <Link href="/tools/json-diff">JSON Diff tool</Link> using a saved
        response from last month versus today.
      </p>
      <h2>Ignore noise, keep signal</h2>
      <p>
        Stripe responses include request IDs and timestamps. Ignore those paths
        so alerts fire on contract changes — not every unique request.
      </p>
    </>
  ),
  "monitor-third-party-apis-without-scripts": (
    <>
      <p>
        Every agency and platform team has the same graveyard: a Notion page of
        curl commands, a cron job on someone’s laptop, a PagerDuty alert that
        never got wired. Custom scripts work until the author changes jobs.
      </p>
      <p>
        Monitoring a third-party API should feel like checking a status page —
        except the “status” is whether the <em>shape</em> of the response still
        matches what your clients expect.
      </p>
      <h2>Replace the script with a baseline</h2>
      <p>
        A baseline is a versioned snapshot: status code, headers you care about,
        and body. A check is a fresh fetch compared against that snapshot. The
        output is a diff, not a vague “failed.”
      </p>
      <h2>When free tools are enough</h2>
      <p>
        Investigating a one-time mystery? Use{" "}
        <Link href="/tools/json-diff">JSON Diff</Link>,{" "}
        <Link href="/tools/json-formatter">Formatter</Link>, or{" "}
        <Link href="/tools/json-validator">Validator</Link>. No account
        required.
      </p>
      <h2>When you need a product</h2>
      <ul>
        <li>More than a handful of endpoints</li>
        <li>Multiple environments (staging vs production)</li>
        <li>Teammates who should see history without SSH</li>
        <li>Alerts when you’re not watching the terminal</li>
      </ul>
      <p>
        That’s the gap APIDiffGuard fills: same diff engine, hosted baselines,
        schedules, and a console built for reviewing changes like code.
      </p>
    </>
  ),
};

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post || !bodies[slug]) notFound();

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <span>/</span>
          <span className="text-foreground">{post.title}</span>
        </div>
        <time className="mt-6 block text-xs text-muted-foreground">
          {post.date} · {post.readingMinutes} min read
        </time>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
          {post.description}
        </p>
        <article className="prose-tools mt-10 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:font-mono [&_code]:text-[12px] [&_code]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:text-foreground">
          {bodies[slug]}
        </article>
        <ProductCta />
      </main>
      <MarketingFooter />
    </div>
  );
}

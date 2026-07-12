export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
};

export const posts: BlogPost[] = [
  {
    slug: "detect-breaking-api-changes-in-ci",
    title: "How to detect breaking API changes in CI/CD",
    description:
      "Gate deploys when a response field disappears or changes type — without writing a custom curl script for every endpoint.",
    date: "2026-07-12",
    readingMinutes: 7,
  },
  {
    slug: "stripe-api-updates-breaking-production",
    title: "Prevent Stripe API updates from breaking production",
    description:
      "Third-party APIs change. Here’s a practical way to notice Stripe (and other) response drift before customers do.",
    date: "2026-07-12",
    readingMinutes: 6,
  },
  {
    slug: "monitor-third-party-apis-without-scripts",
    title: "Monitoring third-party APIs without writing custom scripts",
    description:
      "Stop maintaining a pile of ad-hoc monitors. Capture a baseline, schedule a check, and alert on real drift.",
    date: "2026-07-12",
    readingMinutes: 5,
  },
];

export function getPost(slug: string) {
  return posts.find((p) => p.slug === slug);
}

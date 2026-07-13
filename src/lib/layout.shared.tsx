import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <span className="font-semibold tracking-tight">APIDiffGuard</span>
        </>
      ),
      url: "/",
    },
    links: [
      {
        text: "About",
        url: "/about",
      },
      {
        text: "Docs",
        url: "/docs",
        active: "nested-url",
      },
      {
        text: "Blog",
        url: "/blog",
        active: "nested-url",
      },
      {
        text: "Tools",
        url: "/tools",
      },
      {
        text: "Pricing",
        url: "/pricing",
      },
      {
        type: "button",
        text: "Open console",
        url: "/login?next=/dashboard",
        secondary: false,
      },
    ],
  };
}

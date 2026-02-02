import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vello-mauve.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/api/",
          "/templates/",
          "/settings/",
          "/onboarding",
          "/forgot-password",
          "/reset-password",
          "/invite/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

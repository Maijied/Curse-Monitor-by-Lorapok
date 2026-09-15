#!/usr/bin/env node
/**
 * Generates website/seo.json, sitemap.xml, robots.txt from website/seo.yml + package.json.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const website = join(root, "website");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

async function parseYaml(text) {
  try {
    const yaml = await import("yaml");
    return yaml.parse(text);
  } catch {
    throw new Error(
      "Missing `yaml` package. Run npm install (devDependency) to generate SEO artifacts."
    );
  }
}

function interpolate(text, vars) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

const seoConfig = await parseYaml(readFileSync(join(website, "seo.yml"), "utf8"));
const SITE_BASE = String(seoConfig.site?.base ?? pkg.homepage ?? "").replace(/\/$/, "");
const vars = {
  displayName: "Curse Monitor by Lorapok",
  version: pkg.version,
  siteBase: SITE_BASE,
  packageVersion: pkg.version,
  missionControlUrl: "https://cursor-dev.lorapok.tech",
};

const pages = seoConfig.pages ?? {};
const sameAs = seoConfig.organization?.sameAs ?? [];
const ogImagePath = seoConfig.openGraph?.image ?? "/assets/logo.png";
const ogImage = ogImagePath.startsWith("http") ? ogImagePath : `${SITE_BASE}${ogImagePath}`;

const pageOut = {};
for (const [id, page] of Object.entries(pages)) {
  pageOut[id] = {
    title: interpolate(page.title, vars),
    description: interpolate(page.description, vars),
    canonical: `${SITE_BASE}${page.path}`,
    ogTitle: interpolate(page.ogTitle ?? page.title, vars),
    ogDescription: interpolate(page.ogDescription ?? page.description, vars),
  };
}

const graph = (seoConfig.structuredData?.graph ?? []).map((node) => {
  const item = {
    "@type": node.type,
    "@id": `${SITE_BASE}/#${node.id}`,
    name: interpolate(node.name, vars),
    url: interpolate(node.url ?? "", vars) || undefined,
  };
  if (node.logo) item.logo = node.logo.startsWith("http") ? node.logo : `${SITE_BASE}${node.logo}`;
  if (node.publisher === "organization") item.publisher = { "@id": `${SITE_BASE}/#organization` };
  if (node.applicationCategory) {
    item.applicationCategory = node.applicationCategory;
    item.operatingSystem = node.operatingSystem;
    item.featureList = node.featureList;
    item.downloadUrl = interpolate(node.downloadUrl ?? "", vars);
    item.softwareVersion = pkg.version;
    item.offers = { "@type": "Offer", price: "0", priceCurrency: "USD" };
  }
  if (node.type === "Organization") item.sameAs = sameAs;
  return item;
});

const seoJson = {
  generatedAt: new Date().toISOString(),
  source: "website/seo.yml",
  siteBase: SITE_BASE,
  title: pageOut.index?.title,
  description: pageOut.index?.description,
  version: pkg.version,
  packageVersion: pkg.version,
  canonical: `${SITE_BASE}/`,
  openGraph: {
    type: seoConfig.openGraph?.type ?? "website",
    locale: seoConfig.site?.locale ?? "en_US",
    title: pageOut.index?.ogTitle,
    description: pageOut.index?.ogDescription,
    url: `${SITE_BASE}/`,
    image: ogImage,
  },
  twitter: {
    card: seoConfig.twitter?.card ?? "summary_large_image",
    title: interpolate(pages.index?.twitterTitle, vars),
    description: interpolate(pages.index?.twitterDescription, vars),
    image: ogImage,
  },
  pages: pageOut,
  sameAs,
  structuredData: {
    "@context": "https://schema.org",
    "@graph": graph,
  },
  indexingPolicy: {
    adminNoindex: Boolean(seoConfig.indexing?.adminNoindex),
    marketingAllow: Boolean(seoConfig.indexing?.marketingAllow),
    adminUrls: seoConfig.indexing?.adminUrls ?? [],
    policySummary: interpolate(seoConfig.indexing?.policySummary ?? "", vars),
    sitemapUrl: `${SITE_BASE}/sitemap.xml`,
    robotsUrl: `${SITE_BASE}/robots.txt`,
  },
};

writeFileSync(join(website, "seo.json"), JSON.stringify(seoJson, null, 2) + "\n");

const urlEntries = Object.values(pages)
  .map((page) => {
    const loc = `${SITE_BASE}${page.path}`;
    return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>${page.changefreq ?? "monthly"}</changefreq>\n    <priority>${page.priority ?? "0.5"}</priority>\n  </url>`;
  })
  .join("\n");

writeFileSync(
  join(website, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`
);

writeFileSync(
  join(website, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_BASE}/sitemap.xml\n`
);

function applyHead(file, page) {
  const path = join(website, file);
  if (!existsSync(path)) return;
  let html = readFileSync(path, "utf8");
  const block = `  <!-- seo:begin -->
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}" />
  <link rel="canonical" href="${page.canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${page.canonical}" />
  <meta property="og:title" content="${escapeHtml(page.ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(page.ogDescription)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="Curse Monitor" />
  <meta name="twitter:card" content="${seoJson.twitter.card}" />
  <meta name="twitter:title" content="${escapeHtml(page.ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(page.ogDescription)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <!-- seo:end -->`;
  if (html.includes("<!-- seo:begin -->") && html.includes("<!-- seo:end -->")) {
    html = html.replace(/<!-- seo:begin -->[\s\S]*?<!-- seo:end -->/, block.trim());
    writeFileSync(path, html);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

for (const [id, page] of Object.entries(pages)) {
  if (page.file && pageOut[id]) applyHead(page.file, pageOut[id]);
}

console.log(`SEO artifacts written for ${SITE_BASE} (v${pkg.version})`);

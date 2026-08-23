import { mkdir, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import {
  articlePosts,
  budgets,
  blogTopics,
  designPartners,
  editorialPosts,
  faqs,
  featuredProjects,
  footerLinks,
  navDropdownItems,
  navItems,
  portfolio,
  primaryServices,
  serviceDetails,
  socialLinks,
  services,
  site,
  templateProducts
} from "./content.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");
const assetsIn = path.join(root, "public", "assets");
const assetsOut = path.join(dist, "assets");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const escapeXml = (value = "") =>
  escapeHtml(value).replaceAll("&apos;", "&#39;");

const asset = (filename) => `/assets/${filename}`;
const canonical = (pathname) => new URL(pathname, site.domain).toString();
const absoluteAsset = (filename) => new URL(asset(filename), site.domain).toString();
const imageDimensionAttrs = (image = {}) =>
  image.width && image.height ? ` width="${Number(image.width)}" height="${Number(image.height)}"` : "";
const mimeTypeFor = (filename = "") => {
  const extension = path.extname(filename).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  return "image/jpeg";
};

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}

function organizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: site.name,
    legalName: site.legalName,
    url: site.domain,
    description: site.description,
    founder: {
      "@type": "Person",
      name: site.founder
    },
    foundingLocation: site.foundingPlace,
    areaServed: site.region,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Bangalow",
      addressRegion: "Northern NSW",
      addressCountry: "AU"
    },
    openingHours: site.contact.hours,
    sameAs: site.sameAs,
    contactPoint: {
      "@type": "ContactPoint",
      email: site.contact.email,
      contactType: "enquiries",
      areaServed: site.region,
      availableLanguage: "English"
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "studio rjl creative services",
      itemListElement: primaryServices.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service,
          areaServed: site.region
        }
      }))
    }
  };

  if (site.contact.email) schema.email = site.contact.email;
  if (site.contact.telephone) schema.telephone = site.contact.telephone;
  return schema;
}

function serviceSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "studio rjl services",
    itemListElement: primaryServices.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service,
        provider: {
          "@type": "ProfessionalService",
          name: site.name,
          url: site.domain
        },
        areaServed: site.region
      }
    }))
  };
}

function portfolioSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "recent works",
    url: canonical("/portfolio/"),
    about: "studio rjl portfolio across branding, visual identity, interiors, print, packaging, graphic design and creative direction",
    hasPart: portfolio.map((project) => ({
      "@type": "ImageObject",
      contentUrl: canonical(asset(project.image)),
      url: project.href ? canonical(project.href) : canonical("/portfolio/"),
      caption: project.alt,
      description: project.categories.join(", "),
      keywords: [...(project.categories || []), ...(project.tags || [])],
      creator: {
        "@type": "Organization",
        name: site.name
      }
    }))
  };
}

function shopSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "studio rjl template shop",
    url: canonical("/shop/"),
    description: "digital templates & tools for brand clarity, content planning and creative direction.",
    hasPart: templateProducts.map((product) => ({
      "@type": "Product",
      name: product.title,
      description: product.description,
      image: absoluteAsset(product.image),
      brand: {
        "@type": "Brand",
        name: site.name
      },
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/PreOrder",
        url: product.purchaseUrl || canonical("/shop/")
      }
    }))
  };
}

function editorialSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "studio rjl editorial",
    url: canonical("/editorial/"),
    description:
      "studio rjl editorial case studies across branding, creative direction, campaign atmosphere and digital brand worlds.",
    hasPart: editorialPosts.map((post) => ({
      "@type": "Article",
      headline: post.title,
      url: canonical(`/editorial/${post.slug}/`),
      image: absoluteAsset(post.image),
      author: {
        "@type": "Person",
        name: post.author || site.founder
      },
      publisher: {
        "@type": "Organization",
        name: site.name,
        url: site.domain
      }
    }))
  };
}

function blogSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "studio rjl blog",
    url: canonical("/blog/"),
    about: blogTopics,
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: site.domain
    }
  };
}

function articleSchema(post, pathname = `/blog/${post.slug}/`) {
  const url = canonical(pathname);
  const imageUrl = absoluteAsset(post.image);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    name: post.title,
    description: post.pinDescription || post.description,
    url,
    image: {
      "@type": "ImageObject",
      url: imageUrl,
      contentUrl: imageUrl,
      caption: post.imageAlt
    },
    author: {
      "@type": "Person",
      name: post.author || site.founder
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteAsset("RJL_green_transparent.png")
      }
    },
    datePublished: post.datePublished,
    dateModified: post.dateModified || post.datePublished,
    articleSection: post.section || "branding",
    keywords: post.tags || []
  };
}

function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.domain,
    description: site.description
  };
}

function faqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };
}

function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonical(item.href)
    }))
  };
}

function articleRichPinMarkup({ title, description, url, author }) {
  return `
    <div class="sr-only" itemscope itemtype="https://schema.org/Article">
      <meta itemprop="url" content="${url}">
      <meta itemprop="name" content="${escapeHtml(title)}">
      <meta itemprop="author" content="${escapeHtml(author)}">
      <meta itemprop="description" content="${escapeHtml(description)}">
    </div>
  `;
}

function head({
  title,
  description,
  pathname,
  image = "/assets/RJL_green_transparent.png",
  imageAlt = site.description,
  preloadImage = "/assets/RJL_green_transparent.png",
  type = "website",
  author = site.founder,
  publishedTime = "",
  modifiedTime = "",
  section = "",
  tags = [],
  extraSchema = []
}) {
  const pageTitle = title === site.name ? site.name : `${title} - ${site.name}`;
  const url = canonical(pathname);
  const imageUrl = new URL(image, site.domain).toString();
  const isArticle = type === "article";
  const imageType = mimeTypeFor(image);

  return `
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <link rel="canonical" href="${url}">
    <meta property="og:title" content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="${escapeHtml(type)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="${imageType}">
    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
    <meta property="og:site_name" content="${escapeHtml(site.name)}">
    <meta property="og:locale" content="${site.locale}">
    ${isArticle ? `<meta property="article:author" content="${escapeHtml(author)}">` : ""}
    ${isArticle && publishedTime ? `<meta property="article:published_time" content="${escapeHtml(publishedTime)}">` : ""}
    ${isArticle && modifiedTime ? `<meta property="article:modified_time" content="${escapeHtml(modifiedTime)}">` : ""}
    ${isArticle && section ? `<meta property="article:section" content="${escapeHtml(section)}">` : ""}
    ${isArticle ? tags.map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join("\n    ") : ""}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
    <meta name="p:domain_verify" content="${site.pinterestVerification}">
    <link rel="alternate" type="application/rss+xml" title="studio rjl editorial feed" href="${canonical("/feed.xml")}">
    <link rel="icon" type="image/png" href="/assets/favicon.png">
    <link rel="preload" as="image" href="${preloadImage}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/styles.css">
    ${site.googleAnalyticsId ? analytics() : ""}
    ${jsonLd(organizationSchema())}
    ${jsonLd(websiteSchema())}
    ${extraSchema.map(jsonLd).join("\n")}
  `;
}

function analytics() {
  return `
    <script async src="https://www.googletagmanager.com/gtag/js?id=${site.googleAnalyticsId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag("js", new Date());
      gtag("config", "${site.googleAnalyticsId}");
    </script>
  `;
}

function nav() {
  return `
    <nav class="site-nav" aria-label="Primary navigation">
      <a href="/" class="brand">studio rjl</a>
      <button class="menu-toggle" type="button" aria-label="Open menu" data-menu-toggle>☰</button>
      <div class="nav-links" data-nav-links>
        ${navItems.map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`).join("")}
        <details class="nav-dropdown">
          <summary>more</summary>
          <div class="nav-dropdown-menu">
            ${navDropdownItems.map((item) => `<a href="${item.href}">${escapeHtml(item.label)}</a>`).join("")}
          </div>
        </details>
        <button class="enquiry-button" type="button" data-enquiry-toggle>inquire</button>
      </div>
    </nav>
  `;
}

function icon(name) {
  if (name === "mail") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v10H4z"/><path d="m4 8 8 6 8-6"/><path d="M12 17.2s-3.2-1.7-3.2-3.7c0-1 .7-1.7 1.6-1.7.7 0 1.2.4 1.6 1 .4-.6.9-1 1.6-1 .9 0 1.6.7 1.6 1.7 0 2-3.2 3.7-3.2 3.7z"/></svg>`;
  }

  if (name === "instagram") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4"/><circle cx="12" cy="12" r="3.2"/><circle cx="16.4" cy="7.8" r="0.8"/></svg>`;
  }

  if (name === "linkedin") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 10v8"/><path d="M6.5 6.5v.1"/><path d="M11 18v-8"/><path d="M11 13.4c0-2 1.2-3.4 3.1-3.4 1.8 0 3 1.2 3 3.4V18"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
  }

  return `<svg class="social-svg social-svg-pinterest" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.6 20c.5-1.7 1-3.4 1.5-5.1.4.7 1.2 1.1 2.1 1.1 2.7 0 4.7-2.5 4.7-5.8 0-3.1-2.6-5.7-6.5-5.7-4.8 0-7.3 3.2-7.3 6.5 0 1.7.8 3.5 2.1 4.1.2.1.3 0 .4-.2l.3-1.3c.1-.2 0-.3-.1-.5-.4-.5-.7-1.1-.7-1.9 0-2.5 1.9-4.8 5-4.8 2.7 0 4.4 1.7 4.4 4.1 0 2.8-1.4 4.8-3.3 4.8-1 0-1.8-.9-1.5-1.9.3-1.2.9-2.5.9-3.4 0-.8-.4-1.4-1.3-1.4-1 0-1.8 1-1.8 2.4 0 .9.3 1.5.3 1.5l-1.2 5c-.3 1.3-.3 2.7-.2 3.7.7-.9 1.7-2.2 2.2-3.2z"/></svg>`;
}

function footer() {
  return `
    <footer>
      <div class="footer-grid">
        <div class="footer-block reveal">
          <div class="footer-title">studio rjl</div>
          <p>${escapeHtml(site.locationSignal)}</p>
          <p>${escapeHtml(site.foundingPlace)}</p>
          <p>We pay our deepest respects to the traditional custodians of this land, past, present and emergent, and to the enduring wisdom of this place that continues to teach, inform and inspire our work.</p>
        </div>
        <div class="footer-block reveal" aria-label="contact">
          <div class="footer-title">connect</div>
          <div class="social-links" aria-label="contact links">
            ${socialLinks.map((link) => `<a href="${link.href}" aria-label="contact studio rjl via ${escapeHtml(link.label)}"><span class="social-icon">${icon(link.icon)}</span>${escapeHtml(link.label === "email" ? site.contact.email : link.label)}</a>`).join("")}
          </div>
          <div class="footer-subsection">
            <div class="footer-title">design partners</div>
            <div class="footer-links">
              ${designPartners.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
            </div>
          </div>
        </div>
        <div class="footer-block reveal">
          <div class="footer-title">studio notes</div>
          <div class="footer-links">
            ${footerLinks.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
          </div>
        </div>
      </div>
      <div class="footer-base reveal">&copy; always, studio rjl.</div>
    </footer>
  `;
}

function enquiryPanel() {
  return `
    <aside class="enquiry-panel" aria-label="Project enquiry form" data-enquiry-panel>
      <button class="enquiry-close" type="button" aria-label="Close enquiry form" data-enquiry-close>x</button>
      <div class="enquiry-inner">
        <h2>ENQUIRIES</h2>
        <p>for all creative enquiries, complete the form below and we will be in touch!</p>
        <form action="${site.formEndpoint}" method="POST" data-enquiry-form>
          <label>name*<input type="text" name="name" required></label>
          <label>brand / business / company*<input type="text" name="company" required></label>
          <label>email*<input type="email" name="email" required></label>
          <label>phone<input type="tel" name="phone"></label>
          <label>location<input type="text" name="location"></label>
          <label>range
            <select name="range">
              <option value="">select a range</option>
              ${budgets.map((budget) => `<option value="${escapeHtml(budget)}">${escapeHtml(budget)}</option>`).join("")}
            </select>
          </label>
          <div hidden>
            <label>website<input type="text" name="website" autocomplete="off" tabindex="-1"></label>
          </div>
          <div class="service-options">
            <p>creative services</p>
            ${services
              .map(
                (service) =>
                  `<label><input type="checkbox" name="service[]" value="${escapeHtml(service)}"> ${escapeHtml(service)}</label>`
              )
              .join("")}
          </div>
          <label>message<textarea name="message" rows="4" placeholder="tell us a little bit about your project..."></textarea></label>
          <input type="hidden" name="_subject" value="new studio rjl enquiry">
          <button class="button" type="submit">send</button>
        </form>
        <div class="thank-you" data-thank-you>
          <h2>thank you!</h2>
          <p>your message has been sent.<br>we will be in touch very soon!</p>
        </div>
      </div>
    </aside>
  `;
}

function layout({
  title,
  description,
  pathname,
  body,
  image,
  imageAlt,
  preloadImage,
  type,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  extraSchema = []
}) {
  const url = canonical(pathname);
  return `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    ${head({
      title,
      description,
      pathname,
      image,
      imageAlt,
      preloadImage,
      type,
      author,
      publishedTime,
      modifiedTime,
      section,
      tags,
      extraSchema
    })}
  </head>
  <body>
    <div class="cursor" aria-hidden="true"></div>
    ${site.googleTagManagerId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${site.googleTagManagerId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : ""}
    ${nav()}
    <main>${body}</main>
    ${type === "article" ? articleRichPinMarkup({ title, description, url, author: author || site.founder }) : ""}
    ${footer()}
    ${enquiryPanel()}
    <script src="/site.js" type="module"></script>
  </body>
</html>`;
}

function articlePage(post) {
  const paragraphs = post.body?.length
    ? post.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
    : `<p>${escapeHtml(post.description)}</p>`;
  const gallery = post.gallery?.length
    ? `<section class="article-gallery" aria-label="${escapeHtml(post.title)} project imagery">
        ${post.gallery
          .map(
            (item) => `
              <figure class="article-gallery-item">
                <img src="${asset(item.image)}" alt="${escapeHtml(item.alt)}"${imageDimensionAttrs(item)} loading="lazy" decoding="async">
              </figure>
            `
          )
          .join("")}
      </section>`
    : "";

  const body = `
    <article class="article-page">
      <header class="page-header">
        <p class="eyebrow">${escapeHtml(post.section || "studio notes")}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="subline">${escapeHtml(post.description)}</p>
        <img class="article-hero reveal" src="${asset(post.image)}" alt="${escapeHtml(post.imageAlt)}"${imageDimensionAttrs({ width: post.imageWidth, height: post.imageHeight })} loading="eager" decoding="async" fetchpriority="high">
      </header>
      <section class="article-body">
        ${paragraphs}
      </section>
      ${gallery}
    </article>
  `;

  return layout({
    title: post.title,
    description: post.description,
    pathname: `/editorial/${post.slug}/`,
    image: asset(post.image),
    imageAlt: post.imageAlt,
    type: "article",
    author: post.author || site.founder,
    publishedTime: post.datePublished,
    modifiedTime: post.dateModified || post.datePublished,
    section: post.section || "branding",
    tags: post.tags || [],
    body,
    extraSchema: [
      articleSchema(post),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "editorial", href: "/editorial/" },
        { name: post.title, href: `/editorial/${post.slug}/` }
      ])
    ]
  });
}

function editorialArticlePage(post) {
  const paragraphs = post.body?.length
    ? post.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")
    : `<p>${escapeHtml(post.description)}</p>`;
  const gallery = post.gallery?.length
    ? `<section class="article-gallery" aria-label="${escapeHtml(post.title)} project imagery">
        ${post.gallery
          .map(
            (item) => `
              <figure class="article-gallery-item">
                <img src="${asset(item.image)}" alt="${escapeHtml(item.alt)}"${imageDimensionAttrs(item)} loading="lazy" decoding="async">
              </figure>
            `
          )
          .join("")}
      </section>`
    : "";

  const body = `
    <article class="article-page editorial-article">
      <header class="editorial-header editorial-article-masthead">
        <a class="editorial-title editorial-title-link" href="/editorial/">EDITORIAL</a>
        <div class="editorial-rule" aria-hidden="true"></div>
      </header>
      <header class="page-header editorial-article-header">
        <p class="eyebrow">${escapeHtml(post.section || "case study")}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="subline">${escapeHtml(post.description)}</p>
        <img class="article-hero reveal" src="${asset(post.image)}" alt="${escapeHtml(post.imageAlt)}"${imageDimensionAttrs({ width: post.imageWidth, height: post.imageHeight })} loading="eager" decoding="async" fetchpriority="high">
      </header>
      <section class="article-body">
        ${paragraphs}
        <button class="button article-enquiry-button" type="button" data-enquiry-toggle>let's collaborate</button>
      </section>
      ${gallery}
    </article>
  `;

  return layout({
    title: post.pinTitle || post.title,
    description: post.pinDescription || post.description,
    pathname: `/editorial/${post.slug}/`,
    image: asset(post.image),
    imageAlt: post.imageAlt,
    type: "article",
    author: post.author || site.founder,
    publishedTime: post.datePublished,
    modifiedTime: post.dateModified || post.datePublished,
    section: post.section || "case study",
    tags: post.tags || [],
    body,
    extraSchema: [
      articleSchema(post, `/editorial/${post.slug}/`),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "editorial", href: "/editorial/" },
        { name: post.title, href: `/editorial/${post.slug}/` }
      ])
    ]
  });
}

function homePage() {
  const body = `
    <section class="hero">
      <div>
        <img
          class="hero-tile arrive"
          src="${asset("studiorjl-tile-hero-640.png")}"
          srcset="${asset("studiorjl-tile-hero-640.png")} 640w, ${asset("studiorjl-tile-hero-960.png")} 960w"
          sizes="(max-width: 720px) 78vw, 520px"
          alt="studio rjl metallic monogram tile"
          width="640"
          height="898"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        >
        <div class="signature arrive arrive-delay-1">design studio</div>
        <h1 class="sr-only">studio rjl</h1>
        <div class="hero-copy" data-typing-group>
          <p data-type-text="crafting bespoke brandscapes"></p>
          <p data-type-text="and making places."></p>
        </div>
      </div>
    </section>
    <section class="image-section" aria-labelledby="recently-heading">
      <div class="intro">
        <h2 id="recently-heading">recently in the studio</h2>
        <p>a collection of recent works and collaborations across branding, visual identity, spatial concept design and atmospheric creative direction.</p>
        <a class="studio-link" href="/portfolio/">explore more...</a>
      </div>
      <div class="project-grid">
        ${featuredProjects
          .map(
            (project) => `
              <article class="project-card">
                <img class="reveal" src="${asset(project.image)}" alt="${escapeHtml(project.alt)}" loading="lazy">
              </article>
            `
          )
          .join("")}
      </div>
    </section>
    <section id="about" aria-labelledby="about-heading">
      <div class="about-wrap">
        <h2 id="about-heading">about studio rjl</h2>
        <p>studio rjl is a multidisciplinary design studio crafting bespoke brands <em>and</em> making places.</p>
        <p>based in the northern rivers of nsw - collaborating worldwide.</p>
        <div class="about-image">
          <img class="reveal" src="${asset("studiorjl-about.png")}" alt="Rebekah Jane, founder of studio rjl" loading="lazy">
        </div>
        <p>Rebekah has worked across architecture, landscapes & interiors, brands, objects & visual identities.</p>
        <p>Her work is guided by a deep love for nature, and is shaped by her reverence for the magic alive in sensory experience; tone, texture & gesture.</p>
        <p>She designs brands like she would create a place; with real atmosphere, detail, depth & personality and <em>a sense of elevated whimsy.</em></p>
      </div>
    </section>
    <section class="dark-band cta-band" aria-labelledby="discovery-heading">
      <div class="intro">
        <h2 id="discovery-heading">begin with a discovery call</h2>
        <p>for brands & placemakers seeking a resonant and authentic atmosphere; immersive, kindred and alive.</p>
        <a class="button" href="/booking/">book a free discovery call</a>
      </div>
    </section>
    <section class="home-info-panels" aria-label="studio rjl services and frequently asked questions">
      <div class="home-panel-wrap">
        <details class="home-panel service-panel">
          <summary>
            <span>creative services</span>
            <em>peruse our creative services</em>
          </summary>
          <p>studio rjl creates bespoke branding, visual identity, digital experiences, art direction and spatial design for brands seeking atmosphere, clarity and resonance.</p>
          <ul>
            ${services.map((service) => `<li>${escapeHtml(service)}</li>`).join("")}
          </ul>
          <a class="studio-link" href="/services/">view creative services...</a>
        </details>
        <details class="home-panel">
          <summary>
            <span>FAQ</span>
          </summary>
          ${faqs
            .slice(0, 4)
            .map(
              (item) => `
                <div class="home-faq-item">
                  <h3>${escapeHtml(item.question)}</h3>
                  <p>${escapeHtml(item.answer)}</p>
                </div>
              `
            )
            .join("")}
          <a class="studio-link" href="/faq/">read the full FAQ...</a>
        </details>
      </div>
    </section>
    <section class="home-closing-mark" aria-label="studio rjl monogram">
      <img class="reveal" src="${asset("RJL_green_transparent.png")}" alt="studio rjl green monogram" width="2052" height="1185" loading="lazy" decoding="async">
    </section>
  `;

  return layout({
    title: site.name,
    description: site.description,
    pathname: "/",
    image: "/assets/studiorjl-tile-hero-960.png",
    imageAlt: "studio rjl metallic monogram tile",
    preloadImage: "/assets/studiorjl-tile-hero-960.png",
    body,
    extraSchema: [breadcrumbSchema([{ name: "home", href: "/" }])]
  });
}

function portfolioPage() {
  const body = `
    <header class="page-header">
      <h1>recent works</h1>
      <p class="subline portfolio-subline" data-type-text="an unfolding collection of spaces, identities and atmospheres." data-type-speed="32"></p>
      <div class="filter-row">
        <label>
          <span class="eyebrow">filter by project type</span><br>
          <select data-filter>
            <option value="all">all projects</option>
            <option value="branding">branding and visual identity</option>
            <option value="graphic">graphic design</option>
            <option value="print">print, packaging and labels</option>
            <option value="interiors">interior design and architecture</option>
          </select>
        </label>
      </div>
    </header>
    <section class="portfolio-grid image-section">
      ${portfolio
        .map(
          (project) => `
            <article class="portfolio-card" data-tags="${project.tags.join(" ")}">
              <div class="portfolio-frame">
                ${
                  project.href
                    ? `<a href="${project.href}" aria-label="View ${escapeHtml(project.alt)} case study"><img class="reveal" src="${asset(project.image)}" alt="${escapeHtml(project.alt)}" loading="lazy"></a>`
                    : `<img class="reveal" src="${asset(project.image)}" alt="${escapeHtml(project.alt)}" loading="lazy">`
                }
              </div>
              <div class="meta">
                <span class="category">filed under</span>
                ${project.categories.map((category) => `<span class="tag">${escapeHtml(category)}</span>`).join("")}
                <a class="read-more${project.href ? "" : " is-hidden"}" href="${project.href || "/project-archive/"}">read more...</a>
              </div>
            </article>
          `
        )
        .join("")}
    </section>
  `;

  return layout({
    title: "recent works",
    description:
      "selected studio rjl work across brand identity, graphic design, interiors, print, packaging, campaign content and spatial concept design.",
    pathname: "/portfolio/",
    body,
    extraSchema: [
      portfolioSchema(),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "recent works", href: "/portfolio/" }
      ])
    ]
  });
}

function editorialPage() {
  const body = `
    <header class="editorial-header">
      <h1 class="editorial-title" data-type-text="EDITORIAL" data-type-speed="24" data-type-cursor="pilcrow" data-type-linger="860"></h1>
      <div class="editorial-rule" aria-hidden="true"></div>
    </header>
    <section class="editorial-section" aria-label="studio rjl editorial case studies">
      <div class="editorial-strip-wrap">
        <div class="editorial-strip" aria-label="editorial articles">
          ${editorialPosts
            .map(
              (post) => `
                <article class="editorial-card">
                  <a href="/editorial/${post.slug}/">
                    <div class="editorial-frame">
                      <img src="${asset(post.image)}" alt="${escapeHtml(post.imageAlt)}" loading="lazy">
                    </div>
                    <h2>${escapeHtml(post.title)}</h2>
                  </a>
                </article>
              `
            )
            .join("")}
        </div>
        <span class="editorial-scroll-cue" aria-hidden="true">→</span>
      </div>
    </section>
  `;

  return layout({
    title: "editorial",
    description:
      "studio rjl editorial case studies exploring branding, visual identity, creative direction, campaign atmosphere and digital brand worlds.",
    pathname: "/editorial/",
    body,
    extraSchema: [
      editorialSchema(),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "editorial", href: "/editorial/" }
      ])
    ]
  });
}

function faqPage() {
  const body = `
    <header class="page-header">
      <h1 class="faq-heading">FAQ</h1>
      <p class="subline">clear answers for founders, brands and creative businesses considering studio rjl.</p>
    </header>
    <section class="faq-list">
      ${faqs
        .map(
          (item) => `
            <details class="faq-item">
              <summary>${escapeHtml(item.question)}</summary>
              <p>${escapeHtml(item.answer)}</p>
            </details>
          `
        )
        .join("")}
    </section>
  `;

  return layout({
    title: "faq",
    description:
      "answers about studio rjl branding, visual identity, spatial design, pinterest-ready content, project fit and enquiries.",
    pathname: "/faq/",
    body,
    extraSchema: [
      faqSchema(),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "faq", href: "/faq/" }
      ])
    ]
  });
}

function bookingPage() {
  const body = `
    <header class="page-header">
      <h1>bookings</h1>
      <p>a complimentary 20 minute strategic clarity session to explore your brand, project or idea.</p>
      <p>we will walk through where you are, what your brand needs most and whether we are aligned to collaborate. you will leave with useful branding insights, a clearer next step and no obligation to continue.</p>
      <iframe class="booking-frame" title="studio rjl booking calendar" src="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0MBxtDccYFfgN_GFlpT0uKReKg6tT77itlql8P3FYlpj9yTO84euJmikEFJSvAJy88fNNJgT3t"></iframe>
    </header>
  `;

  return layout({
    title: "bookings",
    description:
      "book a complimentary studio rjl discovery call to discuss branding, visual identity, interiors, spatial concept design or creative direction.",
    pathname: "/booking/",
    body,
    extraSchema: [
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "bookings", href: "/booking/" }
      ])
    ]
  });
}

function servicesPage() {
  const body = `
    <header class="page-header">
      <h1>creative services</h1>
      <p class="subline services-intro">studio rjl specialises and delights in creating atmosphere and resonance. We work both creatively and strategically in branding & design to translate the essence, instinct, atmosphere, and physical presence of creators and businesses into cohesive brand identities, interiors, and digital experiences — blending intuitive, sensory-led creative direction with clear strategy and thorough, hands-on execution.<br><br><i>Our creative services are diverse and can be tailored to any project...</i><br><i>peruse our creative services below</i></p>
    </header>
    <section class="faq-list service-list" aria-label="creative services">
      ${services.map((service) => `
        <details class="faq-item service-item">
          <summary>${escapeHtml(service)}</summary>
          <p>${escapeHtml(serviceDetails[service])}</p>
        </details>
      `).join("")}
    </section>
  `;

  return layout({
    title: "creative services",
    description:
      "studio rjl creative services include bespoke branding, visual identity, spatial design, interior styling, web design, packaging and creative strategy.",
    pathname: "/services/",
    body,
    extraSchema: [
      serviceSchema(),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "creative services", href: "/services/" }
      ])
    ]
  });
}

function shopPage() {
  const body = `
    <header class="page-header">
      <h1>shop</h1>
      <p class="subline">digital templates & tools for brand clarity, content planning and creative direction.</p>
    </header>
    <section class="shop-grid" aria-label="studio rjl digital templates">
      ${templateProducts
        .map(
          (product) => `
            <article class="shop-card">
              <div class="shop-frame">
                <img src="${asset(product.image)}" alt="${escapeHtml(product.alt)}" loading="lazy">
              </div>
              <h2>${escapeHtml(product.title)}</h2>
              <p>${escapeHtml(product.description)}</p>
              ${
                product.purchaseUrl
                  ? `<a class="read-more" href="${product.purchaseUrl}">view template...</a>`
                  : `<span class="product-status">${escapeHtml(product.status)}</span>`
              }
            </article>
          `
        )
        .join("")}
    </section>
  `;

  return layout({
    title: "shop",
    description:
      "studio rjl digital templates and tools for brand clarity, content planning and creative direction.",
    pathname: "/shop/",
    body,
    extraSchema: [
      shopSchema(),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "shop", href: "/shop/" }
      ])
    ]
  });
}

function blogPage() {
  const body = `
    <header class="page-header">
      <h1>blog</h1>
      <p class="coming-soon">coming soon</p>
    </header>
  `;

  return layout({
    title: "blog",
    description: "studio rjl blog topics on branding, creative direction, web design, pinterest strategy and purpose-led business design.",
    pathname: "/blog/",
    body,
    extraSchema: [
      blogSchema(),
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "blog", href: "/blog/" }
      ])
    ]
  });
}

function plainPage({ title, pathname, body }) {
  return layout({
    title,
    description: `${title} for studio rjl.`,
    pathname,
    body: `<header class="page-header"><h1>${escapeHtml(title)}</h1>${body}</header>`
  });
}

function sitemapPage() {
  const links = [
    { label: "home", href: "/" },
    { label: "recent work", href: "/portfolio/" },
    { label: "editorial", href: "/editorial/" },
    { label: "creative services", href: "/services/" },
    { label: "shop", href: "/shop/" },
    { label: "FAQ", href: "/faq/" },
    { label: "bookings", href: "/booking/" },
    { label: "editorial", href: "/editorial/" },
    ...footerLinks
  ];

  return layout({
    title: "sitemap",
    description: "sitemap for studio rjl.",
    pathname: "/sitemap/",
    body: `<header class="page-header"><h1>sitemap</h1><div class="sitemap-list">${links.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}</div></header>`
  });
}

const pages = [
  ["index.html", homePage()],
  ["portfolio/index.html", portfolioPage()],
  ["editorial/index.html", editorialPage()],
  ...editorialPosts.map((post) => [`editorial/${post.slug}/index.html`, editorialArticlePage(post)]),
  ["services/index.html", servicesPage()],
  ["shop/index.html", shopPage()],
  ["faq/index.html", faqPage()],
  ["booking/index.html", bookingPage()],
  ["blog/index.html", blogPage()],
  ...articlePosts.map((post) => [`blog/${post.slug}/index.html`, articlePage(post)]),
  [
    "project-archive/index.html",
    plainPage({
      title: "project archive",
      pathname: "/project-archive/",
      body: "<p>future project archive pages will describe each client's challenge, the studio rjl process, design decisions and project outcome.</p>"
    })
  ],
  ["sitemap/index.html", sitemapPage()],
  [
    "terms/index.html",
    plainPage({
      title: "terms",
      pathname: "/terms/",
      body: "<p>studio rjl project terms are confirmed in writing before each engagement begins. website content is provided for general information and portfolio reference.</p>"
    })
  ],
  [
    "accessibility/index.html",
    plainPage({
      title: "accessibility",
      pathname: "/accessibility/",
      body: "<p>studio rjl aims to keep this website readable, navigable and accessible. if you find an issue, contact hello@studiorjl.com.</p>"
    })
  ],
  [
    "privacy/index.html",
    plainPage({
      title: "privacy",
      pathname: "/privacy/",
      body: "<p>studio rjl collects enquiry details only so we can respond to project enquiries and booking requests.</p>"
    })
  ]
];

async function copyAssets() {
  await mkdir(assetsOut, { recursive: true });
  const files = await readdir(assetsIn);
  await Promise.all(files.map((file) => copyFile(path.join(assetsIn, file), path.join(assetsOut, file))));
}

async function writeStaticFiles() {
  await writeFile(path.join(dist, "styles.css"), await readFile(path.join(root, "src", "styles.css"), "utf8"));
  await writeFile(path.join(dist, "site.js"), await readFile(path.join(root, "src", "site.js"), "utf8"));
  await writeFile(
    path.join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\n\nSitemap: ${canonical("/sitemap.xml")}\n`
  );
  await writeFile(
    path.join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", "/portfolio/", "/editorial/", "/services/", "/shop/", "/faq/", "/booking/", "/blog/", "/project-archive/", "/sitemap/", "/privacy/", "/terms/", "/accessibility/"]
      .concat(editorialPosts.map((post) => `/editorial/${post.slug}/`))
      .concat(articlePosts.map((post) => `/blog/${post.slug}/`))
      .map((url) => `  <url><loc>${canonical(url)}</loc></url>`)
      .join("\n")}\n</urlset>\n`
  );
  const feedPosts = [
    ...editorialPosts.map((post) => ({ ...post, feedPath: `/editorial/${post.slug}/` })),
    ...articlePosts.map((post) => ({ ...post, feedPath: `/blog/${post.slug}/` }))
  ];

  await writeFile(
    path.join(dist, "feed.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">\n  <channel>\n    <title>${escapeXml(site.name)}</title>\n    <link>${site.domain}</link>\n    <description>${escapeXml(site.description)}</description>\n    <language>en-AU</language>\n    <image>\n      <url>${absoluteAsset("RJL_green_transparent.png")}</url>\n      <title>${escapeXml(site.name)}</title>\n      <link>${site.domain}</link>\n    </image>\n${feedPosts
      .map((post) => {
        const url = canonical(post.feedPath);
        const imageUrl = absoluteAsset(post.image);
        const imageType = mimeTypeFor(post.image);
        return `    <item>\n      <title>${escapeXml(post.pinTitle || post.title)}</title>\n      <link>${url}</link>\n      <guid isPermaLink="true">${url}</guid>\n      <description>${escapeXml(post.pinDescription || post.description)}</description>\n      <pubDate>${new Date(post.datePublished).toUTCString()}</pubDate>\n      <author>${escapeXml(site.contact.email)} (${escapeXml(post.author || site.founder)})</author>\n      <media:content url="${imageUrl}" medium="image" type="${imageType}">\n        <media:title>${escapeXml(post.imageAlt)}</media:title>\n      </media:content>\n      <enclosure url="${imageUrl}" type="${imageType}" />\n    </item>`;
      })
      .join("\n")}\n  </channel>\n</rss>\n`
  );
  await writeFile(
    path.join(dist, "llms.txt"),
    `# ${site.name}\n\n${site.description}\n\n## key pages\n\n- home: ${canonical("/")}\n- recent works: ${canonical("/portfolio/")}\n- editorial: ${canonical("/editorial/")}\n- creative services: ${canonical("/services/")}\n- shop: ${canonical("/shop/")}\n- faq: ${canonical("/faq/")}\n- bookings: ${canonical("/booking/")}\n- blog: ${canonical("/blog/")}\n- project archive: ${canonical("/project-archive/")}\n- sitemap: ${canonical("/sitemap/")}\n\n## contact\n\n- email: ${site.contact.email}\n\n## location\n\n${site.locationSignal}\n\n## services\n\n${services.map((service) => `- ${service}`).join("\n")}\n`
  );
  await writeFile(path.join(dist, "CNAME"), "studiorjl.com\n");
}

async function build() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await copyAssets();
  await Promise.all(
    pages.map(async ([filename, html]) => {
      const out = path.join(dist, filename);
      await mkdir(path.dirname(out), { recursive: true });
      await writeFile(out, html);
    })
  );
  await writeStaticFiles();
}

await build();
console.log("built studio rjl site to dist/");

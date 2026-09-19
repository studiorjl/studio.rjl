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
  offers,
  portfolio,
  propertyPortfolioImages,
  propertyPortfolioNotes,
  primaryServices,
  serviceDetails,
  socialLinks,
  services,
  enquiryServices,
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
  image = "/assets/og-studio-card.jpg",
  imageAlt = "studio rjl — crafting bespoke brandscapes and making places.",
  preloadImage = "/assets/RJL_green_transparent.png",
  type = "website",
  author = site.founder,
  publishedTime = "",
  modifiedTime = "",
  section = "",
  tags = [],
  robots = "index, follow, max-image-preview:large",
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
    <meta name="robots" content="${robots}">
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
    <link rel="stylesheet" href="/styles.css?v=2">
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
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h16v10H4z"/><path d="m4 8 8 6 8-6"/><path class="glyph" d="M12 17.2s-3.2-1.7-3.2-3.7c0-1 .7-1.7 1.6-1.7.7 0 1.2.4 1.6 1 .4-.6.9-1 1.6-1 .9 0 1.6.7 1.6 1.7 0 2-3.2 3.7-3.2 3.7z"/></svg>`;
  }

  if (name === "instagram") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4"/><circle class="glyph" cx="12" cy="12" r="3.2"/><circle cx="16.4" cy="7.8" r="0.8"/></svg>`;
  }

  if (name === "linkedin") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><path class="glyph" d="M6.5 10v8"/><path class="glyph" d="M6.5 6.5v.1"/><path class="glyph" d="M11 18v-8"/><path class="glyph" d="M11 13.4c0-2 1.2-3.4 3.1-3.4 1.8 0 3 1.2 3 3.4V18"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`;
  }

  if (name === "galah") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><path class="mark-solid" fill-rule="evenodd" d="M12.2 6.2 L13.4 6.2 L14.4 6.2 L15.2 6.3 L15.8 6.3 L16.1 6.4 L16.5 6.5 L16.9 6.6 L17.4 6.7 L17.8 6.8 L18.2 7.0 L18.6 7.2 L18.8 7.3 L19.1 7.5 L19.3 7.7 L19.4 7.8 L19.5 7.8 L19.6 7.8 L19.7 7.9 L19.9 8.0 L20.1 8.2 L20.4 8.5 L20.6 8.7 L20.8 9.0 L20.9 9.3 L21.1 9.6 L21.2 9.8 L21.2 10.1 L21.3 10.4 L21.3 10.6 L21.1 10.8 L20.6 11.0 L19.8 11.0 L18.8 11.0 L18.0 11.0 L17.4 10.9 L16.9 10.7 L16.7 10.4 L16.4 10.2 L16.1 10.1 L15.7 9.9 L15.3 9.8 L14.7 9.7 L13.9 9.6 L12.8 9.6 L11.5 9.6 L10.4 9.6 L9.5 9.7 L8.9 9.8 L8.5 9.9 L8.2 10.0 L7.8 10.2 L7.6 10.4 L7.3 10.6 L7.1 10.8 L7.0 11.0 L6.9 11.1 L6.8 11.3 L6.8 11.5 L6.7 11.7 L6.7 12.0 L6.7 12.3 L6.7 12.5 L6.8 12.7 L6.8 12.9 L6.9 13.0 L6.9 13.1 L7.0 13.3 L7.1 13.4 L7.3 13.5 L7.4 13.6 L7.6 13.7 L7.8 13.9 L8.0 14.0 L8.3 14.1 L8.7 14.2 L9.0 14.3 L9.4 14.4 L10.1 14.4 L10.9 14.5 L12.0 14.5 L13.2 14.5 L14.3 14.5 L15.2 14.4 L15.8 14.4 L16.3 14.3 L16.7 14.2 L17.1 14.1 L17.4 14.0 L17.6 13.9 L17.4 13.8 L16.9 13.7 L16.1 13.7 L15.0 13.7 L14.1 13.6 L13.5 13.3 L13.2 13.0 L13.2 12.5 L13.7 12.1 L14.8 11.9 L16.3 11.8 L18.4 11.8 L19.9 12.1 L21.0 12.9 L21.5 14.0 L21.5 15.4 L21.3 16.5 L20.9 17.3 L20.4 17.6 L19.6 17.6 L19.1 17.5 L18.7 17.2 L18.6 16.7 L18.6 16.1 L18.6 15.8 L18.4 15.7 L18.1 15.8 L17.8 16.1 L17.4 16.4 L17.0 16.7 L16.6 16.9 L16.3 17.1 L15.8 17.3 L15.2 17.5 L14.6 17.6 L13.8 17.8 L13.0 17.9 L12.1 17.9 L11.3 17.9 L10.4 17.9 L9.6 17.9 L8.9 17.8 L8.3 17.8 L7.8 17.6 L7.3 17.6 L6.8 17.4 L6.5 17.3 L6.1 17.1 L5.9 17.0 L5.7 17.0 L5.5 16.9 L5.4 16.9 L5.2 16.8 L5.0 16.7 L4.7 16.4 L4.2 16.1 L3.9 15.8 L3.7 15.6 L3.6 15.5 L3.6 15.4 L3.6 15.4 L3.5 15.3 L3.5 15.3 L3.4 15.2 L3.3 15.1 L3.2 15.0 L3.1 14.8 L3.0 14.7 L2.9 14.4 L2.8 14.2 L2.8 13.9 L2.6 13.5 L2.6 13.1 L2.6 12.6 L2.6 12.1 L2.6 11.5 L2.7 11.0 L2.8 10.5 L3.0 10.0 L3.2 9.5 L3.4 9.1 L3.6 8.7 L3.8 8.4 L4.1 8.2 L4.3 8.0 L4.4 7.9 L4.5 7.8 L4.6 7.8 L4.7 7.8 L4.8 7.7 L5.0 7.5 L5.3 7.3 L5.6 7.2 L5.9 7.0 L6.4 6.8 L6.8 6.7 L7.4 6.6 L8.0 6.5 L8.6 6.3 L9.3 6.2 L10.1 6.2 L11.1 6.2 Z"/></svg>`;
  }

  if (name === "person") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><circle class="glyph" cx="12" cy="8" r="3.4"/><path class="glyph" d="M5.5 19c1-3.8 3.6-5.6 6.5-5.6s5.5 1.8 6.5 5.6"/></svg>`;
  }

  if (name === "phone") {
    return `<svg class="social-svg" viewBox="0 0 24 24" aria-hidden="true"><path class="glyph" d="M6.8 3.8c.6 0 1.1.4 1.3 1l.8 2.4c.2.6 0 1.2-.5 1.6l-1.2.9a11.4 11.4 0 0 0 5 5l.9-1.2c.4-.5 1-.7 1.6-.5l2.4.8c.6.2 1 .7 1 1.3v2.2c0 .8-.7 1.5-1.5 1.4C10.4 17.9 6 13.5 5.4 7.3c-.1-.8.6-1.5 1.4-1.5z"/></svg>`;
  }

  if (name === "bloom") {
    return `<svg class="social-svg bloom-svg" viewBox="0 0 24 24" aria-hidden="true"><g class="bulb"><path class="glyph" d="M12 3.2c-2.9 0-5.2 2.3-5.2 5.2 0 1.7.8 3.2 2.1 4.1v1.9c0 .5.4.9.9.9h4.4c.5 0 .9-.4.9-.9v-1.9c1.3-.9 2.1-2.4 2.1-4.1 0-2.9-2.3-5.2-5.2-5.2z"/><path class="glyph" d="M9.6 17.6h4.8M10.2 19.8h3.6"/></g><g class="flower"><circle class="glyph" cx="12" cy="6.6" r="2.3"/><circle class="glyph" cx="16.1" cy="9.6" r="2.3"/><circle class="glyph" cx="14.5" cy="14.4" r="2.3"/><circle class="glyph" cx="9.5" cy="14.4" r="2.3"/><circle class="glyph" cx="7.9" cy="9.6" r="2.3"/><circle class="glyph" cx="12" cy="11" r="1.4"/></g></svg>`;
  }

  return `<svg class="social-svg social-svg-pinterest" viewBox="0 0 24 24" aria-hidden="true"><path class="glyph" d="M11.6 20c.5-1.7 1-3.4 1.5-5.1.4.7 1.2 1.1 2.1 1.1 2.7 0 4.7-2.5 4.7-5.8 0-3.1-2.6-5.7-6.5-5.7-4.8 0-7.3 3.2-7.3 6.5 0 1.7.8 3.5 2.1 4.1.2.1.3 0 .4-.2l.3-1.3c.1-.2 0-.3-.1-.5-.4-.5-.7-1.1-.7-1.9 0-2.5 1.9-4.8 5-4.8 2.7 0 4.4 1.7 4.4 4.1 0 2.8-1.4 4.8-3.3 4.8-1 0-1.8-.9-1.5-1.9.3-1.2.9-2.5.9-3.4 0-.8-.4-1.4-1.3-1.4-1 0-1.8 1-1.8 2.4 0 .9.3 1.5.3 1.5l-1.2 5c-.3 1.3-.3 2.7-.2 3.7.7-.9 1.7-2.2 2.2-3.2z"/></svg>`;
}

function footer() {
  return `
    <footer>
      <style>
        .social-svg .glyph { transition: fill 0.2s ease, stroke 0.2s ease; }
        .social-links a:hover .social-svg .glyph { fill: var(--deep-green); stroke: var(--deep-green); stroke-width: 2; }
        .footer-links a:hover .social-icon { background: var(--ivory); border-color: var(--gold); color: var(--gold); }
        .footer-links a:hover .social-svg .glyph { fill: var(--deep-green); stroke: var(--deep-green); }
      </style>
      <div class="footer-grid">
        <div class="footer-block reveal">
          <div class="footer-title">studio rjl</div>
          <p>${escapeHtml(site.locationSignal)}</p>
          <p>${escapeHtml(site.foundingPlace)}</p>
          <p>We pay our deepest respects to the traditional custodians of this land, past, present and emergent, and to the enduring wisdom of this place that continues to teach, inform and inspire our work.</p>
        </div>
        <div class="footer-block reveal" aria-label="contact">
          <a class="footer-title footer-title-link" href="/contact/">contact</a>
          <div class="social-links" aria-label="contact studio rjl">
            <a href="mailto:${site.contact.email}" aria-label="email studio rjl at ${escapeHtml(site.contact.email)}"><span class="social-icon">${icon("mail")}</span>${escapeHtml(site.contact.email)}</a>
            <a href="/booking/" aria-label="book a complimentary brand strategy call with studio rjl"><span class="social-icon">${icon("phone")}</span>book a call</a>
            <button class="footer-enquiry" type="button" data-enquiry-toggle data-enquiry-bloom aria-label="inquire to work with studio rjl"><span class="social-icon">${icon("bloom")}</span>inquire to work with us</button>
          </div>
        </div>
        <div class="footer-block reveal" aria-label="connect">
          <div class="footer-title">connect</div>
          <div class="social-links" aria-label="studio rjl socials">
            ${socialLinks.map((link) => `<a href="${link.href}" aria-label="follow studio rjl on ${escapeHtml(link.label)}"><span class="social-icon">${icon(link.icon)}</span>${escapeHtml(link.label)}</a>`).join("")}
          </div>
          <div class="footer-subsection">
            <div class="footer-title">design partners</div>
            <div class="footer-links">
              ${designPartners.map((link) => `<a href="${link.href}">${link.icon ? `<span class="social-icon">${icon(link.icon)}</span>` : ""}${escapeHtml(link.label)}</a>`).join("")}
            </div>
          </div>
        </div>
        <div class="footer-block reveal" aria-label="client portal">
          <a class="client-login" href="/client/"><span class="social-icon">${icon("person")}</span>client log in</a>
        </div>
        <div class="footer-block reveal">
          <div class="footer-title">studio notes</div>
          <div class="footer-links">
            ${footerLinks.map((link) => `<a href="${link.href}">${escapeHtml(link.label)}</a>`).join("")}
          </div>
        </div>
      </div>
      <div class="footer-base reveal">&copy; always, studio rjl.<br><br>all rights reserved.</div>
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
        <form data-enquiry-form>
          <label>name*<input type="text" name="name" required></label>
          <label>brand / business / company*<input type="text" name="company" required></label>
          <label>email*<input type="email" name="email" required></label>
          <label>phone<input type="tel" name="phone"></label>
          <label>location<input type="text" name="location"></label>
          <label>creative services</label>
          <details class="home-panel enquiry-services">
            <summary>
              <span class="enquiry-placeholder" data-placeholder="select all that apply">select all that apply</span>
            </summary>
            <div class="service-options">
              ${enquiryServices
                .map(
                  (service) =>
                    `<label><input type="checkbox" name="service[]" value="${escapeHtml(service)}"> ${escapeHtml(service)}</label>`
                )
                .join("")}
            </div>
          </details>
          <label>range</label>
          <details class="home-panel enquiry-services enquiry-range">
            <summary>
              <span class="enquiry-placeholder" data-placeholder="select a range">select a range</span>
            </summary>
            <div class="service-options">
              ${budgets
                .map(
                  (budget) =>
                    `<label><input type="radio" name="range" value="${escapeHtml(budget)}"> ${escapeHtml(budget)}</label>`
                )
                .join("")}
            </div>
          </details>
          <div hidden>
            <label>website<input type="text" name="website" autocomplete="off" tabindex="-1"></label>
          </div>
          <label>message<textarea name="message" rows="4" placeholder="tell us a little bit about your project..."></textarea></label>
          <button class="button" type="submit">send</button>
        </form>
        <div class="thank-you" data-thank-you>
          <h2>thank you!</h2>
          <p>your message has been sent.<br>we will be in touch very soon!</p>
        </div>
        <script>
          (function () {
            document.querySelectorAll(".enquiry-services .service-options input").forEach(function (input) {
              input.addEventListener("change", function () {
                var details = input.closest("details");
                var ph = details.querySelector(".enquiry-placeholder");
                if (!ph) return;
                if (input.type === "radio") {
                  if (input.checked) ph.textContent = input.value;
                } else {
                  var n = details.querySelectorAll(".service-options input:checked").length;
                  ph.textContent = n ? n + " selected" : ph.getAttribute("data-placeholder");
                }
              });
            });
            document.querySelectorAll("[data-enquiry-form] input[required]").forEach(function (el) {
              el.addEventListener("invalid", function (e) {
                e.preventDefault();
                var wrap = el.parentElement;
                var oldErr = wrap.querySelector(".enquiry-error");
                if (oldErr) oldErr.remove();
                var div = document.createElement("div");
                div.className = "enquiry-error";
                div.textContent = el.type === "email" && el.value ? "please enter a valid email address" : "please fill in this field";
                wrap.appendChild(div);
              });
              el.addEventListener("input", function () {
                var oldErr = el.parentElement.querySelector(".enquiry-error");
                if (oldErr) oldErr.remove();
              });
            });
          })();
        </script>
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
  robots,
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
      robots,
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
    <script src="/site.js?v=4" type="module"></script>
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
          sizes="(max-width: 720px) 58vw, 293px"
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
    image: "/assets/og-studio-card.jpg",
    imageAlt: "studio rjl metallic monogram tile",
    preloadImage: "/assets/studiorjl-tile-hero-960.png",
    body,
    extraSchema: [breadcrumbSchema([{ name: "home", href: "/" }])]
  });
}

export const portfolioCategories = [
  { slug: "branding", tag: "branding", label: "branding and visual identity" },
  { slug: "graphic", tag: "graphic", label: "graphic design" },
  { slug: "print", tag: "print", label: "print, packaging and labels" },
  { slug: "interiordesign", tag: "interiors", label: "interior design and architecture" }
];

function portfolioPage(category) {
  const projects = category ? portfolio.filter((project) => project.tags.includes(category.tag)) : portfolio;
  const subline = category
    ? `filed under — ${category.label}`
    : "an unfolding collection of spaces, identities and atmospheres.";
  const body = `
    <header class="page-header">
      <h1>recent works</h1>
      <p class="subline portfolio-subline" data-type-text="${escapeHtml(subline)}" data-type-speed="32"></p>
      <div class="filter-row">
        <span class="eyebrow">filter by project type</span>
        <details class="home-panel portfolio-filter" data-filter-panel>
          <summary>
            <span class="filter-placeholder" data-filter-label>all projects</span>
          </summary>
          <div class="service-options">
            ${portfolioCategories
              .map(
                (c) =>
                  `<label><input type="checkbox" name="filter" value="${c.tag}" data-label="${escapeHtml(c.label)}"${category && category.tag === c.tag ? " checked" : ""}> ${escapeHtml(c.label)}</label>`
              )
              .join("")}
          </div>
        </details>
      </div>
    </header>
    <section class="portfolio-grid image-section">
      ${projects
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
    title: category ? `recent works — ${category.label}` : "recent works",
    description: category
      ? `selected studio rjl ${category.label} work — a focused collection from an unfolding body of projects.`
      : "selected studio rjl work across brand identity, graphic design, interiors, print, packaging, campaign content and spatial concept design.",
    pathname: category ? `/portfolio/${category.slug}/` : "/portfolio/",
    body,
    extraSchema: [
      portfolioSchema(),
      breadcrumbSchema(
        category
          ? [
              { name: "home", href: "/" },
              { name: "recent works", href: "/portfolio/" },
              { name: category.label, href: `/portfolio/${category.slug}/` }
            ]
          : [
              { name: "home", href: "/" },
              { name: "recent works", href: "/portfolio/" }
            ]
      )
    ]
  });
}

// private property pitch portfolio — lives at /portfolio/property/ and is shared
// by url with property clients only. deliberately unlinked (no nav, portfolio
// or sitemap entry) and marked noindex. images are the architecture + interiors
// placeholders until the real project set arrives; notes are placeholder copy
// Rebekah will replace — one text block sits under every three images.
function propertyPortfolioPage() {
  const cards = propertyPortfolioImages.map(
    (item) => `
      <article class="portfolio-card">
        <div class="portfolio-frame">
          <img class="reveal" src="${asset(item.image)}" alt="${escapeHtml(item.alt)}" loading="lazy">
        </div>
        ${
          item.categories?.length
            ? `<div class="meta"><span class="category">filed under</span>${item.categories.map((c) => `<span class="tag">${escapeHtml(c)}</span>`).join("")}</div>`
            : ""
        }
      </article>
    `
  );

  const rows = [];
  for (let i = 0; i < cards.length; i += 3) {
    rows.push(cards.slice(i, i + 3).join(""));
  }

  const sections = rows
    .map(
      (row, i) => `
        <section class="portfolio-grid image-section">${row}</section>
        ${
          propertyPortfolioNotes[i]
            ? `<div class="article-body property-note">${propertyPortfolioNotes[i].paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}</div>`
            : ""
        }
      `
    )
    .join("");

  const body = `
    <header class="page-header">
      <h1>property</h1>
      <p class="subline portfolio-subline" data-type-text="an unfolding collection of places, spaces and atmospheres." data-type-speed="32"></p>
    </header>
    ${sections}
  `;

  return layout({
    title: "property",
    description:
      "a private studio rjl portfolio for property partners — spatial brandscapes, interiors and atmospheric placemaking for developments, venues and places with soul.",
    pathname: "/portfolio/property/",
    robots: "noindex, nofollow",
    body
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

function offersPage() {
  const body = `
    <header class="editorial-header">
      <h1 class="editorial-title" data-type-text="OFFERS" data-type-speed="24" data-type-cursor="pilcrow" data-type-linger="860"></h1>
      <div class="editorial-rule" aria-hidden="true"></div>
    </header>
    <section class="editorial-section" aria-label="studio rjl offers">
      <div class="editorial-strip-wrap">
        <div class="editorial-strip" aria-label="studio rjl offers">
          ${offers
            .map(
              (offer) => `
                <article class="editorial-card offer-card">
                  <a href="/offers/${offer.slug}/">
                    <div class="editorial-frame">
                      <img src="${asset(offer.image)}" alt="${escapeHtml(offer.imageAlt)}" loading="lazy">
                    </div>
                    <h2>${escapeHtml(offer.title)}</h2>
                    <p class="offer-card-price">${escapeHtml(offer.priceLine)}</p>
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
    title: "offers",
    description:
      "studio rjl offers — the brandscape starter kit, and bespoke brandscapes from $5,000 (AUD).",
    pathname: "/offers/",
    body,
    extraSchema: [
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "offers", href: "/offers/" }
      ])
    ]
  });
}

function offerPage(offer) {
  const body = `
    <header class="page-header">
      <p class="subline">${escapeHtml(offer.eyebrow)}</p>
      <h1>${escapeHtml(offer.title)}</h1>
      <p class="subline">${escapeHtml(offer.tagline)}</p>
    </header>
    <section class="article-body offer-body">
      <div class="offer-hero-frame editorial-frame">
        <img src="${asset(offer.image)}" alt="${escapeHtml(offer.imageAlt)}" loading="lazy">
      </div>
      ${offer.summary.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n      ")}
      ${offer.steps.length
        ? `<h2>how it works</h2>
      ${offer.steps
        .map((step, index) => `<p><strong>${index + 1}. ${escapeHtml(step.title)}</strong> — ${escapeHtml(step.text)}</p>`)
        .join("")}`
        : ""}
      ${offer.includes.length ? `<h2>what arrives</h2>
      <ul>
        ${offer.includes.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>` : ""}
      ${offer.notes?.length ? `<h2>the details</h2>
      <ul class="offer-notes">
        ${offer.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
      </ul>` : ""}
      <p class="offer-price-line">${escapeHtml(offer.priceLine)}</p>
      <a class="button" href="${offer.ctaHref}">${escapeHtml(offer.ctaLabel)}</a>
      ${offer.enquireLabel ? `<a class="offer-enquire" href="${offer.enquireHref}">${escapeHtml(offer.enquireLabel)}</a>` : ""}
      ${offer.ctaNote ? `<p class="offer-cta-note">${escapeHtml(offer.ctaNote)}</p>` : ""}
    </section>
  `;

  return layout({
    title: offer.title,
    description: `${offer.title} — ${offer.tagline}`,
    pathname: `/offers/${offer.slug}/`,
    body,
    extraSchema: [
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "offers", href: "/offers/" },
        { name: offer.title, href: `/offers/${offer.slug}/` }
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

function contactPage() {
  const body = `
    <header class="page-header">
      <h1>contact</h1>
      <p>three ways to reach the studio — whichever suits you best.</p>
    </header>
    <section class="contact-options" aria-label="ways to contact studio rjl">
      <a class="contact-option" href="mailto:${site.contact.email}">
        <span class="social-icon">${icon("mail")}</span>
        <span>
          <span class="contact-option-title">email the studio</span>
          <span class="contact-option-sub">${escapeHtml(site.contact.email)} — for every kind of question, big or small. We reply personally.</span>
        </span>
      </a>
      <a class="contact-option" href="/booking/">
        <span class="social-icon">${icon("phone")}</span>
        <span>
          <span class="contact-option-title">book a call</span>
          <span class="contact-option-sub">a complimentary brand strategy call — free, honest, with no obligation to continue.</span>
        </span>
      </a>
      <button class="contact-option" type="button" data-enquiry-toggle data-enquiry-bloom>
        <span class="social-icon">${icon("bloom")}</span>
        <span>
          <span class="contact-option-title">inquire to work with us</span>
          <span class="contact-option-sub">tell us about your brand, your place, your project — and we will be in touch.</span>
        </span>
      </button>
    </section>
  `;

  return layout({
    title: "contact",
    description:
      "contact studio rjl — email hello@studiorjl.com, book a complimentary brand strategy call, or enquire to work with us on your brandscape.",
    pathname: "/contact/",
    body,
    extraSchema: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "contact studio rjl",
        url: canonical("/contact/"),
        description:
          "three ways to reach studio rjl: email the studio, book a complimentary brand strategy call, or enquire to work with us.",
        mainEntity: {
          "@type": "ProfessionalService",
          name: site.name,
          url: site.domain,
          email: site.contact.email,
          areaServed: site.region,
          sameAs: site.sameAs,
          contactPoint: [
            {
              "@type": "ContactPoint",
              contactType: "enquiries",
              email: site.contact.email,
              availableLanguage: "English",
              areaServed: site.region
            },
            {
              "@type": "ContactPoint",
              contactType: "appointments",
              url: canonical("/booking/"),
              availableLanguage: "English",
              areaServed: site.region
            }
          ]
        }
      },
      breadcrumbSchema([
        { name: "home", href: "/" },
        { name: "contact", href: "/contact/" }
      ])
    ]
  });
}

function bookingPage() {
  const body = `
    <header class="page-header">
      <h1>bookings</h1>
      <p>a complimentary brand strategy call — free, honest, with no obligation to continue.</p>
      <p>bring your brand, your project, or the idea you keep circling back to. you will receive an honest appraisal of where your brand stands, and clear direction on where it could go next — insight that is yours to keep, either way.</p>
      <iframe class="booking-frame" title="studio rjl booking calendar" src="https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ0MBxtDccYFfgN_GFlpT0uKReKg6tT77itlql8P3FYlpj9yTO84euJmikEFJSvAJy88fNNJgT3t"></iframe>
    </header>
  `;

  return layout({
    title: "bookings",
    description:
      "book a complimentary studio rjl brand strategy call — an honest appraisal and clear direction for your brand, with no obligation to continue.",
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

function confirmPage() {
  // transactional page for booking-confirmation emails: reads ?t= and ?step=,
  // confirms against the booking service, and renders the message on studio soil.
  // kept out of the sitemap and marked noindex — it is a private landing moment.
  return `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>booking confirmation - studio rjl</title>
    <meta name="description" content="confirm your studio rjl brand strategy call.">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/png" href="/assets/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      :root { --green: #4c3b15; --deep-green: #3f3112; --ivory: #eae4da; --pale-ivory: #f8f4ec; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: var(--ivory); color: var(--green); display: grid; place-items: center; padding: 48px 24px; }
      a { color: var(--green); text-decoration: none; }
      .mark { position: fixed; top: 28px; left: 32px; font-family: "Cormorant Infant", Georgia, serif; font-size: 20px; letter-spacing: 0.08em; }
      .wrap { max-width: 560px; text-align: center; }
      h1 { font-family: "Cormorant Infant", Georgia, serif; font-weight: 300; font-size: 34px; letter-spacing: 0.02em; margin: 0 0 26px; }
      #message { font-family: "Cormorant Infant", Georgia, serif; font-size: 19px; line-height: 1.9; }
      #message p { margin: 0 0 16px; }
      #message a { text-decoration: underline; text-underline-offset: 3px; }
      .footnote { margin-top: 40px; font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 0.06em; opacity: 0.6; }
    </style>
  </head>
  <body>
    <a class="mark" href="/" aria-label="studio rjl home">studio rjl</a>
    <div class="wrap">
      <h1 id="confirm-title">confirming&hellip;</h1>
      <div id="message"><p>one moment while we confirm your call.</p></div>
      <p class="footnote"><a href="/">studiorjl.com</a></p>
    </div>
    <noscript>
      <div class="wrap">
        <h1>almost there</h1>
        <div id="message"><p>please enable javascript to confirm your call, or write to <a href="mailto:hello@studiorjl.com">hello@studiorjl.com</a>.</p></div>
      </div>
    </noscript>
    <script>
      (function () {
        var params = new URLSearchParams(window.location.search);
        var t = params.get("t");
        var step = params.get("step") === "2" ? "2" : "1";
        var cancel = params.get("cancel") === "1" ? "&cancel=1" : "";
        var title = document.getElementById("confirm-title");
        var message = document.getElementById("message");
        if (!t) {
          title.textContent = "hmm \u2014 this link seems incomplete";
          message.innerHTML = "<p>the link may have been clipped in your email \u2014 try it again, or write to <a href='mailto:hello@studiorjl.com'>hello@studiorjl.com</a>.</p>";
          return;
        }
        var url = "https://rjl-publisher-insights-agent-a07f3048.base44.app/functions/confirmBookingCall?format=json&step=" + step + cancel + "&t=" + encodeURIComponent(t);
        fetch(url).then(function (res) { return res.json(); }).then(function (data) {
          title.textContent = data.title;
          message.innerHTML = data.message_html;
        }).catch(function () {
          title.textContent = "hmm \u2014 something went sideways";
          message.innerHTML = "<p>we couldn't reach the confirmation just now. try the link again in a moment, or write to <a href='mailto:hello@studiorjl.com'>hello@studiorjl.com</a>.</p>";
        });
      })();
    </script>
  </body>
</html>`;
}

function questionnairePage() {
  // questionnaire landing for tailored-brandscape buyers: arrives via the welcome
  // email link (name/email prefilled), answers POST to the studio service and land
  // in Rebekah's inbox. noindex + out of the sitemap — a private landing moment.
  const QUESTIONS = [
    ["q1", "tell me about your work — what are you making, and for whom?"],
    ["q2", "your brand as it stands: what do you love about it, and what's quietly not working?"],
    ["q3", "three words for the feeling your brand should carry."],
    ["q4", "whose world do you admire? (brands, places, makers — links welcome.)"],
    ["q5", "any must-keeps — an existing logo, fonts, colours you're attached to?"],
    ["q6", "where will the brandscape live first? (web, print, packaging, socials.)"],
    ["q7", "anything else at all."]
  ];
  const fields = QUESTIONS.map(([id, label]) => `
      <label class="q-label" for="${id}">${label}</label>
      <textarea class="q-input" id="${id}" rows="4" placeholder="&nbsp;"></textarea>`).join("");
  return `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>the questionnaire - studio rjl</title>
    <meta name="description" content="your tailored brandscape begins here — tell Rebekah about your work, your brand and the feeling it should carry.">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/png" href="/assets/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      :root { --green: #4c3b15; --deep-green: #3f3112; --ivory: #eae4da; --pale-ivory: #f8f4ec; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: var(--ivory); color: var(--green); padding: 64px 24px; font-family: "Courier New", monospace; font-size: 14px; line-height: 1.75; }
      a { color: var(--green); }
      .mark { position: fixed; top: 28px; left: 32px; font-family: "Cormorant Infant", Georgia, serif; font-size: 20px; letter-spacing: 0.08em; text-decoration: none; }
      .wrap { max-width: 620px; margin: 0 auto; }
      h1 { font-family: "Cormorant Infant", Georgia, serif; font-weight: 300; font-size: 36px; letter-spacing: 0.02em; margin: 0 0 18px; }
      .intro { font-family: "Cormorant Infant", Georgia, serif; font-size: 18px; line-height: 1.8; margin: 0 0 36px; }
      .q-label { display: block; font-family: "Cormorant Infant", Georgia, serif; font-size: 19px; margin: 30px 0 8px; color: var(--deep-green); }
      .q-input { display: block; width: 100%; padding: 12px 14px; font-family: "Courier New", monospace; font-size: 14px; line-height: 1.7; color: var(--green); background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.35); border-radius: 2px; resize: vertical; }
      .q-input:focus { outline: 1px solid var(--deep-green); }
      .meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
      .meta-label { display: block; font-family: "Cormorant Infant", Georgia, serif; font-size: 19px; margin: 0 0 8px; color: var(--deep-green); }
      .send { margin: 38px 0 0; background: var(--deep-green); color: var(--ivory); padding: 15px 34px; border: 0; font-family: "Courier New", monospace; font-size: 13px; letter-spacing: 0.08em; cursor: pointer; }
      .send:disabled { opacity: 0.5; cursor: wait; }
      .footnote { margin-top: 40px; font-size: 12px; letter-spacing: 0.06em; opacity: 0.6; }
      #done { display: none; text-align: center; padding: 32px 0 8px; }
      #done h1 { margin-bottom: 10px; }
      @media (max-width: 560px) { .meta-row { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <a class="mark" href="/" aria-label="studio rjl home">studio rjl</a>
    <div class="wrap">
      <div id="form-wrap">
        <h1>the questionnaire</h1>
        <p class="intro">a few questions so I can see your work through your eyes — as much or as little as you like. rambling is welcome; the more soul, the better.</p>
        <form id="questionnaire">
          <div class="meta-row">
            <div><label class="meta-label" for="cname">your name</label><input class="q-input" id="cname" rows="1" style="resize:none;"></div>
            <div><label class="meta-label" for="cemail">your email</label><input class="q-input" id="cemail" type="email" rows="1" style="resize:none;"></div>
          </div>${fields}
          <button class="send" id="send" type="submit">send my answers</button>
        </form>
        <p class="footnote">prefer to talk instead? just reply to the welcome email — or <a href="/">wander home to studiorjl.com</a>.</p>
      </div>
      <div id="done">
        <h1>thank you</h1>
        <p class="intro">your answers are on their way to Rebekah — keep an eye on your inbox for your booking link.</p>
      </div>
    </div>
    <script>
      (function () {
        var params = new URLSearchParams(window.location.search);
        if (params.get("name")) document.getElementById("cname").value = params.get("name");
        if (params.get("email")) document.getElementById("cemail").value = params.get("email");
        document.getElementById("questionnaire").addEventListener("submit", function (e) {
          e.preventDefault();
          var btn = document.getElementById("send");
          btn.disabled = true; btn.textContent = "sending…";
          var payload = {
            name: document.getElementById("cname").value.trim(),
            email: document.getElementById("cemail").value.trim(),
            answers: {}
          };
          ${JSON.stringify(QUESTIONS).replace(/\n/g, " ")}.forEach(function (pair) {
            payload.answers[pair[0]] = document.getElementById(pair[0]).value.trim();
          });
          fetch("https://rjl-publisher-insights-agent-a07f3048.base44.app/functions/submitQuestionnaire?format=json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).then(function (res) { return res.json(); }).then(function (data) {
            if (data.ok) {
              document.getElementById("form-wrap").style.display = "none";
              document.getElementById("done").style.display = "block";
            } else { throw new Error("not ok"); }
          }).catch(function () {
            btn.disabled = false; btn.textContent = "try again — or just reply to the welcome email";
          });
        });
      })();
    </script>
  </body>
</html>`;
}


// ---------------------------------------------------------------------------
// studio rjl client portal — login page (/client/)
// standalone page (no site.js, no right-click blocking): the client signs in
// with their email + password; a session token is stored and they are taken
// through to /client/portal/. "your brand awaits…" is the reveal moment.
function clientLoginPage() {
  return `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>client portal - studio rjl</title>
    <meta name="description" content="the studio rjl client portal — sign in to your private brand home.">
    <link rel="icon" type="image/png" href="/assets/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet">
    <style>
      :root { --green: #4c3b15; --deep-green: #3f3112; --ivory: #eae4da; --pale-ivory: #f8f4ec; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: var(--ivory); color: var(--green); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; font-family: "Courier New", monospace; font-size: 14px; line-height: 1.75; }
      .mark { position: fixed; top: 28px; left: 32px; font-family: "Courier New", monospace; font-size: 16px; letter-spacing: 0.12em; text-decoration: none; color: var(--green); }
      .wrap { width: 100%; max-width: 420px; text-align: center; }
      .presents { font-family: "Cormorant Infant", Georgia, serif; font-size: 15px; letter-spacing: 0.28em; color: var(--deep-green); margin: 0 0 26px; }
      h1 { font-family: "Cormorant Infant", Georgia, serif; font-weight: 300; font-style: italic; font-size: 44px; letter-spacing: 0.02em; margin: 0 0 18px; color: var(--deep-green); }
      .intro { font-family: "Cormorant Infant", Georgia, serif; font-size: 18px; line-height: 1.8; margin: 0 0 34px; }
      .field { text-align: left; margin-bottom: 24px; }
      .label { display: block; font-family: "Cormorant Infant", Georgia, serif; font-size: 18px; margin: 0 0 6px; color: var(--deep-green); }
      .input { display: block; width: 100%; padding: 12px 14px; font-family: "Courier New", monospace; font-size: 14px; color: var(--green); background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.35); border-radius: 2px; }
      .input:focus { outline: 1px solid var(--deep-green); }
      .enter { margin: 40px 0 0; width: 100%; background: var(--deep-green); color: var(--ivory); padding: 15px 34px; border: 0; font-family: "Courier New", monospace; font-size: 13px; letter-spacing: 0.08em; cursor: pointer; }
      .enter:disabled { opacity: 0.5; cursor: wait; }
      #err { display: none; margin: 18px 0 0; font-size: 13px; color: #7a2d2d; }
      .footnote { margin-top: 44px; font-size: 12px; letter-spacing: 0.06em; opacity: 0.6; }
      .footnote a { color: var(--green); }
    </style>
  </head>
  <body>
    <a class="mark" href="/" aria-label="studio rjl home">studio rjl</a>
    <div class="wrap">
      <h1>client portal</h1>
      <p class="intro">everything lives in your own private client portal — sign in to step inside.</p>
      <form id="login" autocomplete="on">
        <div class="field">
          <label class="label" for="email">username</label>
          <input class="input" id="email" type="email" autocomplete="username" required>
        </div>
        <div class="field">
          <label class="label" for="password">password</label>
          <input class="input" id="password" type="password" autocomplete="current-password" required>
        </div>
        <button class="enter" id="enter" type="submit">enter</button>
        <p id="err">hmm — that username or password isn't recognised. try again, or email <a href="mailto:hello@studiorjl.com" style="color:#7a2d2d;">hello@studiorjl.com</a>.</p>
      </form>
      <p class="footnote">private to you · <a href="https://studiorjl.com">studiorjl.com</a></p>
    </div>
    <script>
      (function () {
        var API = "https://rjl-publisher-insights-agent-a07f3048.base44.app/functions";
        document.getElementById("login").addEventListener("submit", function (e) {
          e.preventDefault();
          var btn = document.getElementById("enter");
          btn.disabled = true; btn.textContent = "opening…";
          fetch(API + "/portalLogin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: document.getElementById("email").value.trim(),
              password: document.getElementById("password").value
            })
          }).then(function (r) { return r.json(); }).then(function (d) {
            if (d.ok) {
              try { sessionStorage.setItem("rjl_portal_token", d.token); } catch (err) {}
              location.href = "/client/portal/";
            } else {
              btn.disabled = false; btn.textContent = "enter";
              document.getElementById("err").style.display = "block";
            }
          }).catch(function () {
            btn.disabled = false; btn.textContent = "enter";
            document.getElementById("err").style.display = "block";
          });
        });
      })();
    </script>
  </body>
</html>`;
}


// ---------------------------------------------------------------------------
// studio rjl client portal — the portal itself (/client/portal/)
// standalone page (no site.js, right-click and saving enabled on purpose —
// these are the client's own brand assets). the page renders nothing until a
// valid session token returns the client's curated content from the studio
// backend; no token, no content ever reaches the browser.
function clientPortalPage() {
  return `<!DOCTYPE html>
<html lang="en-AU">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>your brandscape - studio rjl client portal</title>
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/png" href="/assets/favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Infant:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet">
    <style>
      :root { --green: #4c3b15; --deep-green: #3f3112; --ivory: #eae4da; --pale-ivory: #f8f4ec; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: var(--ivory); color: var(--green); font-family: "Courier New", monospace; font-size: 14px; line-height: 1.75; }
      a { color: var(--green); }
      .mark { position: fixed; top: 28px; left: 32px; font-family: "Courier New", monospace; font-size: 16px; letter-spacing: 0.12em; text-decoration: none; z-index: 30; }
      .menu-btn { position: fixed; top: 24px; right: 32px; z-index: 30; background: var(--deep-green); color: var(--ivory); border: 0; padding: 10px 22px; font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 0.1em; cursor: pointer; }
      .menu-btn:hover { opacity: 0.85; }
      .menu-panel { position: fixed; top: 66px; right: 32px; z-index: 29; width: 248px; background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.35); box-shadow: 0 10px 30px rgba(76,59,21,0.18); padding: 10px 0 6px; display: none; }
      .menu-panel.open { display: block; }
      .menu-item { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 10px 22px; font-family: "Courier New", monospace; font-size: 13px; letter-spacing: 0.05em; color: var(--green); cursor: pointer; }
      .menu-item:hover { background: var(--deep-green); color: var(--ivory); }
      .menu-item.active { font-weight: bold; }
      .menu-divider { height: 1px; background: rgba(76,59,21,0.2); margin: 8px 22px; }
      .wrap { max-width: 880px; margin: 0 auto; padding: 96px 24px 96px; }
      #loading { text-align: center; padding: 120px 0; font-family: "Cormorant Infant", Georgia, serif; font-style: italic; font-size: 20px; }
      .hero { text-align: center; margin-bottom: 10px; }
      .brand { font-family: "Cormorant Infant", Georgia, serif; font-weight: 300; font-size: 54px; letter-spacing: 0.02em; margin: 0 0 10px; color: var(--deep-green); line-height: 1.1; }
      .hero-line { font-size: 13px; opacity: 0.7; margin: 0; }
      .chips { text-align: center; margin: 30px 0 8px; line-height: 2.4; }
      .chips a { display: inline-block; font-size: 12px; letter-spacing: 0.05em; text-decoration: none; padding: 3px 12px; margin: 0 3px; border: 1px solid rgba(76,59,21,0.3); border-radius: 999px; background: var(--pale-ivory); }
      .chips a:hover { background: var(--deep-green); color: var(--ivory); }
      .view { display: none; }
      .view.on { display: block; }
      section { margin-top: 56px; scroll-margin-top: 24px; }
      h2 { font-family: "Cormorant Infant", Georgia, serif; font-weight: 400; font-size: 30px; color: var(--deep-green); margin: 0 0 6px; }
      .section-line { font-family: "Cormorant Infant", Georgia, serif; font-style: italic; font-size: 17px; margin: 0 0 22px; opacity: 0.8; }
      .empty { font-style: italic; opacity: 0.55; font-size: 13px; padding: 26px 22px; text-align: center; background: var(--pale-ivory); border: 1px dashed rgba(76,59,21,0.3); }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 18px; }
      .card { background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.25); padding: 14px; }
      .swatch { height: 96px; margin: -14px -14px 12px; border-bottom: 1px solid rgba(76,59,21,0.25); }
      .card-title { font-family: "Cormorant Infant", Georgia, serif; font-size: 19px; color: var(--deep-green); margin: 0 0 4px; }
      .meta { font-size: 12px; opacity: 0.75; word-break: break-word; white-space: pre-wrap; }
      .asset { width: 100%; display: block; background: #fff; }
      .logo-hero { background: #fff; border: 1px solid rgba(76,59,21,0.25); padding: 34px; text-align: center; margin-bottom: 14px; }
      .logo-hero img { max-width: 100%; max-height: 220px; display: block; margin: 0 auto; }
      .variants { text-align: center; margin: 0 0 18px; line-height: 2.2; }
      .variant { display: inline-block; font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 0.05em; padding: 4px 16px; margin: 0 3px; border: 1px solid rgba(76,59,21,0.3); border-radius: 999px; background: var(--pale-ivory); color: var(--green); cursor: pointer; }
      .variant:hover { background: var(--deep-green); color: var(--ivory); }
      .variant.active { background: var(--deep-green); color: var(--ivory); }
      .copy { margin-top: 10px; background: var(--deep-green); color: var(--ivory); border: 0; padding: 6px 16px; font-family: "Courier New", monospace; font-size: 11px; letter-spacing: 0.08em; cursor: pointer; }
      .copy:hover { opacity: 0.85; }
      .row-list { display: flex; flex-direction: column; gap: 12px; }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 16px; background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.25); padding: 14px 18px; }
      .row .meta { flex: 1; }
      .open-link { font-size: 13px; text-decoration: underline; white-space: nowrap; }
      .prompt-card { background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.25); padding: 18px; margin-bottom: 14px; }
      .prompt-text { white-space: pre-wrap; font-size: 13px; margin: 8px 0 12px; }
      .q-label { display: block; font-family: "Cormorant Infant", Georgia, serif; font-size: 19px; margin: 28px 0 8px; color: var(--deep-green); }
      .q-input { display: block; width: 100%; padding: 12px 14px; font-family: "Courier New", monospace; font-size: 14px; line-height: 1.7; color: var(--green); background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.35); border-radius: 2px; resize: vertical; }
      .q-input:focus { outline: 1px solid var(--deep-green); }
      .save { margin-top: 34px; background: var(--deep-green); color: var(--ivory); padding: 13px 30px; border: 0; font-family: "Courier New", monospace; font-size: 13px; letter-spacing: 0.08em; cursor: pointer; }
      .save:disabled { opacity: 0.5; cursor: wait; }
      .up-zone { background: var(--pale-ivory); border: 1px dashed rgba(76,59,21,0.35); padding: 34px 24px; text-align: center; }
      .up-note { font-size: 12px; opacity: 0.7; margin: 8px 0 0; }
      .up-row { display: flex; align-items: center; gap: 16px; background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.25); padding: 12px 16px; margin-bottom: 10px; }
      .up-thumb { width: 54px; height: 54px; object-fit: cover; border: 1px solid rgba(76,59,21,0.25); background: #fff; flex: none; }
      .up-thumb.doc { display: flex; align-items: center; justify-content: center; font-size: 18px; background: #fff; }
      .drive-box { background: var(--pale-ivory); border: 1px solid rgba(76,59,21,0.25); padding: 22px 26px; margin-bottom: 22px; text-align: center; }
      .drive-btn { display: inline-block; margin-top: 12px; background: var(--deep-green); color: var(--ivory); padding: 12px 26px; font-family: "Courier New", monospace; font-size: 13px; letter-spacing: 0.08em; text-decoration: none; }
      .drive-btn:hover { opacity: 0.85; }
      #note-saved { display: none; margin-left: 12px; font-style: italic; opacity: 0.7; }
      #q-done { display: none; text-align: center; padding: 20px 0 0; font-family: "Cormorant Infant", Georgia, serif; font-style: italic; font-size: 21px; }
      #up-msg { display: none; text-align: center; font-size: 13px; margin: 14px 0 0; font-style: italic; }
      .footnote { margin-top: 72px; text-align: center; font-size: 12px; letter-spacing: 0.06em; opacity: 0.6; }
      .footnote a { color: var(--green); }
      @media (max-width: 640px) { .menu-btn { right: 16px; } .menu-panel { right: 16px; } .mark { left: 16px; } }
    </style>
  </head>
  <body>
    <a class="mark" href="/" aria-label="studio rjl home">studio rjl</a>
    <button class="menu-btn" id="menu-btn" aria-haspopup="true" aria-expanded="false">menu ▾</button>
    <nav class="menu-panel" id="menu-panel" aria-label="portal sections">
      <button class="menu-item active" data-view="brandscape">brandscape</button>
      <button class="menu-item" data-view="questionnaire">questionnaire</button>
      <button class="menu-item" data-view="uploads">client upload portal</button>
      <button class="menu-item" data-view="contract">contract</button>
      <button class="menu-item" data-view="invoices">invoices &amp; payments</button>
      <button class="menu-item" data-view="library">library</button>
      <button class="menu-item" data-view="notes">notes</button>
      <div class="menu-divider"></div>
      <button class="menu-item" id="menu-signout">sign out</button>
    </nav>
    <div class="wrap">
      <div id="loading">opening your brandscape…</div>
      <div id="app" style="display:none;">
        <div class="view on" id="view-brandscape">
          <div class="hero">
            <h1 class="brand" id="brand"></h1>
            <p class="hero-line" id="greet"></p>
          </div>
          <nav class="chips" aria-label="brandscape sections">
            <a href="#logo">logo</a><a href="#profile-logos">profile logos</a><a href="#colours">colours</a><a href="#typography">typography</a><a href="#imagery">imagery</a><a href="#textures">textures</a><a href="#templates">templates</a><a href="#lockups">lock-ups</a><a href="#prompts">prompt library</a>
          </nav>
          <section id="logo">
            <h2>logo</h2>
            <p class="section-line">your mark in all its versions — yours to take, right-click freely.</p>
            <div class="variants" id="logo-toggle"></div>
            <div id="logo-stage"></div>
          </section>
          <section id="profile-logos">
            <h2>profile logos</h2>
            <p class="section-line">squared-up marks for profile pictures and socials.</p>
            <div class="grid" id="profile-grid"></div>
          </section>
          <section id="colours">
            <h2>colours</h2>
            <p class="section-line">the palette of your brandscape — click to copy any code.</p>
            <div class="grid" id="colours-grid"></div>
          </section>
          <section id="typography">
            <h2>typography</h2>
            <p class="section-line">your typefaces and pairings.</p>
            <div class="row-list" id="type-list"></div>
          </section>
          <section id="imagery">
            <h2>imagery</h2>
            <p class="section-line">curated imagery for your brand — yours to take, right-click freely.</p>
            <div class="grid" id="images-grid"></div>
          </section>
          <section id="textures">
            <h2>textures</h2>
            <p class="section-line">the tactile layer of your brandscape.</p>
            <div class="grid" id="textures-grid"></div>
          </section>
          <section id="templates">
            <h2>templates</h2>
            <p class="section-line">ready-made layouts carrying your brand into the world.</p>
            <div class="row-list" id="templates-list"></div>
          </section>
          <section id="lockups">
            <h2>brand lock-ups</h2>
            <p class="section-line">examples of your mark at work — signatures, pairings and compositions.</p>
            <div class="grid" id="lockups-grid"></div>
          </section>
          <section id="prompts">
            <h2>prompt library</h2>
            <p class="section-line">words to conjure your brand with — copy any prompt and make it yours.</p>
            <div id="prompts-list"></div>
          </section>
        </div>
        <div class="view" id="view-questionnaire">
          <section style="margin-top:0;">
            <h2>questionnaire — brand information</h2>
            <p class="section-line">a few questions so Rebekah can see your work through your eyes — rambling welcome.</p>
            <div id="q-wrap">
              <form id="qform">
                <label class="q-label" for="q1">tell me about your work — what are you making, and for whom?</label>
                <textarea class="q-input" id="q1" rows="4"></textarea>
                <label class="q-label" for="q2">your brand as it stands: what do you love about it, and what's quietly not working?</label>
                <textarea class="q-input" id="q2" rows="4"></textarea>
                <label class="q-label" for="q3">three words for the feeling your brand should carry.</label>
                <textarea class="q-input" id="q3" rows="2"></textarea>
                <label class="q-label" for="q4">whose world do you admire? (brands, places, makers — links welcome.)</label>
                <textarea class="q-input" id="q4" rows="4"></textarea>
                <label class="q-label" for="q5">any must-keeps — an existing logo, fonts, colours you're attached to?</label>
                <textarea class="q-input" id="q5" rows="4"></textarea>
                <label class="q-label" for="q6">where will the brandscape live first? (web, print, packaging, socials.)</label>
                <textarea class="q-input" id="q6" rows="4"></textarea>
                <label class="q-label" for="q7">anything else at all.</label>
                <textarea class="q-input" id="q7" rows="4"></textarea>
                <button class="save" id="q-send" type="submit">send my answers</button>
              </form>
            </div>
            <p id="q-done">thank you — your answers are with Rebekah. ✨</p>
          </section>
        </div>
        <div class="view" id="view-uploads">
          <section style="margin-top:0;">
            <h2>client upload portal</h2>
            <p class="section-line">share your inspiration — images, briefs, brand files. everything you add here is kept for your project.</p>
            <div class="drive-box" id="drive-box" style="display:none;">
              <p style="margin:0;">bigger files? drop them straight into the studio's google drive —</p>
              <a class="drive-btn" id="drive-link" href="#" target="_blank" rel="noopener">upload to google drive ↗</a>
            </div>
            <div class="up-zone">
              <input type="file" id="up-input" multiple style="display:none;">
              <button class="copy" style="margin-top:0; padding: 12px 30px; font-size: 13px;" id="up-choose" type="button">choose files</button>
              <p class="up-note">up to 10 MB each — images and documents.</p>
            </div>
            <p id="up-msg"></p>
            <div id="up-list" style="margin-top:26px;"></div>
          </section>
        </div>
        <div class="view" id="view-contract">
          <section style="margin-top:0;">
            <h2>contract</h2>
            <p class="section-line">your agreement lives here — ready to read and sign when the time comes.</p>
            <p class="empty">your contract will appear here when it's ready. Rebekah will walk you through it personally.</p>
          </section>
        </div>
        <div class="view" id="view-invoices">
          <section style="margin-top:0;">
            <h2>invoices &amp; payments</h2>
            <p class="section-line">your project account — clear and kept current.</p>
            <p class="empty">invoices and progress payments will be tracked here — downloadable invoices, and a clear picture of where your project stands.</p>
          </section>
        </div>
        <div class="view" id="view-library">
          <section style="margin-top:0;">
            <h2>library</h2>
            <p class="section-line">every image of your brandscape, gathered in one place.</p>
            <div class="grid" id="library-grid"></div>
          </section>
        </div>
        <div class="view" id="view-notes">
          <section style="margin-top:0;">
            <h2>notes</h2>
            <p class="section-line">a quiet page for your thoughts — anything saved here is kept for your project.</p>
            <textarea class="q-input" id="note" rows="8" placeholder="scribbles, sparks, things not to forget…"></textarea>
            <div>
              <button class="save" id="note-save" type="button">save note</button>
              <span id="note-saved">saved ✓</span>
            </div>
          </section>
        </div>
        <p class="footnote" id="footnote"></p>
      </div>
    </div>
    <script>
      (function () {
        var API = "https://rjl-publisher-insights-agent-a07f3048.base44.app/functions";
        var token = "";
        try { token = sessionStorage.getItem("rjl_portal_token") || ""; } catch (err) {}
        if (!token) { location.replace("/client/"); return; }

        function esc(s) {
          return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        }
        function post(path, payload) {
          return fetch(API + "/" + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).then(function (r) { return r.json(); });
        }
        function fallbackCopy(text) {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta);
        }
        function copyText(btn, text) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              btn.textContent = "copied ✨";
              setTimeout(function () { btn.textContent = "copy"; }, 1800);
            }).catch(function () { fallbackCopy(text); btn.textContent = "copied ✨"; setTimeout(function () { btn.textContent = "copy"; }, 1800); });
          } else {
            fallbackCopy(text); btn.textContent = "copied ✨";
            setTimeout(function () { btn.textContent = "copy"; }, 1800);
          }
        }
        function empty(id) {
          var el = document.getElementById(id);
          if (el) el.innerHTML = '<p class="empty">still in the studio — being made for you with love. this will appear here soon.</p>';
        }
        function imageCard(it) {
          var card = document.createElement("div");
          card.className = "card";
          card.innerHTML = (it.url ? '<img class="asset" src="' + esc(it.url) + '" alt="' + esc(it.title || "brand asset") + '" loading="lazy">' : "") +
            '<p class="card-title">' + esc(it.title) + '</p>' +
            (it.meta ? '<p class="meta">' + esc(it.meta) + '</p>' : "");
          return card;
        }
        function fillGrid(gridId, items) {
          var grid = document.getElementById(gridId);
          if (!grid) return;
          if (!items || items.length === 0) { empty(gridId); return; }
          items.forEach(function (it) { grid.appendChild(imageCard(it)); });
        }
        function fmtBytes(n) {
          n = Number(n || 0);
          if (n >= 1048576) return (n / 1048576).toFixed(1) + " MB";
          if (n >= 1024) return Math.round(n / 1024) + " KB";
          return n + " B";
        }
        var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        function fmtDate(ms) {
          var d = new Date(Number(ms));
          return d.getDate() + " " + MONTHS[d.getMonth()] + " " + d.getFullYear();
        }

        // ---- side panel menu
        var panel = document.getElementById("menu-panel");
        var menuBtn = document.getElementById("menu-btn");
        function closeMenu() {
          panel.classList.remove("open");
          menuBtn.setAttribute("aria-expanded", "false");
        }
        menuBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          var open = panel.classList.toggle("open");
          menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });
        document.addEventListener("click", function (e) {
          if (!panel.contains(e.target)) closeMenu();
        });
        function showView(name) {
          var views = document.querySelectorAll(".view");
          for (var i = 0; i < views.length; i++) views[i].classList.remove("on");
          var el = document.getElementById("view-" + name);
          if (el) el.classList.add("on");
          var btns = document.querySelectorAll(".menu-item[data-view]");
          for (var j = 0; j < btns.length; j++) btns[j].classList.toggle("active", btns[j].getAttribute("data-view") === name);
          closeMenu();
          window.scrollTo(0, 0);
        }
        var menuItems = document.querySelectorAll(".menu-item[data-view]");
        for (var k = 0; k < menuItems.length; k++) {
          menuItems[k].addEventListener("click", function () { showView(this.getAttribute("data-view")); });
        }
        document.getElementById("menu-signout").addEventListener("click", function () {
          try { sessionStorage.removeItem("rjl_portal_token"); } catch (err) {}
          location.href = "/client/";
        });

        var byType = {};
        var uploads = [];
        var logoVariants = [["logo", "logo"], ["monogram", "monogram"], ["brandmark", "brand mark"], ["wordmark", "word mark"]];
        var currentVariant = "logo";

        function renderLogo() {
          var stage = document.getElementById("logo-stage");
          var toggle = document.getElementById("logo-toggle");
          toggle.innerHTML = "";
          logoVariants.forEach(function (v) {
            var b = document.createElement("button");
            b.className = "variant" + (v[0] === currentVariant ? " active" : "");
            b.type = "button"; b.textContent = v[1];
            b.addEventListener("click", function () { currentVariant = v[0]; renderLogo(); });
            toggle.appendChild(b);
          });
          stage.innerHTML = "";
          var items = byType[currentVariant] || [];
          if (items.length === 0) {
            stage.innerHTML = '<p class="empty">still in the studio — being made for you with love. this will appear here soon.</p>';
            return;
          }
          if (items.length === 1) {
            var hero = document.createElement("div");
            hero.className = "logo-hero";
            hero.innerHTML = (items[0].url ? '<img src="' + esc(items[0].url) + '" alt="' + esc(items[0].title || "logo") + '">' : "") +
              (items[0].title ? '<p class="card-title" style="margin:10px 0 0;">' + esc(items[0].title) + '</p>' : "") +
              (items[0].meta ? '<p class="meta">' + esc(items[0].meta) + '</p>' : "");
            var dl = document.createElement("a");
            dl.className = "copy"; dl.style.display = "inline-block"; dl.style.textDecoration = "none";
            dl.href = items[0].url || "#"; dl.setAttribute("download", ""); dl.textContent = "download";
            hero.appendChild(dl);
            stage.appendChild(hero);
          } else {
            var grid = document.createElement("div");
            grid.className = "grid";
            stage.appendChild(grid);
            items.forEach(function (it) { grid.appendChild(imageCard(it)); });
          }
        }

        function renderUploads() {
          var list = document.getElementById("up-list");
          list.innerHTML = "";
          if (uploads.length === 0) {
            list.innerHTML = '<p class="empty">nothing shared yet — your uploads will gather here.</p>';
            return;
          }
          uploads.forEach(function (u) {
            var row = document.createElement("div");
            row.className = "up-row";
            var href = API + "/portalFile?token=" + encodeURIComponent(token) + "&id=" + encodeURIComponent(u.id);
            var isImg = String(u.kind || "").indexOf("image/") === 0;
            row.innerHTML =
              (isImg
                ? '<img class="up-thumb" src="' + esc(href) + '" alt="' + esc(u.filename) + '" loading="lazy">'
                : '<div class="up-thumb doc">📄</div>') +
              '<p class="meta" style="flex:1;margin:0;">' + esc(u.filename) + '<br><span style="opacity:0.6;">' + fmtBytes(u.size) + '</span></p>';
            var a = document.createElement("a");
            a.className = "open-link"; a.href = href; a.setAttribute("download", ""); a.textContent = "download ↗";
            row.appendChild(a);
            list.appendChild(row);
          });
        }

        function setUploading(state) {
          var btn = document.getElementById("up-choose");
          btn.disabled = state;
          btn.textContent = state ? "uploading…" : "choose files";
        }
        function upMsg(text) {
          var m = document.getElementById("up-msg");
          m.textContent = text;
          m.style.display = "block";
          setTimeout(function () { m.style.display = "none"; }, 5000);
        }

        post("portalGet", { token: token }).then(function (d) {
          if (!d.ok) { location.replace("/client/"); return; }
          document.getElementById("loading").style.display = "none";
          document.getElementById("app").style.display = "block";
          document.getElementById("brand").textContent = d.brand_name || "your brandscape";
          document.getElementById("greet").textContent = "welcome, " + (d.client_name || "friend") + " — everything lives here, all in one place, always yours.";

          (d.content || []).forEach(function (item) {
            (byType[item.type] = byType[item.type] || []).push(item);
          });
          uploads = d.uploads || [];

          // footnote with the 30-day window
          var foot = "private to you · <a href=\\"https://studiorjl.com\\">studiorjl.com</a>";
          if (d.expires_at) foot = "your portal is open until " + fmtDate(d.expires_at) + " · " + foot;
          document.getElementById("footnote").innerHTML = foot;

          // logo variants — open on the first version with content
          var firstWith = null;
          logoVariants.forEach(function (v) { if (!firstWith && (byType[v[0]] || []).length > 0) firstWith = v[0]; });
          currentVariant = firstWith || "logo";
          renderLogo();

          fillGrid("profile-grid", byType.profile_logo);
          fillGrid("library-grid", []
            .concat(byType.logo || [])
            .concat(byType.monogram || [])
            .concat(byType.brandmark || [])
            .concat(byType.wordmark || [])
            .concat(byType.profile_logo || [])
            .concat(byType.image || [])
            .concat(byType.texture || [])
            .concat(byType.lockup || []));

          // colours
          var cg = document.getElementById("colours-grid");
          if ((byType.colour || []).length === 0) { empty("colours-grid"); } else {
            byType.colour.forEach(function (c) {
              var card = document.createElement("div");
              card.className = "card";
              var hex = (c.meta || "").trim();
              card.innerHTML = '<div class="swatch" style="background:' + esc(hex) + '"></div>' +
                '<p class="card-title">' + esc(c.title || hex) + '</p>' +
                '<p class="meta">' + esc(hex) + '</p>';
              var btn = document.createElement("button");
              btn.className = "copy"; btn.type = "button"; btn.textContent = "copy";
              btn.addEventListener("click", function () { copyText(btn, hex); });
              card.appendChild(btn);
              cg.appendChild(card);
            });
          }

          // typography
          var tl = document.getElementById("type-list");
          if ((byType.typography || []).length === 0) { empty("type-list"); } else {
            byType.typography.forEach(function (t) {
              var row = document.createElement("div");
              row.className = "row";
              row.innerHTML = '<div><p class="card-title" style="margin:0;">' + esc(t.title) + '</p><p class="meta">' + esc(t.meta) + '</p></div>';
              var btn = document.createElement("button");
              btn.className = "copy"; btn.type = "button"; btn.textContent = "copy";
              btn.addEventListener("click", function () { copyText(btn, t.meta || t.title); });
              row.appendChild(btn);
              tl.appendChild(row);
            });
          }

          // imagery + textures + lock-ups
          [["image", "images-grid"], ["texture", "textures-grid"], ["lockup", "lockups-grid"]].forEach(function (pair) {
            fillGrid(pair[1], byType[pair[0]] || []);
          });

          // templates
          var tpl = document.getElementById("templates-list");
          if ((byType.template || []).length === 0) { empty("templates-list"); } else {
            byType.template.forEach(function (t) {
              var row = document.createElement("div");
              row.className = "row";
              row.innerHTML = '<div><p class="card-title" style="margin:0;">' + esc(t.title) + '</p><p class="meta">' + esc(t.meta) + '</p></div>';
              if (t.url) {
                var a = document.createElement("a");
                a.className = "open-link"; a.href = t.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "open ↗";
                row.appendChild(a);
              }
              tpl.appendChild(row);
            });
          }

          // prompts
          var pl = document.getElementById("prompts-list");
          if ((byType.prompt || []).length === 0) { empty("prompts-list"); } else {
            byType.prompt.forEach(function (p) {
              var card = document.createElement("div");
              card.className = "prompt-card";
              card.innerHTML = '<p class="card-title" style="margin:0 0 8px;">' + esc(p.title) + '</p><p class="prompt-text">' + esc(p.meta) + '</p>';
              var btn = document.createElement("button");
              btn.className = "copy"; btn.type = "button"; btn.textContent = "copy prompt";
              btn.addEventListener("click", function () { copyText(btn, p.meta || p.title); });
              card.appendChild(btn);
              pl.appendChild(card);
            });
          }

          // google drive link (per-client, curated by Rebekah)
          var driveItem = (byType.drive_link || [])[0];
          if (driveItem && driveItem.url) {
            document.getElementById("drive-box").style.display = "block";
            document.getElementById("drive-link").href = driveItem.url;
          }

          // uploads
          renderUploads();
          var upInput = document.getElementById("up-input");
          document.getElementById("up-choose").addEventListener("click", function () { upInput.click(); });
          upInput.addEventListener("change", function () {
            var files = Array.prototype.slice.call(upInput.files || []);
            upInput.value = "";
            if (files.length === 0) return;
            var fd = new FormData();
            fd.append("token", token);
            files.forEach(function (f) { fd.append("files", f); });
            setUploading(true);
            fetch(API + "/portalUpload", { method: "POST", body: fd }).then(function (r) { return r.json(); }).then(function (res) {
              setUploading(false);
              if (res.ok) {
                (res.uploaded || []).forEach(function (u) { uploads.unshift(u); });
                renderUploads();
                var n = (res.uploaded || []).length;
                var note = n + " file" + (n === 1 ? "" : "s") + " received — thank you ✨";
                (res.skipped || []).forEach(function (s) { note += " · " + s.filename + " skipped: " + s.reason; });
                upMsg(note);
              } else {
                upMsg(res.error || "something went wrong — please try again.");
              }
            }).catch(function () {
              setUploading(false);
              upMsg("the connection dropped — please try again.");
            });
          });

          // notes
          var noteItem = (byType.client_note || [])[0];
          if (noteItem && noteItem.meta) document.getElementById("note").value = noteItem.meta;
          document.getElementById("note-save").addEventListener("click", function () {
            var btn = document.getElementById("note-save");
            btn.disabled = true; btn.textContent = "saving…";
            post("portalSaveNote", { token: token, text: document.getElementById("note").value }).then(function (r) {
              btn.disabled = false; btn.textContent = "save note";
              if (r.ok) {
                document.getElementById("note-saved").style.display = "inline";
                setTimeout(function () { document.getElementById("note-saved").style.display = "none"; }, 2200);
              }
            });
          });

          // questionnaire
          document.getElementById("qform").addEventListener("submit", function (e) {
            e.preventDefault();
            var btn = document.getElementById("q-send");
            btn.disabled = true; btn.textContent = "sending…";
            var answers = {};
            ["q1", "q2", "q3", "q4", "q5", "q6", "q7"].forEach(function (id) {
              answers[id] = document.getElementById(id).value.trim();
            });
            post("submitClientQuestionnaire", { token: token, answers: answers }).then(function (r) {
              if (r.ok) {
                document.getElementById("q-wrap").style.display = "none";
                document.getElementById("q-done").style.display = "block";
              } else {
                btn.disabled = false; btn.textContent = "send my answers";
              }
            });
          });
        }).catch(function () { location.replace("/client/"); });
      })();
    </script>
  </body>
</html>`;
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
    { label: "contact", href: "/contact/" },
    { label: "client log in", href: "/client/" },
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
  ["confirm/index.html", confirmPage()],
  ["questionnaire/index.html", questionnairePage()],
  ["client/index.html", clientLoginPage()],
  ["client/portal/index.html", clientPortalPage()],
  ["portfolio/index.html", portfolioPage()],
  ...portfolioCategories.map((category) => [`portfolio/${category.slug}/index.html`, portfolioPage(category)]),
  ["portfolio/property/index.html", propertyPortfolioPage()],
  ["editorial/index.html", editorialPage()],
  ...editorialPosts.map((post) => [`editorial/${post.slug}/index.html`, editorialArticlePage(post)]),
  ["offers/index.html", offersPage()],
  ...offers.map((offer) => [`offers/${offer.slug}/index.html`, offerPage(offer)]),
  ["services/index.html", servicesPage()],
  ["shop/index.html", shopPage()],
  ["faq/index.html", faqPage()],
  ["booking/index.html", bookingPage()],
  ["contact/index.html", contactPage()],
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
      body: "<p>studio rjl (\"we\", \"us\", \"our\") provides studiorjl.com (the \"Website\"). These Terms of Service apply to your use of the Website and any purchases made through it.</p><h2>Acceptance</h2><p>By using the Website you agree to these Terms of Service. If you do not agree, please do not use the Website.</p><h2>Design Services</h2><p>All design services are provided under an individual written agreement. Project scope, fees, timelines and deliverables are confirmed in writing before each engagement begins. Website content is general information and portfolio reference only, and does not constitute professional advice.</p><h2>Copyright and Use of Materials</h2><p>All content on the Website, including text, logos, images, illustrations, branding, design work and downloadable materials, is the copyright of studio rjl or its licensors. You may view this content and share links to it for personal, non-commercial reference. You may not download, copy, reproduce, republish, adapt, edit or otherwise use any material from this Website, including in portfolios, mood boards or commercial projects, without our prior written consent. Client work is shown with the client's consent. Unauthorised use may constitute copyright infringement under the Copyright Act 1968 (Cth).</p><h2>Digital Products and Payments</h2><p>Purchases are processed by third-party payment providers (such as Stripe, Payhip or Square). Due to the nature of digital products, refunds are assessed case by case in line with Australian Consumer Law.</p><h2>Third-Party Links</h2><p>The Website may link to third-party sites (including Pinterest and LinkedIn). We are not responsible for their content or practices.</p><h2>Limitation of Liability</h2><p>The Website is provided \"as is.\" To the extent permitted by law, studio rjl is not liable for any indirect or consequential loss arising from use of the Website.</p><h2>Governing Law</h2><p>These Terms are governed by the laws of Australia.</p><h2>Changes and Contact</h2><p>We may update these Terms from time to time. Questions: <a href=\"mailto:info@studiorjl.com\">info@studiorjl.com</a>.</p><p><em>Last updated: 18 September 2026</em></p>"
    })
  ],
  [
    "accessibility/index.html",
    plainPage({
      title: "accessibility",
      pathname: "/accessibility/",
      body: "<p>studio rjl is committed to making studiorjl.com readable, navigable and usable for everyone, including people using assistive technologies. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA, the reference standard under Australia's Disability Discrimination Act 1992.</p><h2>What We Do</h2><p>We write semantic, standards-based HTML; provide text alternatives for images; keep typography readable at all screen sizes; support keyboard navigation; and maintain colour contrast that meets our studio aesthetic without excluding anyone.</p><h2>Known Limitations and Improvements</h2><p>We review the Website as it evolves. Some older portfolio images may have limited descriptions, and we are improving these over time.</p><h2>Feedback</h2><p>If you encounter any barrier on this site, please tell us. Email <a href=\"mailto:info@studiorjl.com\">info@studiorjl.com</a> and we will respond within 7 days and do our best to fix it.</p><p><em>Last updated: 9 September 2026</em></p>"
    })
  ],
  [
    "privacy/index.html",
    plainPage({
      title: "privacy",
      pathname: "/privacy/",
      body: "<p>studio rjl (\"we\", \"us\", \"our\") is a design practice based in Australia. This Privacy Policy explains how we collect, use, store and protect your personal information when you use studiorjl.com (the \"Website\"), submit an enquiry, subscribe to our newsletter, or purchase from us.</p><h2>1. Information We Collect</h2><p><strong>Enquiries.</strong> When you submit an enquiry through the Website, we collect the details you provide: your name, brand/business/company name, email address, phone number, location, the creative services and budget range of interest, and your message. Our enquiry form is processed by our own secure form service, and your details are delivered directly to the studio and stored in a private database accessible only to us.</p><p><strong>Newsletter.</strong> When you subscribe, we collect your email address and any other details you choose to provide.</p><p><strong>Payments.</strong> When you make a purchase, payment is processed by our third-party payment providers (such as Stripe or Payhip). We do not collect or store your credit card or bank account details.</p><p><strong>Analytics.</strong> We use Google Analytics 4 to understand how visitors use the Website, for example pages visited, time spent, and general location. This data is aggregated and does not identify you personally.</p><h2>2. How We Use Your Information</h2><p>We use your information to respond to enquiries and provide our design services; to send newsletters you have subscribed to; to process purchases; to improve the Website; and to meet legal obligations. We do not sell, rent, or trade your personal information to third parties.</p><h2>3. Cookies and Analytics</h2><p>The Website uses Google Analytics 4, which sets cookies to collect usage data. You may disable cookies in your browser at any time, and you can review Google's privacy practices at policies.google.com/privacy.</p><h2>4. Third Parties</h2><p>Your information may be handled by Google Analytics (website analytics), our email and website hosting providers, and payment providers for purchases. These providers process your data on our behalf or under their own privacy policies.</p><h2>5. Data Retention and Security</h2><p>We retain enquiry and client information only as long as needed to respond and provide services, and newsletter details until you unsubscribe. We take reasonable technical and organisational measures to protect your information; however, no internet transmission is completely secure.</p><h2>6. Your Rights</h2><p>You may request access to, correction, or deletion of your personal information, and you may unsubscribe from marketing emails at any time via the link in any email or by contacting us. This policy is informed by the Australian Privacy Principles under the Privacy Act 1988 (Cth) and, where applicable, similar laws such as the GDPR.</p><h2>7. Changes to This Policy</h2><p>We may update this policy from time to time; the current version is always available on this page.</p><h2>8. Contact</h2><p>Questions or requests about your personal information: <a href=\"mailto:info@studiorjl.com\">info@studiorjl.com</a>.</p><p><em>Last updated: 9 September 2026</em></p>"
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
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${["/", "/portfolio/", ...portfolioCategories.map((category) => `/portfolio/${category.slug}/`), "/editorial/", "/services/", "/shop/", "/faq/", "/booking/", "/contact/", "/client/", "/blog/", "/project-archive/", "/sitemap/", "/privacy/", "/terms/", "/accessibility/"]
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
    `# ${site.name}\n\n${site.description}\n\n## key pages\n\n- home: ${canonical("/")}\n- recent works: ${canonical("/portfolio/")}\n- editorial: ${canonical("/editorial/")}\n- creative services: ${canonical("/services/")}\n- shop: ${canonical("/shop/")}\n- faq: ${canonical("/faq/")}\n- bookings: ${canonical("/booking/")}\n- contact: ${canonical("/contact/")}\n- client portal: ${canonical("/client/")}\n- blog: ${canonical("/blog/")}\n- project archive: ${canonical("/project-archive/")}\n- sitemap: ${canonical("/sitemap/")}\n\n## contact\n\n- email: ${site.contact.email}\n\n## location\n\n${site.locationSignal}\n\n## services\n\n${services.map((service) => `- ${service}`).join("\n")}\n`
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

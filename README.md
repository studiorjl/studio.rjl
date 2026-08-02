# Studio RJL

Static rebuild for Studio RJL.

## Commands

```bash
npm run build
```

The build writes the static site to `dist/`.

GitHub Pages deploys from `dist/` through `.github/workflows/deploy.yml`.

## Structure

- `src/content.mjs` contains page, portfolio, FAQ, service, and business data.
- `src/build.mjs` renders shared layouts and static files.
- `src/styles.css` and `src/site.js` are shared by every page.
- `public/assets/` holds the current page assets used by the first migration pass.

## Next media step

Move image source files into a managed media workflow that can generate:

- optimized WebP/AVIF outputs
- descriptive filenames
- alt text
- captions
- Pinterest titles/descriptions
- Open Graph images

#!/usr/bin/env node
// Mini-CMS build: reads cms/recipes.json and generates one detail page per
// recipe at /recipe/<slug>/index.html. Also rewrites the recipe card grids in
// /applications/index.html and /index.html so the cards point at the right
// slug and use the right image/title/category.
//
// Run: node cms/build.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const esc = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Shared header/mobile-menu/cta-banner/footer fragments — kept here so every
// generated recipe page stays in sync with the rest of the site.
const loaderHtml = `<div class="page-loader" aria-hidden="true"></div>`;

const headerHtml = `<header class="site-header">
    <div class="site-header__inner">
      <a href="/" aria-label="Andfoods home">
        <img src="/assets/andfoods-original/logo.svg" alt="Andfoods" class="brand-logo">
      </a>
      <nav class="site-nav" aria-label="Primary">
        <a href="/" class="site-nav__link" data-route="/">Home</a>
        <a href="/applications/" class="site-nav__link" data-route="/applications">Applications</a>
        <a href="/our-plants/" class="site-nav__link" data-route="/our-plants">Our Plants</a>
        <a href="/about-us/" class="site-nav__link" data-route="/about-us">About Us</a>
        <a href="/contact/" class="site-nav__link" data-route="/contact">Contact</a>
      </nav>
      <button class="menu-toggle" aria-label="Open menu"><span></span></button>
    </div>
  </header>

  <div class="mobile-menu-backdrop" aria-hidden="true"></div>
  <aside class="mobile-menu" aria-label="Mobile navigation">
    <button class="mobile-menu__close" aria-label="Close menu">\u00d7</button>
    <a href="/" class="mobile-menu__link" data-route="/">Home</a>
    <a href="/applications/" class="mobile-menu__link" data-route="/applications">Applications</a>
    <a href="/our-plants/" class="mobile-menu__link" data-route="/our-plants">Our Plants</a>
    <a href="/about-us/" class="mobile-menu__link" data-route="/about-us">About Us</a>
    <a href="/contact/" class="mobile-menu__link" data-route="/contact">Contact</a>
  </aside>`;

const ctaFooterHtml = `<section class="cta-banner">
    <div class="cta-banner__text">
      <p class="eyebrow eyebrow--light">Ready to explore high-performance cream?</p>
      <h2>Talk with Andfoods about your next food service launch.</h2>
    </div>
    <div class="cta-banner__actions">
      <a href="/contact/" class="btn btn--primary">Contact sales</a>
      <a href="/applications/" class="btn btn--ghost">Explore concepts</a>
    </div>
  </section>

  <footer class="site-footer">
    <div class="site-footer__inner">
      <span>\u00a9 Andfoods</span>
      <nav class="footer-links" aria-label="Footer">
        <a href="/about-us/">About Us</a>
        <a href="/our-plants/">Our Plants</a>
        <a href="/applications/">Applications</a>
        <a href="/contact/">Contact</a>
      </nav>
    </div>
  </footer>`;

function renderIngredients(groups) {
  return groups.map((g) => {
    const items = g.items.map((i) => `<li>${esc(i)}</li>`).join('');
    const heading = g.heading
      ? `<h4 style="margin-top:1.25rem;font-size:.95rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">${esc(g.heading)}</h4>`
      : '';
    return `${heading}<ul style="margin-top:.5rem;color:var(--muted);line-height:1.8;padding-left:1.2rem;">${items}</ul>`;
  }).join('\n');
}

function renderMethod(method) {
  // Supports either a flat array of step strings, or an array of
  // { heading, steps } groups for composed recipes.
  if (method.length && typeof method[0] === 'object') {
    return method.map((g) => {
      const heading = g.heading
        ? `<h4 style="margin-top:1.25rem;font-size:.95rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);">${esc(g.heading)}</h4>`
        : '';
      const items = g.steps.map((s) => `<li>${esc(s)}</li>`).join('');
      return `${heading}<ol style="margin-top:.5rem;color:var(--muted);line-height:1.8;padding-left:1.2rem;">${items}</ol>`;
    }).join('\n');
  }
  return `<ol style="margin-top:.5rem;color:var(--muted);line-height:1.8;padding-left:1.2rem;">${method.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
}

function renderRecipePage(r) {
  const notesHtml = r.notes
    ? `<h3 style="margin-top:2rem;font-size:1.1rem;">Notes</h3>
            <p style="margin-top:.5rem;color:var(--muted);line-height:1.6;">${esc(r.notes)}</p>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${esc(r.name)} | Andfoods</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(r.lede)}">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="preload" href="/fonts/MatterSQTRIAL-Regular.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>

  ${loaderHtml}

  ${headerHtml}

  <main style="padding-top:var(--header-h);">
    <section class="section" style="padding-top:4rem;padding-bottom:2rem;">
      <div class="container">
        <p class="eyebrow">${esc(r.categoryLabel)}</p>
        <h1 style="font-size:clamp(2.4rem,5vw,3.8rem);line-height:1.04;letter-spacing:-.03em;margin-top:.6rem;color:var(--brand-dark);">${esc(r.name)}</h1>
        <p style="margin-top:1rem;color:var(--muted);font-size:1.05rem;line-height:1.6;max-width:60ch;">${esc(r.lede)}</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="story-grid">
          <div class="recipe-image">
            <img src="${esc(r.image)}" alt="${esc(r.name)}">
          </div>
          <div class="story-copy recipe-copy">
            <h3 style="margin-top:2rem;font-size:2rem;">Ingredients</h3>
            ${renderIngredients(r.ingredients)}

            <h3 style="margin-top:2rem;font-size:2rem;">Method</h3>
            ${renderMethod(r.method)}

            ${notesHtml}

            <p style="margin-top:2rem;"><a href="/applications/" style="color:var(--brand);">\u2190 Browse all recipes</a></p>
          </div>
        </div>
      </div>
    </section>
  </main>

  ${ctaFooterHtml}

  <script src="/nav.js" defer></script>
</body>
</html>
`;
}

function renderCard(r, { hidden = false } = {}) {
  const hiddenAttrs = hidden ? ' aria-hidden="true" tabindex="-1"' : '';
  return `          <a class="recipe-card" data-category="${esc(r.category)}" href="/recipe/${esc(r.slug)}/"${hiddenAttrs}>
            <span class="recipe-card__media"><img src="${esc(r.image)}" alt="" loading="lazy" decoding="async"></span>
            <p class="eyebrow">${esc(r.categoryLabel)}</p>
            <h4 class="recipe-card__title">${esc(r.name)}</h4>
          </a>`;
}

function renderMarqueeCard(r, { hidden = false } = {}) {
  const hiddenAttrs = hidden ? ' aria-hidden="true" tabindex="-1"' : '';
  // Home-page marquee lives outside a .container and uses relative asset paths
  return `        <a class="recipe-card" data-category="${esc(r.category)}" href="/recipe/${esc(r.slug)}/"${hiddenAttrs}>
          <span class="recipe-card__media"><img src="${esc(r.image).replace(/^\//, '')}" alt="" loading="eager" decoding="async"></span>
          <p class="eyebrow">${esc(r.categoryLabel)}</p>
          <h4 class="recipe-card__title">${esc(r.name)}</h4>
        </a>`;
}

function replaceBlock(html, startMarker, endMarker, replacement) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker, startIdx + startMarker.length);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Could not find markers: ${startMarker} / ${endMarker}`);
  }
  return html.slice(0, startIdx) + startMarker + '\n' + replacement + '\n' + html.slice(endIdx);
}

async function main() {
  const raw = await readFile(resolve(ROOT, 'cms/recipes.json'), 'utf8');
  const { recipes } = JSON.parse(raw);

  // 1) Write each recipe detail page
  for (const r of recipes) {
    const dir = resolve(ROOT, 'recipe', r.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, 'index.html'), renderRecipePage(r));
    console.log(`  wrote recipe/${r.slug}/index.html`);
  }

  // 2) Rewrite the applications page recipe-grid between <!-- CMS:RECIPES --> markers
  const appPath = resolve(ROOT, 'applications/index.html');
  let appHtml = await readFile(appPath, 'utf8');
  const appCards = recipes.map((r) => renderCard(r)).join('\n');
  appHtml = replaceBlock(
    appHtml,
    '<!-- CMS:RECIPES -->',
    '<!-- /CMS:RECIPES -->',
    appCards
  );
  await writeFile(appPath, appHtml);
  console.log('  updated applications/index.html');

  // 3) Rewrite the home-page marquee between <!-- CMS:MARQUEE --> markers
  //    (show a curated 9 = 5 drinks + 4 desserts, duplicated for seamless loop)
  const marqueePath = resolve(ROOT, 'index.html');
  let homeHtml = await readFile(marqueePath, 'utf8');
  const drinks = recipes.filter((r) => r.category === 'drinks');
  const desserts = recipes.filter((r) => r.category === 'dessert').slice(0, 4);
  const featured = [...drinks, ...desserts];
  const marqueeFirst = featured.map((r) => renderMarqueeCard(r)).join('\n');
  const marqueeDup = featured.map((r) => renderMarqueeCard(r, { hidden: true })).join('\n');
  homeHtml = replaceBlock(
    homeHtml,
    '<!-- CMS:MARQUEE -->',
    '<!-- /CMS:MARQUEE -->',
    marqueeFirst + '\n        <!-- duplicate set for seamless loop -->\n' + marqueeDup
  );
  await writeFile(marqueePath, homeHtml);
  console.log('  updated index.html marquee');

  console.log(`\nDone. Generated ${recipes.length} recipe pages.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

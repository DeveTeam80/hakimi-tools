// fetchMakitaProducts.js

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const START_URL = "https://makita.in/product-category/tools/";
const OUT_JSON = path.join("assets", "data", "makita-products.json");

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );

  let url = START_URL;
  const allProducts = [];
  let pageIndex = 0;

  while (url) {
    pageIndex++;
    console.log(`\n→ Loading page ${pageIndex}: ${url}`);

    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (err) {
      console.log("❌ Page failed, stopping pagination.");
      break;
    }

    await page.waitForSelector("li.product", { timeout: 15000 });

    const productsOnPage = await page.evaluate(() => {
      const items = [];

      const products = document.querySelectorAll("li.product");

      products.forEach((el) => {
        // Model Code (like CL200DF)
        const modelEl = el.querySelector("h2.woocommerce-loop-product__title");

        // Product Name (like Cordless Cleaner)
        const nameEl = el.querySelector("p");

        // Image

        const imgEl = el.querySelector("a.woocommerce-LoopProduct-link img");

        const model = modelEl
          ? modelEl.innerText.trim().replace(/\s+/g, " ")
          : null;

        const name = nameEl
          ? nameEl.innerText.trim().replace(/\s+/g, " ")
          : null;

        let image = null;

        if (imgEl) {
          image =
            imgEl.getAttribute("src") ||
            imgEl.getAttribute("data-src") ||
            imgEl.getAttribute("data-lazy-src") ||
            null;
        }

        if (model && name && image) {
          const finalImage = image.startsWith("http")
            ? image
            : window.location.origin +
              (image.startsWith("/") ? "" : "/") +
              image;

          items.push({
            model,
            name,
            image: finalImage,
          });
        }
      });

      return items;
    });

    console.log(`  • Found ${productsOnPage.length} products`);

    allProducts.push(...productsOnPage);

    // Find next page
    const nextHref = await page.evaluate(() => {
      const nextBtn =
        document.querySelector("a.next") ||
        document.querySelector('a[rel="next"]') ||
        document.querySelector(".woocommerce-pagination a.next");

      return nextBtn ? nextBtn.href : null;
    });

    url = nextHref && nextHref !== url ? nextHref : null;
  }

  await browser.close();

  // Remove duplicates
  const unique = [];
  const seen = new Set();

  for (const p of allProducts) {
    const key = (p.model + "::" + p.image).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  // Create folder if not exists
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  // Save JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify(unique, null, 2), "utf8");

  console.log(`\n✅ Saved ${unique.length} products to ${OUT_JSON}\n`);

  console.log("Copy-paste ready JS array:\n");
  console.log("const products = " + JSON.stringify(unique, null, 2) + ";\n");

  process.exit(0);
})();

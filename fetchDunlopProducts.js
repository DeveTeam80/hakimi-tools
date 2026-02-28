// fetchDunlopProducts.js

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const START_URL = "https://www.dunlop.com.in/products-and-services.html";
const OUT_JSON = path.join("assets", "data", "dunlop-products.json");

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

  console.log("→ Loading page...");
  await page.goto(START_URL, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  // 🔥 Scroll page to trigger lazy loading
  await autoScroll(page);
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const products = await page.evaluate(() => {
    const items = [];

    const imageAnchors = document.querySelectorAll("a.ma");

    imageAnchors.forEach((anchor) => {
      const img = anchor.querySelector("img");
      if (!img) return;

      const parent = anchor.parentElement;
      const nextBlock = parent?.nextElementSibling;

      const titleEl =
        nextBlock?.querySelector("h3 a") || nextBlock?.querySelector("h3");

      const name = titleEl
        ? titleEl.innerText.trim().replace(/\s+/g, " ")
        : null;

      // ✅ Get real image (avoid base64)
      let image =
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        img.getAttribute("data-lazy-src") ||
        img.getAttribute("src");

      if (!image || image.startsWith("data:image")) return;

      const absoluteImage = new URL(image, window.location.href).href;

      if (name) {
        items.push({
          name,
          image: absoluteImage,
        });
      }
    });

    // ✅ Remove duplicates
    const unique = [];
    const seen = new Set();

    items.forEach((item) => {
      const key = (item.name + "::" + item.image).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    return unique;
  });

  await browser.close();

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(products, null, 2));

  console.log(`\n✅ Saved ${products.length} products to ${OUT_JSON}\n`);
  console.log("const products =", JSON.stringify(products, null, 2));

  process.exit(0);
})();

// 🔥 Auto Scroll Function
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

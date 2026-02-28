const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://hikoki-powertools.in/cordless.aspx", {
    waitUntil: "networkidle2",
  });

  await page.waitForSelector(".a-ttl_main");

  const products = await page.evaluate(() => {
    return Array.from(document.querySelectorAll("li"))
      .map((el) => {
        const name = el.querySelector(".a-ttl_main")?.innerText.trim();
        const image = el.querySelector("img")?.getAttribute("src");

        if (!name || !image) return null;

        return {
          name,
          image: image.startsWith("http")
            ? image
            : "https://hikoki-powertools.in/" + image,
        };
      })
      .filter(Boolean);
  });

  // ✅ Create folder if not exists
  const outputPath = path.join("assets", "data", "hikoki-products.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // ✅ Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));

  console.log(`\n✅ Saved ${products.length} products to ${outputPath}\n`);

  // Optional: print JS array format
  console.log("const products =", JSON.stringify(products, null, 2));

  await browser.close();
})();

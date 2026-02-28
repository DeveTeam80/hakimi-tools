const axios = require("axios");
const fs = require("fs");
const path = require("path");

const URL = "https://jpttools.com/collections/bosch-products/products.json";
const OUT_JSON = path.join("assets", "data", "jpt-products.json");

(async () => {
  try {
    const response = await axios.get(URL);
    const data = response.data;

    const products = data.products.map((product) => ({
      name: product.title,
      image: product.images.length > 0 ? product.images[0].src : "",
    }));

    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(products, null, 2));

    console.log("\n✅ Saved products\n");
    console.log("const products =", JSON.stringify(products, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
})();

// Rasterize the master icon.svg to the PNG sizes the manifest needs.
// Run with sharp available, e.g.: npx -y -p sharp node scripts/gen-icons.cjs
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const dir = path.join(__dirname, "..", "public", "icons");
const svg = path.join(dir, "icon.svg");

(async () => {
  await sharp(svg).resize(512, 512).png().toFile(path.join(dir, "icon-512.png"));
  await sharp(svg).resize(192, 192).png().toFile(path.join(dir, "icon-192.png"));
  fs.copyFileSync(path.join(dir, "icon-512.png"), path.join(dir, "icon-maskable-512.png"));
  console.log("ICONS_DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

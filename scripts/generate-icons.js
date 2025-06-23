// This is a script to generate PWA icons
// You would run this with Node.js: node scripts/generate-icons.js

const fs = require("fs")
const path = require("path")
const sharp = require("sharp")

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const SOURCE_ICON = path.join(__dirname, "../public/images/i-eat-vienna-logo.png")
const OUTPUT_DIR = path.join(__dirname, "../public/icons")

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Generate icons for each size
async function generateIcons() {
  try {
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)

      await sharp(SOURCE_ICON).resize(size, size).toFile(outputPath)

      console.log(`Generated icon: ${outputPath}`)
    }

    console.log("All icons generated successfully!")
  } catch (error) {
    console.error("Error generating icons:", error)
  }
}

generateIcons()

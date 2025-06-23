"use client"

import { jsPDF } from "jspdf"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"

export async function generatePdf(
  selectedProducts: Record<string, SelectedProduct>,
  calculatedIngredients: Record<string, CalculatedIngredient>,
  eventDetails: EventDetails,
  formatWeight: (value: number, unit: string) => string,
  getUnitPlural: (quantity: number, unit: string) => string,
  mode = "packliste",
  productCategories: Record<string, string> = {}, // New parameter for product categories
) {
  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let pageNumber = 1

  // Get title based on mode
  const getTitle = () => {
    switch (mode) {
      case "packliste":
        return "Packliste"
      case "einkaufen":
        return "Einkaufsliste"
      case "bestellung":
        return "Bestellung"
      default:
        return "Packliste"
    }
  }

  // Helper function to draw header
  const drawHeader = () => {
    doc.setFontSize(10)
    doc.setTextColor(128, 128, 128)
    doc.line(20, 15, pageWidth - 20, 15)

    let headerText = `${eventDetails.type} | ${eventDetails.name} | ${eventDetails.date || "Kein Datum"}`
    if (eventDetails.ft && eventDetails.ft !== "none") {
      headerText += ` | ${eventDetails.ft}`
    }
    if (eventDetails.ka && eventDetails.ka !== "none") {
      headerText += ` | ${eventDetails.ka}`
    }
    // Add supplier name for Bestellung mode
    if (mode === "bestellung" && eventDetails.supplierName) {
      headerText += ` | Mitarbeiter: ${eventDetails.supplierName}`
    }

    doc.text(headerText, 20, 12)
  }

  // Helper function to draw footer
  const drawFooter = () => {
    doc.setFontSize(10)
    doc.setTextColor(128, 128, 128)
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)

    const footerText = `${eventDetails.type} | ${eventDetails.name} | ${eventDetails.date || "Kein Datum"}`
    if (eventDetails.ft && eventDetails.ft !== "none") {
      headerText += ` | ${eventDetails.ft}`
    }
    if (eventDetails.ka && eventDetails.ka !== "none") {
      headerText += ` | ${eventDetails.ka}`
    }
    // Add supplier name for Bestellung mode
    if (mode === "bestellung" && eventDetails.supplierName) {
      headerText += ` | Mitarbeiter: ${eventDetails.supplierName}`
    }

    doc.text(footerText, 20, pageHeight - 10)
    doc.text(`Seite ${pageNumber}`, pageWidth - 30, pageHeight - 10)
  }

  // Draw initial header
  drawHeader()
  doc.setTextColor(0, 0, 0)

  // Draw title
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")

  let headerText = `${getTitle()}: ${eventDetails.name} | ${eventDetails.date || "Kein Datum"}`
  if (eventDetails.ft && eventDetails.ft !== "none") {
    headerText += ` | ${eventDetails.ft}`
  }
  if (eventDetails.ka && eventDetails.ka !== "none") {
    headerText += ` | ${eventDetails.ka}`
  }
  // Add supplier name for Bestellung mode
  if (mode === "bestellung" && eventDetails.supplierName) {
    headerText += ` | Mitarbeiter: ${eventDetails.supplierName}`
  }

  doc.text(headerText, 20, 25)
  doc.line(20, 28, pageWidth - 20, 28)

  // Draw products
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")

  // Group products by their actual categories
  const productsByCategory: Record<string, { name: string; quantity: number; unit: string }[]> = {}

  Object.entries(selectedProducts).forEach(([productName, details]) => {
    // Get the actual category for this product, fallback to "Sonstige" if not found
    const category = productCategories[productName] || "Sonstige"

    if (!productsByCategory[category]) {
      productsByCategory[category] = []
    }

    productsByCategory[category].push({
      name: productName,
      quantity: details.quantity,
      unit: details.unit,
    })
  })

  // Sort categories and products
  const sortedCategories = Object.keys(productsByCategory).sort()

  // Calculate column layout based on number of categories
  const numCategories = sortedCategories.length
  const maxColumns = Math.min(numCategories, 6) // Changed from 4 to 6 to include all categories
  const columnWidth = (pageWidth - 40) / maxColumns
  const xPositions = Array.from({ length: maxColumns }, (_, i) => 20 + i * columnWidth)

  let yPosition = 35

  // Draw category headers
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  for (let i = 0; i < maxColumns; i++) {
    if (i < sortedCategories.length) {
      const categoryName = sortedCategories[i]
      doc.text(categoryName, xPositions[i], yPosition)
    }
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9) // Reduced from 10 to 9 for better fit with 6 columns

  yPosition += 8

  // Draw products for each category
  const maxYPosition = pageHeight - 25

  // Calculate the maximum number of products in any category to know how much vertical space we need
  const maxProductsInCategory = Math.max(...sortedCategories.map((cat) => productsByCategory[cat].length))

  for (let productIndex = 0; productIndex < maxProductsInCategory; productIndex++) {
    // Check if we need a new page
    if (yPosition > maxYPosition) {
      drawFooter()
      doc.addPage()
      pageNumber++
      drawHeader()
      doc.setTextColor(0, 0, 0)

      // Redraw category headers on new page
      yPosition = 35
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      for (let i = 0; i < maxColumns; i++) {
        if (i < sortedCategories.length) {
          const categoryName = sortedCategories[i]
          doc.text(categoryName, xPositions[i], yPosition)
        }
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9) // Reduced from 10 to 9 for better fit with 6 columns
      yPosition += 8
    }

    // Draw products for this row across all categories
    for (let colIndex = 0; colIndex < maxColumns && colIndex < sortedCategories.length; colIndex++) {
      const category = sortedCategories[colIndex]
      const products = productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name))

      if (productIndex < products.length) {
        const product = products[productIndex]

        // Draw checkbox
        doc.rect(xPositions[colIndex], yPosition - 3, 3, 3)

        // Draw product name with quantity
        const quantity = product.quantity
        const unit = getUnitPlural(quantity, product.unit)
        const productText = `${quantity}x ${product.name}`

        // Truncate text if it's too long for the column - reduce max width since we have more columns
        const maxTextWidth = columnWidth - 8 // Reduced from 10 to 8 for tighter spacing
        let displayText = productText

        // Simple text truncation
        if (doc.getTextWidth(displayText) > maxTextWidth) {
          while (doc.getTextWidth(displayText + "...") > maxTextWidth && displayText.length > 10) {
            displayText = displayText.slice(0, -1)
          }
          displayText += "..."
        }

        doc.text(displayText, xPositions[colIndex] + 5, yPosition)
      }
    }

    yPosition += 6
  }

  // Add a new page for ingredients
  if (Object.keys(calculatedIngredients).length > 0) {
    drawFooter()
    doc.addPage()
    pageNumber++
    drawHeader()
    doc.setTextColor(0, 0, 0)

    // Draw ingredients title
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text("Zutaten", 20, 25)
    // Set text color to black for ingredients section
    doc.setTextColor(0, 0, 0)
    doc.line(20, 28, pageWidth - 20, 28)

    // Draw ingredients
    doc.setFontSize(10) // Changed from 12 to 10 for consistency
    doc.setFont("helvetica", "normal")

    yPosition = 35

    // Sort ingredients alphabetically
    const sortedIngredients = Object.entries(calculatedIngredients).sort(([a], [b]) => a.localeCompare(b))

    for (const [ingredient, details] of sortedIngredients) {
      if (yPosition > maxYPosition) {
        // Add a new page if we run out of space
        drawFooter()
        doc.addPage()
        pageNumber++
        drawHeader()
        doc.setTextColor(0, 0, 0)
        // Reset font settings for new ingredients page
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 0, 0)
        doc.text("Zutaten", 20, 25)
        doc.line(20, 28, pageWidth - 20, 28)
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        yPosition = 35
      }

      // Draw checkbox
      doc.rect(20, yPosition - 3, 3, 3)

      // Draw ingredient name
      doc.setFontSize(10)
      doc.text(ingredient, 25, yPosition)

      // Draw packaging info
      const packagingCount = details.packagingCount
      const packaging = details.packaging
      const amountPerPackage = details.amountPerPackage
      const unit = details.unit

      doc.setFontSize(10)
      const packagingText = `${packagingCount} ${getUnitPlural(packagingCount, packaging)} à ${formatWeight(amountPerPackage, unit)}`
      doc.text(packagingText, 100, yPosition)

      // Draw total amount
      doc.setFontSize(10)
      const totalText = formatWeight(details.totalAmount, unit)
      doc.text(totalText, 180, yPosition)

      yPosition += 6
    }
  }

  // Draw signature box at the bottom
  const boxY = pageHeight - 30
  doc.rect(20, boxY, pageWidth - 40, 15)
  doc.text(
    "Erledigt von: ______________________                         Datum & Uhrzeit: _____________________",
    25,
    boxY + 10,
  )

  // Draw final footer
  drawFooter()

  // Format filename based on mode
  let fileName = ""

  if (mode === "packliste" && eventDetails.date) {
    try {
      // Parse the date from DD.MM.YYYY format
      const dateParts = eventDetails.date.split(".")
      if (dateParts.length === 3) {
        const day = dateParts[0]
        const month = dateParts[1]
        const year = dateParts[2]
        fileName = `${year}-${month}-${day}_${eventDetails.name || "Packliste"}`
      } else {
        fileName = `${eventDetails.date}_${eventDetails.name || "Packliste"}`
      }
    } catch (error) {
      fileName = `${eventDetails.date}_${eventDetails.name || "Packliste"}`
    }
  } else if (mode === "bestellung" && eventDetails.supplierName) {
    fileName = `Bestellung_${eventDetails.supplierName}_${eventDetails.date || "Kein-Datum"}`
  } else {
    fileName = `${getTitle()}_${eventDetails.name || "Dokument"}_${eventDetails.date || "Kein-Datum"}`
  }

  fileName = fileName.replace(/\s+/g, "_").replace(/[^\w\-.]/g, "")

  // Use the browser's file save dialog
  doc.setProperties({
    title: fileName,
    subject: getTitle(),
    author: "I Eat Vienna",
    keywords: `${getTitle()}, ${eventDetails.type}, ${eventDetails.name}`,
    creator: "I Eat Vienna App",
  })

  // Save with file dialog
  doc.save(`${fileName}.pdf`)
}

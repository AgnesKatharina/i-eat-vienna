"use client"

import jsPDF from "jspdf"
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
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const pageNumber = 1

  // Set font
  pdf.setFont("helvetica")

  // Title
  pdf.setFontSize(18)
  pdf.setFont("helvetica", "bold")
  pdf.text(`Packliste: ${eventDetails.name}`, 20, 25)

  // Event info
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "normal")
  let yPos = 35
  pdf.text(`${eventDetails.type} | ${eventDetails.date || "Kein Datum"}`, 20, yPos)

  if (eventDetails.ft) {
    yPos += 6
    pdf.text(`Foodtruck: ${eventDetails.ft}`, 20, yPos)
  }

  if (eventDetails.ka) {
    yPos += 6
    pdf.text(`Kühlanhänger: ${eventDetails.ka}`, 20, yPos)
  }

  yPos += 15

  // Group products by category
  const productsByCategory: Record<string, { name: string; quantity: number; unit: string }[]> = {}

  Object.entries(selectedProducts).forEach(([productName, details]) => {
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

  const sortedCategories = Object.keys(productsByCategory).sort()

  // Products section
  pdf.setFontSize(14)
  pdf.setFont("helvetica", "bold")
  pdf.text("Produkte", 20, yPos)
  yPos += 10

  // Create a grid layout for categories
  const categoriesPerRow = 3
  const categoryWidth = 60
  const categoryHeight = 50
  let currentRow = 0
  let currentCol = 0

  sortedCategories.forEach((category, index) => {
    const products = productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name))

    const xPos = 20 + currentCol * categoryWidth
    const categoryYPos = yPos + currentRow * categoryHeight

    // Category title
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    pdf.text(category, xPos, categoryYPos)

    // Products in category
    pdf.setFontSize(8)
    pdf.setFont("helvetica", "normal")
    let productYPos = categoryYPos + 6

    products.forEach((product) => {
      if (productYPos < 280) {
        // Check if we have space on the page
        // Checkbox
        pdf.rect(xPos, productYPos - 2, 2, 2)
        // Product text
        pdf.text(`${product.quantity}x ${product.name}`, xPos + 4, productYPos)
        productYPos += 4
      }
    })

    currentCol++
    if (currentCol >= categoriesPerRow) {
      currentCol = 0
      currentRow++
    }
  })

  // Add new page for ingredients if there are any
  if (Object.keys(calculatedIngredients).length > 0) {
    pdf.addPage()
    yPos = 25

    // Ingredients title
    pdf.setFontSize(16)
    pdf.setFont("helvetica", "bold")
    pdf.text("Zutaten", 20, yPos)
    yPos += 15

    // Table headers
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    pdf.text("☐", 20, yPos)
    pdf.text("Zutat", 30, yPos)
    pdf.text("Verpackung", 100, yPos)
    pdf.text("Gesamtmenge", 150, yPos)

    // Draw header line
    pdf.line(20, yPos + 2, 190, yPos + 2)
    yPos += 8

    // Ingredients data
    pdf.setFont("helvetica", "normal")
    Object.entries(calculatedIngredients)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([ingredient, details]) => {
        if (yPos > 280) {
          pdf.addPage()
          yPos = 25
        }

        // Checkbox
        pdf.rect(20, yPos - 2, 2, 2)

        // Ingredient name
        pdf.text(ingredient, 30, yPos)

        // Packaging info
        const packagingText = `${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}`
        pdf.text(packagingText, 100, yPos)

        // Total amount
        pdf.text(formatWeight(details.totalAmount, details.unit), 150, yPos)

        // Light border
        pdf.setDrawColor(200, 200, 200)
        pdf.line(20, yPos + 2, 190, yPos + 2)

        yPos += 6
      })
  }

  // Add signature box at the end
  const finalPage = pdf.internal.getNumberOfPages()
  pdf.setPage(finalPage)

  // Get current page height and add signature box near bottom
  const signatureYPos = pageHeight - 40

  // Signature box
  pdf.setDrawColor(0, 0, 0)
  pdf.rect(20, signatureYPos, 170, 25)

  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.text(
    "Erledigt von: ______________________          Datum & Uhrzeit: _____________________",
    25,
    signatureYPos + 15,
  )

  // Save the PDF
  const fileName = `Packliste_${eventDetails.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
  pdf.save(fileName)
}

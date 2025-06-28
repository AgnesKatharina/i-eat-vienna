import jsPDF from "jspdf"
import type { SelectedProduct, EventDetails, CalculatedIngredient } from "./types"

export async function generatePdf(
  selectedProducts: Record<string, SelectedProduct>,
  calculatedIngredients: Record<string, CalculatedIngredient>,
  eventDetails: EventDetails,
  formatWeight: (value: number, unit: string) => string,
  getUnitPlural: (quantity: number, unit: string) => string,
  mode = "packliste",
  productCategories: Record<string, string> = {},
) {
  const pdf = new jsPDF()
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - 2 * margin
  let yPosition = margin

  // Helper function to add text with automatic line wrapping
  const addText = (text: string, x: number, y: number, maxWidth?: number) => {
    if (maxWidth) {
      const lines = pdf.splitTextToSize(text, maxWidth)
      pdf.text(lines, x, y)
      return y + lines.length * 7
    } else {
      pdf.text(text, x, y)
      return y + 7
    }
  }

  // Helper function to check if we need a new page
  const checkNewPage = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Title
  pdf.setFontSize(18)
  pdf.setFont("helvetica", "bold")
  yPosition = addText(`Packliste: ${eventDetails.name}`, margin, yPosition)
  yPosition += 5

  // Event details
  pdf.setFontSize(12)
  pdf.setFont("helvetica", "normal")
  const eventInfo = [
    eventDetails.type,
    eventDetails.date || "Kein Datum",
    eventDetails.ft ? eventDetails.ft : null,
    eventDetails.ka ? eventDetails.ka : null,
  ]
    .filter(Boolean)
    .join(" | ")

  yPosition = addText(eventInfo, margin, yPosition)
  yPosition += 10

  // Draw line under header
  pdf.setLineWidth(0.5)
  pdf.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 15

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

  // Sort categories
  const sortedCategories = Object.keys(productsByCategory).sort()

  // Products section
  pdf.setFontSize(14)
  pdf.setFont("helvetica", "bold")
  yPosition = addText("Produkte", margin, yPosition)
  yPosition += 10

  // Calculate grid layout
  const categoriesPerRow = 3
  const categoryWidth = contentWidth / categoriesPerRow
  const categoryHeight = 80

  let currentRow = 0
  let currentCol = 0

  sortedCategories.forEach((category, index) => {
    const products = productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name))

    // Check if we need a new page
    if (currentCol === 0) {
      checkNewPage(categoryHeight + 20)
    }

    const xPos = margin + currentCol * categoryWidth
    const yPos = yPosition + currentRow * categoryHeight

    // Category title
    pdf.setFontSize(12)
    pdf.setFont("helvetica", "bold")
    pdf.text(category, xPos, yPos)

    // Draw line under category title
    pdf.setLineWidth(0.3)
    pdf.line(xPos, yPos + 2, xPos + categoryWidth - 10, yPos + 2)

    // Products in category
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    let productY = yPos + 10

    products.forEach((product) => {
      if (productY < yPos + categoryHeight - 10) {
        // Draw checkbox
        pdf.rect(xPos, productY - 3, 3, 3)

        // Product text
        const productText = `${product.quantity}x ${product.name}`
        pdf.text(productText, xPos + 6, productY, { maxWidth: categoryWidth - 20 })
        productY += 6
      }
    })

    // Move to next column/row
    currentCol++
    if (currentCol >= categoriesPerRow) {
      currentCol = 0
      currentRow++
    }
  })

  // Move yPosition after the grid
  yPosition += Math.ceil(sortedCategories.length / categoriesPerRow) * categoryHeight + 20

  // Ingredients section
  if (Object.keys(calculatedIngredients).length > 0) {
    checkNewPage(100)

    pdf.setFontSize(14)
    pdf.setFont("helvetica", "bold")
    yPosition = addText("Zutaten", margin, yPosition)
    yPosition += 10

    // Table headers
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "bold")
    const colWidths = [20, 80, 60, 60]
    const colPositions = [
      margin,
      margin + colWidths[0],
      margin + colWidths[0] + colWidths[1],
      margin + colWidths[0] + colWidths[1] + colWidths[2],
    ]

    // Header row
    pdf.rect(colPositions[0], yPosition - 5, colWidths[0], 8)
    pdf.rect(colPositions[1], yPosition - 5, colWidths[1], 8)
    pdf.rect(colPositions[2], yPosition - 5, colWidths[2], 8)
    pdf.rect(colPositions[3], yPosition - 5, colWidths[3], 8)

    pdf.text("", colPositions[0] + 2, yPosition)
    pdf.text("Zutat", colPositions[1] + 2, yPosition)
    pdf.text("Verpackung", colPositions[2] + 2, yPosition)
    pdf.text("Gesamtmenge", colPositions[3] + 2, yPosition)
    yPosition += 10

    // Table rows
    pdf.setFont("helvetica", "normal")
    Object.entries(calculatedIngredients)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([ingredient, details]) => {
        checkNewPage(15)

        // Draw table borders
        pdf.rect(colPositions[0], yPosition - 5, colWidths[0], 8)
        pdf.rect(colPositions[1], yPosition - 5, colWidths[1], 8)
        pdf.rect(colPositions[2], yPosition - 5, colWidths[2], 8)
        pdf.rect(colPositions[3], yPosition - 5, colWidths[3], 8)

        // Checkbox
        pdf.rect(colPositions[0] + 2, yPosition - 3, 3, 3)

        // Content
        pdf.text(ingredient, colPositions[1] + 2, yPosition, { maxWidth: colWidths[1] - 4 })

        const packagingText = `${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}`
        pdf.text(packagingText, colPositions[2] + 2, yPosition, { maxWidth: colWidths[2] - 4 })

        pdf.text(formatWeight(details.totalAmount, details.unit), colPositions[3] + 2, yPosition, {
          maxWidth: colWidths[3] - 4,
        })

        yPosition += 10
      })
  }

  // Signature box
  yPosition += 20
  checkNewPage(40)

  pdf.setLineWidth(0.5)
  pdf.rect(margin, yPosition, contentWidth, 30)

  pdf.setFontSize(10)
  pdf.setFont("helvetica", "normal")
  pdf.text("Erledigt von: ______________________", margin + 5, yPosition + 15)
  pdf.text("Datum & Uhrzeit: _____________________", margin + contentWidth / 2, yPosition + 15)

  // Save the PDF
  const fileName = `Packliste_${eventDetails.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
  pdf.save(fileName)
}

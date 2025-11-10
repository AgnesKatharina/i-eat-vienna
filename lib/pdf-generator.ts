"use client"

import jsPDF from "jspdf"
import "jspdf-autotable"
import type { Product, Event, NachbestellungItem, EventDetails } from "@/lib/types"
import { calculateIngredientsForEvent } from "@/lib/foodtruck-equipment-service"
import { drawSpecialInfosSection } from "@/lib/pdf-generator-utils" // Import the drawSpecialInfosSection function

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface PackagingInfo {
  packaging: string
  amountPerPackage: number
  packagingCount: number
}

interface CalculatedIngredient {
  totalAmount: number
  unit: string
  packaging: string
  amountPerPackage: number
  packagingCount: number
}

interface GroupedProducts {
  [category: string]: Array<{
    name: string
    quantity: number
    unit: string
    packaging?: PackagingInfo
  }>
}

interface IngredientWithPackaging {
  name: string
  totalAmount: number
  unit: string
  packaging: string
  amountPerPackage: number
  packagingCount: number
  foodType?: string
}

interface TableColumn {
  header: string
  width: number
  align?: "left" | "center" | "right"
}

interface TableRow {
  [key: string]: string
}

class CustomTable {
  private doc: jsPDF
  private columns: TableColumn[]
  private rows: TableRow[]
  private startY: number
  private currentY: number
  private pageHeight: number
  private margin: number
  private rowHeight: number
  private headerHeight: number

  constructor(doc: jsPDF, columns: TableColumn[], rows: TableRow[], startY = 20) {
    this.doc = doc
    this.columns = columns
    this.rows = rows
    this.startY = startY
    this.currentY = startY
    this.pageHeight = doc.internal.pageSize.getHeight()
    this.margin = 20
    this.rowHeight = 12 // Increased row height for font size 14
    this.headerHeight = 12 // Increased header height for font size 14
  }

  private drawHeader() {
    const startX = this.margin
    let currentX = startX

    // Header background
    this.doc.setFillColor(230, 230, 230)
    this.doc.rect(startX, this.currentY, this.getTotalWidth(), this.headerHeight, "F")

    // Header border
    this.doc.setDrawColor(0, 0, 0)
    this.doc.rect(startX, this.currentY, this.getTotalWidth(), this.headerHeight)

    // Header text
    this.doc.setFont("helvetica", "bold")
    this.doc.setFontSize(14) // Increased to 14
    this.doc.setTextColor(0, 0, 0)

    this.columns.forEach((column) => {
      const textY = this.currentY + this.headerHeight / 2 + 3 // Adjusted for larger font

      if (column.align === "center") {
        this.doc.text(column.header, currentX + column.width / 2, textY, { align: "center" })
      } else if (column.align === "right") {
        this.doc.text(column.header, currentX + column.width - 2, textY, { align: "right" })
      } else {
        this.doc.text(column.header, currentX + 2, textY)
      }

      // Column separator
      if (currentX > startX) {
        this.doc.line(currentX, this.currentY, currentX, this.currentY + this.headerHeight)
      }

      currentX += column.width
    })

    this.currentY += this.headerHeight
  }

  private drawRow(row: TableRow, isEven = false) {
    const startX = this.margin
    let currentX = startX

    // Alternate row background
    if (isEven) {
      this.doc.setFillColor(245, 245, 245)
      this.doc.rect(startX, this.currentY, this.getTotalWidth(), this.rowHeight, "F")
    }

    // Row border
    this.doc.setDrawColor(200, 200, 200)
    this.doc.rect(startX, this.currentY, this.getTotalWidth(), this.rowHeight)

    // Row text
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(14) // Increased to 14
    this.doc.setTextColor(0, 0, 0)

    this.columns.forEach((column, index) => {
      const text = row[index.toString()] || ""
      const textY = this.currentY + this.rowHeight / 2 + 4 // Adjusted for larger font

      if (index === 0) {
        // Checkbox column - draw checkbox centered
        const checkboxSize = 4 // Slightly larger checkbox for better proportion
        const checkboxX = currentX + (column.width - checkboxSize) / 2
        const checkboxY = this.currentY + (this.rowHeight - checkboxSize) / 2
        this.doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize)
      } else {
        // Text columns
        if (column.align === "center") {
          this.doc.text(text, currentX + column.width / 2, textY, { align: "center" })
        } else if (column.align === "right") {
          this.doc.text(text, currentX + column.width - 2, textY, { align: "right" })
        } else {
          this.doc.text(text, currentX + 2, textY)
        }
      }

      // Column separator
      if (currentX > startX) {
        this.doc.line(currentX, this.currentY, currentX, this.currentY + this.rowHeight)
      }

      currentX += column.width
    })

    this.currentY += this.rowHeight
  }

  private getTotalWidth(): number {
    return this.columns.reduce((sum, col) => sum + col.width, 0)
  }

  private checkPageBreak(): boolean {
    if (this.currentY + this.rowHeight > this.pageHeight - 30) {
      this.doc.addPage()
      this.drawHeader()
      this.drawFooter()
      this.currentY = 30
      this.drawHeader()
      return true
    }
    return false
  }

  public render() {
    this.drawHeader()

    this.rows.forEach((row, index) => {
      this.checkPageBreak()
      this.drawRow(row, index % 2 === 0)
    })

    return this.currentY
  }

  private drawFooter() {
    const startX = this.margin
    const endX = this.doc.internal.pageSize.getWidth() - this.margin
    const textY = this.doc.internal.pageSize.getHeight() - 10

    // Footer text
    this.doc.setFont("helvetica", "normal")
    this.doc.setFontSize(10)
    this.doc.setTextColor(128, 128, 128)
    this.doc.text(`Seite ${this.doc.internal.getNumberOfPages()}`, endX, textY, { align: "right" })

    // Footer border
    this.doc.setDrawColor(0, 0, 0)
    this.doc.line(startX, textY - 5, endX, textY - 5)
  }
}

export async function generatePdf(
  selectedProducts: Record<string, { quantity: number; unit: string }>,
  calculatedIngredients: Record<string, CalculatedIngredient>,
  eventDetails: EventDetails,
  formatWeight: (value: number, unit: string) => string,
  getUnitPlural: (quantity: number, unit: string) => string,
  mode = "packliste",
  productCategories: Record<string, string> = {},
  ingredientFoodTypes: Record<string, string> = {},
) {
  const doc = new jsPDF({
    orientation: "portrait", // Changed from landscape to portrait
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let currentPageNumber = 1
  const maxColumns = 3 // Changed from 6 to 3 for portrait format
  const numCategories = 6

  const getTitle = () => {
    switch (mode) {
      case "packliste":
        return "Packliste"
      case "einkaufen":
        return "Einkaufsliste"
      case "bestellung":
        return "Bestellung"
      case "nachbestellung":
        return "Nachbestellung"
      default:
        return "Liste"
    }
  }

  const drawHeader = () => {
    doc.setFontSize(10)
    doc.setTextColor(128, 128, 128)

    // Build header text: Event name, Event type, date (and end date if exists), FT, KA
    let headerText = `${eventDetails.name} | ${eventDetails.type}`

    // Add start date
    if (eventDetails.date) {
      headerText += ` | ${eventDetails.date}`

      // Add end date if it exists and is different from start date
      if (eventDetails.endDate && eventDetails.endDate !== eventDetails.date && eventDetails.endDate.trim() !== "") {
        headerText += ` - ${eventDetails.endDate}`
      }
    }

    if (eventDetails.ft && eventDetails.ft !== "none") {
      headerText += ` | ${eventDetails.ft}`
    }

    if (eventDetails.ka && eventDetails.ka !== "none") {
      headerText += ` | ${eventDetails.ka}`
    }

    doc.text(headerText, 20, 12)
    doc.line(20, 15, pageWidth - 20, 15)
  }

  const drawFooter = () => {
    doc.setFontSize(10)
    doc.setTextColor(128, 128, 128)

    // Build footer text: Event name, Event type, date (and end date if exists), FT, KA
    let footerText = `${eventDetails.name} | ${eventDetails.type}`

    // Add start date
    if (eventDetails.date) {
      footerText += ` | ${eventDetails.date}`

      // Add end date if it exists and is different from start date
      if (eventDetails.endDate && eventDetails.endDate !== eventDetails.date && eventDetails.endDate.trim() !== "") {
        footerText += ` - ${eventDetails.endDate}`
      }
    }

    if (eventDetails.ft && eventDetails.ft !== "none") {
      footerText += ` | ${eventDetails.ft}`
    }

    if (eventDetails.ka && eventDetails.ka !== "none") {
      footerText += ` | ${eventDetails.ka}`
    }

    doc.text(footerText, 20, pageHeight - 10)
    doc.text(`Seite ${currentPageNumber}`, pageWidth - 35, pageHeight - 10)
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)
  }

  // Draw header and footer on first page
  drawHeader()
  drawFooter()
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  const titleText = `${getTitle()}: ${eventDetails.name}`
  doc.text(titleText, 20, 25)
  doc.line(20, 28, pageWidth - 20, 28)

  let currentY = 35
  if (eventDetails.notes && eventDetails.notes.trim() !== "") {
    currentY = drawSpecialInfosSection(doc, eventDetails.notes, currentY)
  }

  // Group products by category - Include ALL categories with selected products
  const productsByCategory: Record<string, { name: string; quantity: number; unit: string }[]> = {}

  console.log("🔍 DEBUG: Starting product categorization...")
  console.log("📦 Selected products:", Object.keys(selectedProducts))
  console.log("🏷️ Product categories mapping:", productCategories)

  Object.entries(selectedProducts).forEach(([productName, details]) => {
    const category = productCategories[productName] || "Sonstige"
    console.log(`📋 Product "${productName}" -> Category "${category}"`)

    if (!productsByCategory[category]) {
      productsByCategory[category] = []
    }
    productsByCategory[category].push({
      name: productName,
      quantity: details.quantity,
      unit: details.unit,
    })
  })

  console.log("📊 Final products by category:", productsByCategory)

  // Define the correct order of categories for Packliste mode - Include ALL categories
  const packlisteCategories = ["Essen", "Getränke Pet", "Getränke Glas", "Getränke Spezial", "Equipment", "Kassa"]

  // Filter to only include categories that have products
  const categoriesWithProducts = packlisteCategories.filter(
    (category) => productsByCategory[category] && productsByCategory[category].length > 0,
  )

  console.log("✅ Categories with products:", categoriesWithProducts)

  // Calculate column layout - Use 3 columns for portrait format
  const columnWidth = (pageWidth - 40) / maxColumns
  const xPositions = Array.from({ length: maxColumns }, (_, i) => 20 + i * columnWidth)
  let yPosition = currentY // Use currentY from Special Infos section instead of fixed 35

  // Only draw products if there are any
  if (Object.keys(selectedProducts).length > 0) {
    // Since we have 6 categories but only 3 columns, we need to draw in multiple rows
    const categoriesPerRow = maxColumns
    const totalRows = Math.ceil(categoriesWithProducts.length / categoriesPerRow)

    for (let row = 0; row < totalRows; row++) {
      const startCategoryIndex = row * categoriesPerRow
      const endCategoryIndex = Math.min(startCategoryIndex + categoriesPerRow, categoriesWithProducts.length)
      const categoriesInThisRow = categoriesWithProducts.slice(startCategoryIndex, endCategoryIndex)

      // Draw category headers for this row - all bold
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      for (let i = 0; i < categoriesInThisRow.length; i++) {
        const category = categoriesInThisRow[i]
        console.log(`🏷️ Drawing category header: ${category} at position ${i} in row ${row}`)
        doc.text(category, xPositions[i], yPosition)
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      yPosition += 8

      const maxYPosition = pageHeight - 25
      const maxProductsInThisRow = Math.max(0, ...categoriesInThisRow.map((cat) => productsByCategory[cat].length))

      console.log(`📏 Max products in row ${row}: ${maxProductsInThisRow}`)

      // Draw products in columns for this row
      for (let productIndex = 0; productIndex < maxProductsInThisRow; productIndex++) {
        if (yPosition > maxYPosition) {
          // Add new page
          doc.addPage()
          currentPageNumber++

          // Draw header and footer on new page
          drawHeader()
          drawFooter()
          doc.setTextColor(0, 0, 0)
          yPosition = 35

          // Redraw category headers on new page - all bold
          doc.setFont("helvetica", "bold")
          doc.setFontSize(12)
          for (let i = 0; i < categoriesInThisRow.length; i++) {
            const category = categoriesInThisRow[i]
            doc.text(category, xPositions[i], yPosition)
          }
          doc.setFont("helvetica", "normal")
          doc.setFontSize(9)
          yPosition += 8
        }

        for (let colIndex = 0; colIndex < categoriesInThisRow.length; colIndex++) {
          const category = categoriesInThisRow[colIndex]
          const products = productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name))

          if (productIndex < products.length) {
            const product = products[productIndex]

            // Draw checkbox
            doc.rect(xPositions[colIndex], yPosition - 3, 3, 3)

            // Set font to bold for specific categories' products
            if (category === "Equipment" || category === "Getränke Glas" || category === "Getränke Pet") {
              doc.setFont("helvetica", "bold")
            } else {
              doc.setFont("helvetica", "normal")
            }

            // Draw product text
            const productText = `${product.quantity}x ${product.name}`
            const maxTextWidth = columnWidth - 8
            let displayText = productText

            // Truncate text if too long
            if (doc.getTextWidth(displayText) > maxTextWidth) {
              while (doc.getTextWidth(displayText + "...") > maxTextWidth && displayText.length > 10) {
                displayText = displayText.slice(0, -1)
              }
              displayText += "..."
            }

            console.log(`📝 Drawing product: ${displayText} in category ${category}`)
            doc.text(displayText, xPositions[colIndex] + 5, yPosition)
          }
        }
        // Reset font to normal for the next row to avoid carry-over styling
        doc.setFont("helvetica", "normal")
        yPosition += 6
      }

      // Add space between category rows
      yPosition += 15
    }
  }

  // Force a single page break after the product categories section if it exists
  if (Object.keys(selectedProducts).length > 0) {
    doc.addPage()
    currentPageNumber++
    drawHeader()
    drawFooter()
    doc.setTextColor(0, 0, 0)
  }

  currentY = 25

  // Add ingredients table if available
  if (Object.keys(calculatedIngredients).length > 0) {
    if (currentY > pageHeight - 100) {
      doc.addPage()
      currentPageNumber++
      drawHeader()
      drawFooter()
      doc.setTextColor(0, 0, 0)
      currentY = 25
    }

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Zutaten", 20, currentY)
    doc.line(20, currentY + 3, pageWidth - 20, currentY + 3)

    currentY += 10

    // Separate ingredients by food classification
    const foodIngredients: Record<string, CalculatedIngredient> = {}
    const nonFoodIngredients: Record<string, CalculatedIngredient> = {}

    Object.entries(calculatedIngredients).forEach(([ingredientName, details]) => {
      const foodType = ingredientFoodTypes[ingredientName] || "unclassified"

      if (foodType === "food") {
        foodIngredients[ingredientName] = details
      } else {
        // Treat both 'non-food' and unclassified as Non Food
        nonFoodIngredients[ingredientName] = details
      }
    })

    // Function to draw ingredients section
    const drawIngredientsSection = (ingredients: Record<string, CalculatedIngredient>, title: string) => {
      if (Object.keys(ingredients).length === 0) return currentY

      if (currentY > pageHeight - 50) {
        doc.addPage()
        currentPageNumber++
        drawHeader()
        drawFooter()
        doc.setTextColor(0, 0, 0)
        currentY = 25
      }

      // Section title
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(title, 20, currentY)
      doc.line(20, currentY + 2, pageWidth - 20, currentY + 2)
      currentY += 10

      // Table header - Optimized column widths for portrait format
      const startX = 20
      const availableWidth = pageWidth - 40 // Total available width minus margins
      const colWidths = [12, 50, 70, 38] // checkbox, ingredient, total amount, required amount - optimized for portrait
      let currentX = startX

      // Verify total width fits
      const totalTableWidth = colWidths.reduce((sum, w) => sum + w, 0)
      console.log(`📐 Table width: ${totalTableWidth}mm, Available: ${availableWidth}mm`)

      // Header background
      doc.setFillColor(230, 230, 230)
      doc.rect(startX, currentY, totalTableWidth, 10, "F") // Reduced header height

      // Header border
      doc.setDrawColor(0, 0, 0)
      doc.rect(startX, currentY, totalTableWidth, 10) // Reduced header height

      // Header text
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10) // Reduced from 14 to 10
      const headers = ["", "Zutat", "Gesamtmenge", "Benötigte Menge"]

      headers.forEach((header, index) => {
        if (index === 0) {
          // Checkbox column - no text
        } else if (index === 3) {
          // Right align for "Benötigte Menge"
          doc.text(header, currentX + colWidths[index] - 2, currentY + 7, { align: "right" })
        } else {
          doc.text(header, currentX + 2, currentY + 7)
        }

        if (currentX > startX) {
          doc.line(currentX, currentY, currentX, currentY + 10)
        }
        currentX += colWidths[index]
      })

      currentY += 10 // Adjusted for new header height

      // Table rows
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9) // Reduced from 14 to 9

      Object.entries(ingredients)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([ingredient, details], rowIndex) => {
          // Check if we need a new page
          if (currentY + 10 > pageHeight - 30) {
            doc.addPage()
            currentPageNumber++
            drawHeader()
            drawFooter()
            doc.setTextColor(0, 0, 0)
            currentY = 25

            doc.setFontSize(12)
            doc.setFont("helvetica", "bold")
            doc.text(`${title} (Fortsetzung)`, 20, currentY)
            doc.line(20, currentY + 2, pageWidth - 20, currentY + 2)
            currentY += 10

            // Only redraw table header on new page
            currentX = startX

            // Header background
            doc.setFillColor(230, 230, 230)
            doc.rect(startX, currentY, totalTableWidth, 10, "F")

            // Header border
            doc.setDrawColor(0, 0, 0)
            doc.rect(startX, currentY, totalTableWidth, 10)

            // Header text
            doc.setFont("helvetica", "bold")
            doc.setFontSize(10)

            headers.forEach((header, index) => {
              if (index === 0) {
                // Checkbox column - no text
              } else if (index === 3) {
                // Right align for "Benötigte Menge"
                doc.text(header, currentX + colWidths[index] - 2, currentY + 7, { align: "right" })
              } else {
                doc.text(header, currentX + 2, currentY + 7)
              }

              if (currentX > startX) {
                doc.line(currentX, currentY, currentX, currentY + 10)
              }
              currentX += colWidths[index]
            })

            currentY += 10
            doc.setFont("helvetica", "normal")
            doc.setFontSize(9)
          }

          currentX = startX

          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc.setFillColor(245, 245, 245)
            doc.rect(startX, currentY, totalTableWidth, 10, "F") // Reduced row height
          }

          // Row border
          doc.setDrawColor(200, 200, 200)
          doc.rect(startX, currentY, totalTableWidth, 10) // Reduced row height

          // Row content
          const rowData = [
            "", // Checkbox
            ingredient,
            `${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}`,
            formatWeight(details.totalAmount, details.unit),
          ]

          rowData.forEach((text, index) => {
            if (index === 0) {
              // Draw checkbox
              const checkboxSize = 3 // Smaller checkbox for compact layout
              const checkboxX = currentX + (colWidths[index] - checkboxSize) / 2
              const checkboxY = currentY + (10 - checkboxSize) / 2
              doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize)
            } else {
              const textY = currentY + 7 // Adjusted for new row height and font size

              // Make "Zutat" (index 1) and "Gesamtmenge" (index 2) columns bold
              if (index === 1 || index === 2) {
                doc.setFont("helvetica", "bold")
              } else {
                doc.setFont("helvetica", "normal")
              }

              if (index === 3) {
                // Right align for required amount
                let displayText = text
                const maxWidth = colWidths[index] - 4
                if (doc.getTextWidth(displayText) > maxWidth) {
                  while (doc.getTextWidth(displayText + "...") > maxWidth && displayText.length > 3) {
                    displayText = displayText.slice(0, -1)
                  }
                  displayText += "..."
                }
                doc.text(displayText, currentX + colWidths[index] - 2, textY, { align: "right" })
              } else {
                // For other columns, truncate text if too long
                let displayText = text
                const maxWidth = colWidths[index] - 4
                if (doc.getTextWidth(displayText) > maxWidth) {
                  while (doc.getTextWidth(displayText + "...") > maxWidth && displayText.length > 3) {
                    displayText = displayText.slice(0, -1)
                  }
                  displayText += "..."
                }
                doc.text(displayText, currentX + 2, textY)
              }
            }

            if (currentX > startX) {
              doc.line(currentX, currentY, currentX, currentY + 10)
            }
            currentX += colWidths[index]
          })

          currentY += 10 // Adjusted for new row height
        })
      currentY += 10 // Space after section
      return currentY
    }

    // Draw Non Food section first
    currentY = drawIngredientsSection(nonFoodIngredients, "Non Food")

    // Draw Food section second - no forced page break, let it flow naturally
    currentY = drawIngredientsSection(foodIngredients, "Food")
  }

  // Check if we need a new page for signature
  if (currentY > pageHeight - 50) {
    doc.addPage()
    currentPageNumber++
    drawHeader()
    drawFooter()
    doc.setTextColor(0, 0, 0)
    currentY = 25
  }

  console.log("✍️ Adding signature section at yPosition:", currentY)

  // Draw the signature box border - make it flatter and ensure it fits
  const signatureBoxHeight = 25
  const signatureBoxWidth = 170 // Fixed safe width
  const signatureBoxX = 20
  doc.setLineWidth(1)
  doc.rect(signatureBoxX, currentY, signatureBoxWidth, signatureBoxHeight)

  // Add signature fields side by side with underlines
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")

  // Left field: Erledigt von - calculate exact text width
  const leftFieldX = signatureBoxX + 5
  const fieldY = currentY + 15
  const leftText = "Erledigt von:"
  doc.text(leftText, leftFieldX, fieldY)

  const leftTextWidth = doc.getTextWidth(leftText)
  doc.setLineWidth(0.3) // Very thin line
  doc.setDrawColor(0, 0, 0) // Black color
  const leftUnderlineStart = leftFieldX + leftTextWidth // Start immediately after text
  const leftUnderlineEnd = leftFieldX + 80
  doc.line(leftUnderlineStart, fieldY, leftUnderlineEnd, fieldY) // Same Y position as text baseline

  // Right field: Datum & Uhrzeit - calculate exact text width
  const rightFieldX = leftFieldX + 85
  const rightText = "Datum & Uhrzeit:"
  doc.text(rightText, rightFieldX, fieldY)

  const rightTextWidth = doc.getTextWidth(rightText)
  const rightUnderlineStart = rightFieldX + rightTextWidth // Start immediately after text
  const rightUnderlineEnd = signatureBoxX + signatureBoxWidth - 5
  doc.line(rightUnderlineStart, fieldY, rightUnderlineEnd, fieldY) // Same Y position as text baseline

  console.log("[v0] Signature section added successfully")

  // Generate filename
  let fileName = ""
  if (mode === "packliste") {
    const eventName = eventDetails.name ? eventDetails.name.replace(/[^a-zA-Z0-9]/g, "_") : "Event"
    const eventType = eventDetails.type ? eventDetails.type.replace(/[^a-zA-Z0-9]/g, "_") : "Event"

    if (eventDetails.date) {
      // Convert date from DD.MM.YYYY to YYYY-MM-DD format
      let formattedDate = eventDetails.date
      if (eventDetails.date.includes(".")) {
        const dateParts = eventDetails.date.split(".")
        if (dateParts.length === 3) {
          formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
        }
      }
      fileName = `${formattedDate}_${eventName}_${eventType}`
    } else {
      fileName = `nodate_${eventName}_${eventType}`
    }
  } else if (mode === "bestellung" && eventDetails.supplierName) {
    // Convert date if available
    let formattedDate = "nodate"
    if (eventDetails.date && eventDetails.date.includes(".")) {
      const dateParts = eventDetails.date.split(".")
      if (dateParts.length === 3) {
        formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      }
    }
    fileName = `${formattedDate}_${eventDetails.supplierName}_Bestellung`
  } else {
    // Convert date if available
    let formattedDate = "nodate"
    if (eventDetails.date && eventDetails.date.includes(".")) {
      const dateParts = eventDetails.date.split(".")
      if (dateParts.length === 3) {
        formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      }
    }
    const eventName = eventDetails.name ? eventDetails.name.replace(/[^a-zA-Z0-9]/g, "_") : "Event"
    const eventType = eventDetails.type ? eventDetails.type.replace(/[^a-zA-Z0-9]/g, "_") : "Event"
    fileName = `${formattedDate}_${eventName}_${eventType}_${getTitle()}`
  }

  // Clean filename
  fileName = fileName.replace(/\s+/g, "_").replace(/[^\w\-.]/g, "")

  // Set document properties
  doc.setProperties({
    title: fileName,
    subject: getTitle(),
    author: "I Eat Vienna",
    keywords: `${getTitle()}, ${eventDetails.type}, ${eventDetails.name}`,
    creator: "I Eat Vienna App",
  })

  console.log("[v0] About to add signature section")

  // Save the PDF
  doc.save(`${fileName}.pdf`)
}

// Additional utility functions for simpler PDF generation
export function generateSimplePacklistePDF(
  products: Array<{ name: string; quantity: number; unit: string; category: string }>,
  eventName = "Event",
  eventDate?: string,
) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Packliste", 20, 20)

  // Event details
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text(`Event: ${eventName}`, 20, 35)

  if (eventDate) {
    doc.setFontSize(12)
    doc.text(`Datum: ${eventDate}`, 20, 45)
  }

  // Group products by category
  const groupedProducts = products.reduce(
    (acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = []
      }
      acc[product.category].push(product)
      return acc
    },
    {} as Record<string, typeof products>,
  )

  let yPosition = eventDate ? 60 : 50

  // Draw products by category
  Object.entries(groupedProducts).forEach(([category, categoryProducts]) => {
    // Category header
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    const categoryText = truncateText(doc, category, 170 - 5)
    doc.text(categoryText, 20, yPosition)
    yPosition += 10

    // Draw border around category
    doc.setLineWidth(0.3)
    doc.rect(20, yPosition - 10, 170, categoryProducts.length * 6 + 5)

    // Products
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    categoryProducts.forEach((product) => {
      if (yPosition + 6 > 270) return // Stop if we run out of space

      // Checkbox
      doc.rect(25, yPosition - 3, 3, 3)

      // Product name and quantity
      const productText = `${truncateText(doc, product.name, 170 * 0.6)} - ${product.quantity} ${product.unit}`
      doc.text(productText, 35, yPosition + 2.5)
      yPosition += 6
    })

    yPosition += 5 // Space between categories
  })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString("de-DE")} - I Eat Vienna`,
    20,
    doc.internal.pageSize.getHeight() - 10,
  )

  // Save
  const today = new Date()
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const filename = `${formattedDate}_${eventName.replace(/\s+/g, "_")}_Packliste.pdf`
  doc.save(filename)
}

export function generateSimpleShoppingListPDF(
  products: Array<{ name: string; quantity: number; unit: string; category: string }>,
  eventName = "Einkaufsliste",
) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.setFont("helvetica", "bold")
  doc.text("Einkaufsliste", 20, 20)

  // Event name
  doc.setFontSize(14)
  doc.setFont("helvetica", "normal")
  doc.text(`Für: ${eventName}`, 20, 35)

  // Group products by category
  const groupedProducts = products.reduce(
    (acc, product) => {
      if (!acc[product.category]) {
        acc[product.category] = []
      }
      acc[product.category].push(product)
      return acc
    },
    {} as Record<string, typeof products>,
  )

  let yPosition = 50

  // Draw products by category
  Object.entries(groupedProducts).forEach(([category, categoryProducts]) => {
    // Category header
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(category, 20, yPosition)
    yPosition += 10

    // Products as checkboxes
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    categoryProducts.forEach((product) => {
      // Checkbox
      doc.rect(25, yPosition - 3, 4, 4)

      // Product text
      const productText = `${product.name} (${product.quantity} ${product.unit})`
      doc.text(productText, 35, yPosition)
      yPosition += 8

      // Check for page break
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
    })

    yPosition += 5 // Space between categories
  })

  // Summary
  yPosition += 10
  doc.setFont("helvetica", "bold")
  doc.text(`Gesamt: ${products.length} Artikel`, 20, yPosition)

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text(
    `Erstellt am ${new Date().toLocaleDateString("de-DE")} - I Eat Vienna`,
    20,
    doc.internal.pageSize.getHeight() - 10,
  )

  // Save
  const today = new Date()
  const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  const filename = `${formattedDate}_${eventName.replace(/\s+/g, "_")}_Einkaufsliste.pdf`
  doc.save(filename)
}

export async function generatePacklistePdf(
  event: Event,
  selectedProducts: Record<string, { quantity: number; unit: string }>,
  allProducts: Product[],
): Promise<void> {
  console.log("📄 === GENERATING PACKLISTE PDF ===")
  console.log("🎯 Event:", event.name)
  console.log("📦 Selected products count:", Object.keys(selectedProducts).length)

  try {
    // Initialize PDF in portrait format
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const maxColumns = 3 // Reduced for portrait format
    let yPosition = margin

    console.log("📐 Page dimensions:", { pageWidth, pageHeight, margin })

    // Add header
    yPosition = addHeader(doc, event, yPosition, pageWidth, margin)

    if (event.notes && event.notes.trim() !== "") {
      yPosition = drawSpecialInfosSection(doc, event.notes, yPosition)
    }

    // Group products by category
    console.log("🗂️ Grouping products by category...")
    const groupedProducts = groupProductsByCategory(selectedProducts, allProducts)
    console.log("📊 Categories found:", Object.keys(groupedProducts))

    // Filter out empty categories and log what we're including
    const categoriesWithProducts = Object.entries(groupedProducts).filter(([_, products]) => products.length > 0)
    console.log(
      "✅ Categories with products:",
      categoriesWithProducts.map(([cat]) => cat),
    )

    if (categoriesWithProducts.length === 0) {
      console.log("⚠️ No categories with products found")
      doc.text("Keine Produkte ausgewählt", margin, yPosition)
    } else {
      const columnWidth = (pageWidth - 2 * margin - 20) / maxColumns // Add spacing between columns
      const availableHeight = pageHeight - yPosition - 80 // Reserve space for signature

      let currentColumn = 0
      let currentColumnY = yPosition
      let currentX = margin

      console.log("📐 Column-first layout:", { columnWidth, availableHeight, maxColumns })

      categoriesWithProducts.forEach(([category, products], index) => {
        // Calculate height needed for this category
        const categoryHeight = 15 + products.length * 6 + 10 // Header + products + padding

        // Check if category fits in current column
        if (currentColumnY + categoryHeight > yPosition + availableHeight) {
          // Move to next column
          currentColumn++
          currentColumnY = yPosition
          currentX = margin + currentColumn * (columnWidth + 10)

          // If we've filled all columns, start a new page
          if (currentColumn >= maxColumns) {
            doc.addPage()
            yPosition = margin
            currentColumn = 0
            currentColumnY = yPosition
            currentX = margin
          }
        }

        console.log(`📝 Drawing category "${category}" in column ${currentColumn} at (${currentX}, ${currentColumnY})`)
        drawCategoryColumn(doc, category, products, currentX, currentColumnY, columnWidth, categoryHeight)

        currentColumnY += categoryHeight + 5 // Add spacing between categories
      })
    }

    // Add ingredients section on new page
    doc.addPage()
    yPosition = margin

    console.log("🥕 Adding ingredients section...")
    try {
      const ingredients = await calculateIngredientsForEvent(event.id!)
      console.log("✅ Ingredients calculated:", ingredients.length)

      if (ingredients.length > 0) {
        yPosition = await drawIngredientsSection(doc, ingredients, yPosition, pageWidth, margin)
      } else {
        console.log("⚠️ No ingredients found for event")
        doc.setFontSize(16)
        doc.text("Zutaten", margin, yPosition)
        yPosition += 15
        doc.setFontSize(12)
        doc.text("Keine Zutaten gefunden für dieses Event", margin, yPosition)
      }
    } catch (error) {
      console.error("❌ Error calculating ingredients:", error)
      doc.setFontSize(16)
      doc.text("Zutaten", margin, yPosition)
      yPosition += 15
      doc.setFontSize(12)
      doc.text("Fehler beim Laden der Zutaten", margin, yPosition)
    }

    // Check if we need a new page for signature
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = 20
    }

    console.log("✍️ Adding signature section at yPosition:", yPosition)

    // Draw the signature box border - make it flatter and ensure it fits
    const signatureBoxHeight = 25
    const signatureBoxWidth = 170 // Fixed safe width
    const signatureBoxX = margin
    doc.setLineWidth(1)
    doc.rect(signatureBoxX, yPosition, signatureBoxWidth, signatureBoxHeight)

    // Add signature fields side by side with underlines
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")

    // Left field: Erledigt von - calculate exact text width
    const leftFieldX = signatureBoxX + 5
    const fieldY = yPosition + 15
    const leftText = "Erledigt von:"
    doc.text(leftText, leftFieldX, fieldY)

    const leftTextWidth = doc.getTextWidth(leftText)
    doc.setLineWidth(0.3) // Very thin line
    doc.setDrawColor(0, 0, 0) // Black color
    const leftUnderlineStart = leftFieldX + leftTextWidth // Start immediately after text
    const leftUnderlineEnd = leftFieldX + 80
    doc.line(leftUnderlineStart, fieldY, leftUnderlineEnd, fieldY) // Same Y position as text baseline

    // Right field: Datum & Uhrzeit - calculate exact text width
    const rightFieldX = leftFieldX + 85
    const rightText = "Datum & Uhrzeit:"
    doc.text(rightText, rightFieldX, fieldY)

    const rightTextWidth = doc.getTextWidth(rightText)
    const rightUnderlineStart = rightFieldX + rightTextWidth // Start immediately after text
    const rightUnderlineEnd = signatureBoxX + signatureBoxWidth - 5
    doc.line(rightUnderlineStart, fieldY, rightUnderlineEnd, fieldY) // Same Y position as text baseline

    console.log("[v0] Signature section added successfully")

    // Save PDF
    const filename = `Packliste_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    console.log("💾 Saving PDF as:", filename)
    doc.save(filename)
    console.log("✅ PDF generated successfully!")
  } catch (error) {
    console.error("💥 Error generating PDF:", error)
    throw error
  }
}

function addHeader(doc: jsPDF, event: Event, yPosition: number, pageWidth: number, margin: number): number {
  console.log("📋 Adding header for event:", event.name)

  // Event name
  doc.setFontSize(18)
  doc.setFont("helvetica", "bold")
  doc.text(event.name, margin, yPosition)
  yPosition += 10

  // Event details
  doc.setFontSize(12)
  doc.setFont("helvetica", "normal")
  const details = []
  if (event.type) details.push(`Typ: ${event.type}`)
  if (event.date) details.push(`Datum: ${new Date(event.date).toLocaleDateString("de-DE")}`)
  if (event.end_date) details.push(`bis ${new Date(event.end_date).toLocaleDateString("de-DE")}`)
  if (event.ft) details.push(`FT: ${event.ft}`)
  if (event.ka) details.push(`KA: ${event.ka}`)

  const detailsText = details.join(" | ")
  doc.text(detailsText, margin, yPosition)
  yPosition += 15

  // Add separator line
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition, pageWidth - margin, yPosition)
  yPosition += 10

  return yPosition
}

function groupProductsByCategory(
  selectedProducts: Record<string, { quantity: number; unit: string }>,
  allProducts: Product[],
): GroupedProducts {
  console.log("🗂️ Grouping products by category...")

  const grouped: GroupedProducts = {}

  Object.entries(selectedProducts).forEach(([productName, selection]) => {
    const product = allProducts.find((p) => p.name === productName)
    const category = product?.category || "Sonstige"

    console.log(`📦 Product: ${productName} → Category: ${category}`)

    if (!grouped[category]) {
      grouped[category] = []
    }

    grouped[category].push({
      name: productName,
      quantity: selection.quantity,
      unit: selection.unit,
    })
  })

  // Log final grouping
  Object.entries(grouped).forEach(([category, products]) => {
    console.log(`📊 Category "${category}": ${products.length} products`)
  })

  return grouped
}

function drawCategoryColumn(
  doc: jsPDF,
  category: string,
  products: Array<{ name: string; quantity: number; unit: string }>,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  console.log(`📝 Drawing category column: ${category} with ${products.length} products`)

  let currentY = y

  // Category header
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  const categoryText = truncateText(doc, category, width - 5)
  doc.text(categoryText, x + 2, currentY + 5)
  currentY += 8

  // Draw border around category
  doc.setLineWidth(0.3)
  doc.rect(x, y, width, Math.min(height, currentY - y + products.length * 6 + 5))

  // Products
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")

  products.forEach((product) => {
    if (currentY + 6 > y + height - 5) return // Stop if we run out of space

    // Checkbox
    doc.rect(x + 2, currentY, 3, 3)

    // Product name and quantity
    const productText = `${truncateText(doc, product.name, width * 0.6)} - ${product.quantity} ${product.unit}`
    doc.text(productText, x + 7, currentY + 2.5)
    currentY += 6
  })
}

async function drawIngredientsSection(
  doc: jsPDF,
  ingredients: any[],
  yPosition: number,
  pageWidth: number,
  margin: number,
): Promise<number> {
  console.log("-yyyy Drawing ingredients section with", ingredients.length, "ingredients")

  // Section title
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Zutaten", margin, yPosition)
  yPosition += 15

  // Add separator line
  doc.setLineWidth(0.5)
  doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5)

  // Group ingredients by food type
  const foodIngredients = ingredients.filter((ing) => ing.ingredient_name && !isNonFoodItem(ing.ingredient_name))
  const nonFoodIngredients = ingredients.filter((ing) => ing.ingredient_name && isNonFoodItem(ing.ingredient_name))

  console.log("🍎 Food ingredients:", foodIngredients.length)
  console.log("📦 Non-food ingredients:", nonFoodIngredients.length)

  // Draw Non Food section
  if (nonFoodIngredients.length > 0) {
    yPosition = drawIngredientTable(doc, "Non Food", nonFoodIngredients, yPosition, pageWidth, margin)
    yPosition += 10
  }

  // Draw Food section
  if (foodIngredients.length > 0) {
    yPosition = drawIngredientTable(doc, "Food", foodIngredients, yPosition, pageWidth, margin)
  }

  return yPosition
}

function drawIngredientTable(
  doc: jsPDF,
  sectionTitle: string,
  ingredients: any[],
  yPosition: number,
  pageWidth: number,
  margin: number,
): number {
  console.log(`📊 Drawing ${sectionTitle} table with ${ingredients.length} ingredients`)

  // Section subtitle
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(sectionTitle, margin, yPosition)
  yPosition += 10

  // Table setup - optimized for portrait format
  const tableWidth = 170 // Total width that fits in portrait
  const checkboxWidth = 12
  const nameWidth = 50
  const amountWidth = 70
  const requiredWidth = 38

  console.log("📐 Table dimensions:", { tableWidth, checkboxWidth, nameWidth, amountWidth, requiredWidth })

  // Table headers
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")

  // Header background
  doc.setFillColor(240, 240, 240)
  doc.rect(margin, yPosition, tableWidth, 10, "F")

  // Header text
  doc.text("", margin + 2, yPosition + 7) // Checkbox column
  doc.text("Zutat", margin + checkboxWidth + 2, yPosition + 7)
  doc.text("Gesamtmenge", margin + checkboxWidth + nameWidth + 2, yPosition + 7)
  doc.text("Benötigte Menge", margin + checkboxWidth + nameWidth + amountWidth + 2, yPosition + 7)

  // Header borders
  doc.setLineWidth(0.3)
  doc.rect(margin, yPosition, checkboxWidth, 10)
  doc.rect(margin + checkboxWidth, yPosition, nameWidth, 10)
  doc.rect(margin + checkboxWidth + nameWidth, yPosition, amountWidth, 10)
  doc.rect(margin + checkboxWidth + nameWidth + amountWidth, yPosition, requiredWidth, 10)

  yPosition += 10

  // Table rows
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)

  ingredients.forEach((ingredient, index) => {
    const rowY = yPosition + index * 10

    // Checkbox
    doc.rect(margin + 4, rowY + 3, 3, 3)

    // Ingredient name (truncated to fit)
    const truncatedName = truncateText(doc, ingredient.ingredient_name, nameWidth - 4)
    doc.text(truncatedName, margin + checkboxWidth + 2, rowY + 7)

    // Total amount with packaging info
    const totalAmountText = `${ingredient.total_amount} ${ingredient.unit}`
    const truncatedAmount = truncateText(doc, totalAmountText, amountWidth - 4)
    doc.text(truncatedAmount, margin + checkboxWidth + nameWidth + 2, rowY + 7)

    // Required amount (calculated based on packaging)
    const requiredAmount = Math.ceil(ingredient.total_amount / 1) // Simplified calculation
    const requiredText = `${requiredAmount} ${ingredient.unit}`
    const truncatedRequired = truncateText(doc, requiredText, requiredWidth - 4)
    doc.text(truncatedRequired, margin + checkboxWidth + nameWidth + amountWidth + 2, rowY + 7)

    // Row borders
    doc.rect(margin, rowY, checkboxWidth, 10)
    doc.rect(margin + checkboxWidth, rowY, nameWidth, 10)
    doc.rect(margin + checkboxWidth + nameWidth, rowY, amountWidth, 10)
    doc.rect(margin + checkboxWidth + nameWidth + amountWidth, rowY, requiredWidth, 10)
  })

  return yPosition + ingredients.length * 10 + 5
}

function isNonFoodItem(name: string): boolean {
  const nonFoodKeywords = [
    "box",
    "karton",
    "verpackung",
    "beutel",
    "tüte",
    "becher",
    "deckel",
    "serviette",
    "napkin",
    "besteck",
    "gabel",
    "messer",
    "löffel",
    "teller",
    "schale",
    "dose",
    "flasche",
    "glas",
    "reiniger",
    "seife",
    "handschuh",
    "folie",
    "papier",
    "ketchup",
    "mayo",
    "senf",
    "sauce",
    "dressing",
    "öl",
    "essig",
    "salz",
    "pfeffer",
    "gewürz",
  ]

  return nonFoodKeywords.some((keyword) => name.toLowerCase().includes(keyword.toLowerCase()))
}

function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  const textWidth = doc.getTextWidth(text)
  if (textWidth <= maxWidth) {
    return text
  }

  // Binary search for the right length
  let left = 0
  let right = text.length
  let result = text

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const truncated = text.substring(0, mid) + "..."
    const truncatedWidth = doc.getTextWidth(truncated)

    if (truncatedWidth <= maxWidth) {
      result = truncated
      left = mid + 1
    } else {
      right = mid - 1
    }
  }

  return result
}

export async function generateNachbestellungPdf(
  nachbestellung: { name: string; supplier_name: string; date?: string; notes?: string },
  items: NachbestellungItem[],
): Promise<void> {
  console.log("📄 === GENERATING NACHBESTELLUNG PDF ===")
  console.log("🛒 Nachbestellung:", nachbestellung.name)
  console.log("📦 Items count:", items.length)

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Header
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Nachbestellung", margin, yPosition)
    yPosition += 15

    // Nachbestellung details
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Name: ${nachbestellung.name}`, margin, yPosition)
    yPosition += 8
    doc.text(`Lieferant: ${nachbestellung.supplier_name}`, margin, yPosition)
    yPosition += 8

    if (nachbestellung.date) {
      doc.text(`Datum: ${new Date(nachbestellung.date).toLocaleDateString("de-DE")}`, margin, yPosition)
      yPosition += 8
    }

    if (nachbestellung.notes) {
      doc.text(`Notizen: ${nachbestellung.notes}`, margin, yPosition)
      yPosition += 8
    }

    yPosition += 10

    // Items table
    if (items.length > 0) {
      const tableData = items.map((item) => [
        item.product_name,
        `${item.quantity} ${item.unit}`,
        item.is_packed ? "✓" : "☐",
      ])

      doc.autoTable({
        startY: yPosition,
        head: [["Produkt", "Menge", "Gepackt"]],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20, halign: "center" },
        },
      })
    } else {
      doc.text("Keine Artikel in dieser Nachbestellung", margin, yPosition)
    }

    // Check if we need a new page for signature
    const pageHeight = doc.internal.pageSize.getHeight()
    if (yPosition > pageHeight - 80) {
      doc.addPage()
      yPosition = 20
    }

    console.log("✍️ Adding signature section at yPosition:", yPosition)

    // Draw the signature box border - make it flatter and ensure it fits
    const signatureBoxHeight = 25
    const signatureBoxWidth = 170 // Fixed safe width
    const signatureBoxX = margin
    doc.setLineWidth(1)
    doc.rect(signatureBoxX, yPosition, signatureBoxWidth, signatureBoxHeight)

    // Add signature fields side by side with underlines
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")

    // Left field: Erledigt von - calculate exact text width
    const leftFieldX = signatureBoxX + 5
    const fieldY = yPosition + 15
    const leftText = "Erledigt von:"
    doc.text(leftText, leftFieldX, fieldY)

    const leftTextWidth = doc.getTextWidth(leftText)
    doc.setLineWidth(0.3) // Very thin line
    doc.setDrawColor(0, 0, 0) // Black color
    const leftUnderlineStart = leftFieldX + leftTextWidth // Start immediately after text
    const leftUnderlineEnd = leftFieldX + 80
    doc.line(leftUnderlineStart, fieldY, leftUnderlineEnd, fieldY) // Same Y position as text baseline

    // Right field: Datum & Uhrzeit - calculate exact text width
    const rightFieldX = leftFieldX + 85
    const rightText = "Datum & Uhrzeit:"
    doc.text(rightText, rightFieldX, fieldY)

    const rightTextWidth = doc.getTextWidth(rightText)
    const rightUnderlineStart = rightFieldX + rightTextWidth // Start immediately after text
    const rightUnderlineEnd = signatureBoxX + signatureBoxWidth - 5
    doc.line(rightUnderlineStart, fieldY, rightUnderlineEnd, fieldY) // Same Y position as text baseline

    console.log("[v0] Signature section added successfully")

    // Save PDF
    const filename = `Nachbestellung_${nachbestellung.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`
    console.log("💾 Saving PDF as:", filename)
    doc.save(filename)
    console.log("✅ PDF generated successfully!")
  } catch (error) {
    console.error("💥 Error generating nachbestellung PDF:", error)
    throw error
  }
}

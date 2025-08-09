"use client"

import jsPDF from "jspdf"
import "jspdf-autotable"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
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
  selectedProducts: Record<string, SelectedProduct>,
  calculatedIngredients: Record<string, CalculatedIngredient>,
  eventDetails: EventDetails,
  formatWeight: (value: number, unit: string) => string,
  getUnitPlural: (quantity: number, unit: string) => string,
  mode = "packliste",
  productCategories: Record<string, string> = {},
  ingredientFoodTypes: Record<string, string> = {},
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let currentPageNumber = 1
  const maxColumns = 3
  const numCategories = 6

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

    // Add FT if exists and not 'none'
    if (eventDetails.ft && eventDetails.ft !== "none") {
      headerText += ` | ${eventDetails.ft}`
    }

    // Add KA if exists and not 'none'
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

    // Add FT if exists and not 'none'
    if (eventDetails.ft && eventDetails.ft !== "none") {
      footerText += ` | ${eventDetails.ft}`
    }

    // Add KA if exists and not 'none'
    if (eventDetails.ka && eventDetails.ka !== "none") {
      footerText += ` | ${eventDetails.ka}`
    }

    doc.text(footerText, 20, pageHeight - 10)
    doc.text(`Seite ${currentPageNumber}`, pageWidth - 35, pageHeight - 10)
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)
  }

  const drawSpecialInfosSection = (notes: string, currentY: number) => {
    if (!notes || notes.trim() === "") return currentY

    // Calculate the required height based on content
    const specialInfosBoxWidth = pageWidth - 40
    const maxWidth = specialInfosBoxWidth - 10 // Leave some padding

    // Set font for measurement
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    // Split notes into lines that fit within the box width
    const lines = doc.splitTextToSize(notes, maxWidth)
    const lineHeight = 5 // Increased line height for better readability
    const minBoxHeight = 20 // Minimum height for the box
    const padding = 10 // Top and bottom padding inside the box

    // Calculate required height: number of lines * line height + padding
    const contentHeight = lines.length * lineHeight
    const specialInfosBoxHeight = Math.max(minBoxHeight, contentHeight + padding)

    // Check if we need a new page for special infos
    const totalSectionHeight = 25 + specialInfosBoxHeight // Title + box height
    if (currentY + totalSectionHeight > pageHeight - 60) {
      doc.addPage()
      currentPageNumber++
      drawHeader()
      drawFooter()
      doc.setTextColor(0, 0, 0)
      currentY = 25
    }

    // Add some space before special infos
    currentY += 15

    // Special Infos section title
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Special Infos", 20, currentY)
    doc.line(20, currentY + 2, pageWidth - 20, currentY + 2)
    currentY += 10

    // Draw special infos box border with calculated height
    doc.setDrawColor(0, 0, 0)
    doc.rect(20, currentY, specialInfosBoxWidth, specialInfosBoxHeight)

    // Special Infos text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)

    // Draw the text lines with improved spacing and bounds checking
    let textY = currentY + 8
    const maxTextY = currentY + specialInfosBoxHeight - 5 // Leave some bottom margin

    lines.forEach((line: string) => {
      // Only draw if we have space and the line fits
      if (textY <= maxTextY) {
        doc.text(line, 25, textY)
        textY += lineHeight
      }
    })

    currentY += specialInfosBoxHeight + 10
    return currentY
  }

  const drawSignatureSection = () => {
    const signatureY = pageHeight - 50
    const signatureHeight = 25
    const signatureWidth = pageWidth - 40

    // Draw signature box
    doc.setDrawColor(0, 0, 0)
    doc.rect(20, signatureY, signatureWidth, signatureHeight)

    // Set text properties
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")

    // Left side - "Erledigt von:"
    const leftText = "Erledigt von:"
    const leftLineStart = 20 + doc.getTextWidth(leftText) + 5
    const leftLineEnd = pageWidth / 2 - 10

    doc.text(leftText, 25, signatureY + 15)
    doc.line(leftLineStart, signatureY + 15, leftLineEnd, signatureY + 15)

    // Right side - "Datum & Uhrzeit:"
    const rightText = "Datum & Uhrzeit:"
    const rightTextStart = pageWidth / 2 + 10
    const rightLineStart = rightTextStart + doc.getTextWidth(rightText) + 5
    const rightLineEnd = pageWidth - 25

    doc.text(rightText, rightTextStart, signatureY + 15)
    doc.line(rightLineStart, signatureY + 15, rightLineEnd, signatureY + 15)
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

  // Group products by category
  const productsByCategory: Record<string, { name: string; quantity: number; unit: string }[]> = {}
  Object.entries(selectedProducts).forEach(([productName, details]) => {
    const category = productCategories[productName] || "Sonstige"
    if (!productsByCategory[category]) productsByCategory[category] = []
    productsByCategory[category].push({ name: productName, quantity: details.quantity, unit: details.unit })
  })

  const sortedCategories = Object.keys(productsByCategory).sort()
  const columnWidth = (pageWidth - 40) / maxColumns
  const xPositions = Array.from({ length: maxColumns }, (_, i) => 20 + i * columnWidth)
  let yPosition = 35

  // Only draw products if there are any
  if (Object.keys(selectedProducts).length > 0) {
    // Draw category headers - all bold
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    for (let i = 0; i < maxColumns; i++) {
      if (i < sortedCategories.length) {
        const category = sortedCategories[i]
        doc.text(category, xPositions[i], yPosition)
      }
    }
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    yPosition += 8

    const maxYPosition = pageHeight - 25 // LESS AGGRESSIVE - changed from pageHeight - 25
    const maxProductsInCategory = Math.max(0, ...sortedCategories.map((cat) => productsByCategory[cat].length))

    // Draw products in columns
    for (let productIndex = 0; productIndex < maxProductsInCategory; productIndex++) {
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
        for (let i = 0; i < maxColumns; i++) {
          if (i < sortedCategories.length) {
            const category = sortedCategories[i]
            doc.text(category, xPositions[i], yPosition)
          }
        }
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        yPosition += 8
      }

      for (let colIndex = 0; colIndex < maxColumns && colIndex < sortedCategories.length; colIndex++) {
        const category = sortedCategories[colIndex]
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

          doc.text(displayText, xPositions[colIndex] + 5, yPosition)
        }
      }
      // Reset font to normal for the next row to avoid carry-over styling
      doc.setFont("helvetica", "normal")
      yPosition += 6
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

  let currentY = 25

  // Add ingredients table if available
  if (Object.keys(calculatedIngredients).length > 0) {
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

      // Section title
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(title, 20, currentY)
      doc.line(20, currentY + 2, pageWidth - 20, currentY + 2)
      currentY += 10

      // Table header
      const startX = 20
      const colWidths = [15, 80, 120, 50] // checkbox, ingredient, total amount, required amount
      let currentX = startX

      // Header background
      doc.setFillColor(230, 230, 230)
      doc.rect(
        startX,
        currentY,
        colWidths.reduce((sum, w) => sum + w, 0),
        12, // Increased header height for font size 14
        "F",
      )

      // Header border
      doc.setDrawColor(0, 0, 0)
      doc.rect(
        startX,
        currentY,
        colWidths.reduce((sum, w) => sum + w, 0),
        12, // Increased header height for font size 14
      )

      // Header text
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14) // Changed to 14
      const headers = ["", "Zutat", "Gesamtmenge", "Benötigte Menge"]

      headers.forEach((header, index) => {
        if (index === 0) {
          // Checkbox column - no text
        } else if (index === 3) {
          // Right align for "Benötigte Menge"
          doc.text(header, currentX + colWidths[index] - 2, currentY + 8, { align: "right" }) // Adjusted Y position
        } else {
          doc.text(header, currentX + 2, currentY + 8) // Adjusted Y position
        }

        if (currentX > startX) {
          doc.line(currentX, currentY, currentX, currentY + 12) // Adjusted height
        }
        currentX += colWidths[index]
      })

      currentY += 12 // Adjusted for new header height

      // Table rows
      doc.setFont("helvetica", "normal")
      doc.setFontSize(14) // Changed to 14

      Object.entries(ingredients)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([ingredient, details], rowIndex) => {
          // Check if we need a new page - LESS AGGRESSIVE
          if (currentY + 12 > pageHeight - 30) {
            // Changed from 40 to 30
            doc.addPage()
            currentPageNumber++
            drawHeader()
            drawFooter()
            doc.setTextColor(0, 0, 0)
            currentY = 25

            // Only redraw table header on new page, not section title
            currentX = startX

            // Header background
            doc.setFillColor(230, 230, 230)
            doc.rect(
              startX,
              currentY,
              colWidths.reduce((sum, w) => sum + w, 0),
              12,
              "F",
            )

            // Header border
            doc.setDrawColor(0, 0, 0)
            doc.rect(
              startX,
              currentY,
              colWidths.reduce((sum, w) => sum + w, 0),
              12,
            )

            // Header text
            doc.setFont("helvetica", "bold")
            doc.setFontSize(14)

            headers.forEach((header, index) => {
              if (index === 0) {
                // Checkbox column - no text
              } else if (index === 3) {
                // Right align for "Benötigte Menge"
                doc.text(header, currentX + colWidths[index] - 2, currentY + 8, { align: "right" })
              } else {
                doc.text(header, currentX + 2, currentY + 8)
              }

              if (currentX > startX) {
                doc.line(currentX, currentY, currentX, currentY + 12)
              }
              currentX += colWidths[index]
            })

            currentY += 12
            doc.setFont("helvetica", "normal")
            doc.setFontSize(14)
          }

          currentX = startX

          // Alternate row background
          if (rowIndex % 2 === 0) {
            doc.setFillColor(245, 245, 245)
            doc.rect(
              startX,
              currentY,
              colWidths.reduce((sum, w) => sum + w, 0),
              12, // Increased row height for font size 14
              "F",
            )
          }

          // Row border
          doc.setDrawColor(200, 200, 200)
          doc.rect(
            startX,
            currentY,
            colWidths.reduce((sum, w) => sum + w, 0),
            12, // Increased row height for font size 14
          )

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
              const checkboxSize = 4 // Slightly larger for better proportion
              const checkboxX = currentX + (colWidths[index] - checkboxSize) / 2
              const checkboxY = currentY + (12 - checkboxSize) / 2 // Adjusted for new row height
              doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize)
            } else {
              const textY = currentY + 8 // Adjusted for new row height and font size

              // Make "Zutat" (index 1) and "Gesamtmenge" (index 2) columns bold
              if (index === 1 || index === 2) {
                doc.setFont("helvetica", "bold")
              } else {
                doc.setFont("helvetica", "normal")
              }

              if (index === 3) {
                // Right align for required amount
                doc.text(text, currentX + colWidths[index] - 2, textY, { align: "right" })
              } else {
                doc.text(text, currentX + 2, textY)
              }
            }

            if (currentX > startX) {
              doc.line(currentX, currentY, currentX, currentY + 12) // Adjusted height
            }
            currentX += colWidths[index]
          })

          currentY += 12 // Adjusted for new row height
        })

      currentY += 10 // Space after section
      return currentY
    }

    // Draw Non Food section first
    currentY = drawIngredientsSection(nonFoodIngredients, "Non Food")

    // Draw Food section second - no forced page break, let it flow naturally
    currentY = drawIngredientsSection(foodIngredients, "Food")
  }

  // Add Special Infos section if notes exist
  if (eventDetails.notes && eventDetails.notes.trim() !== "") {
    currentY = drawSpecialInfosSection(eventDetails.notes, currentY)
  }

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

  // Add signature section to the last page
  drawSignatureSection()

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
    doc.text(category, 20, yPosition)
    yPosition += 10

    // Products
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")

    categoryProducts.forEach((product) => {
      // Checkbox
      doc.rect(25, yPosition - 3, 3, 3)

      // Product text
      const productText = `${product.quantity}x ${product.name} (${product.unit})`
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

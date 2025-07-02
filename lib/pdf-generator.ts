"use client"

import { jsPDF } from "jspdf"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"

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
    this.rowHeight = 8
    this.headerHeight = 10
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
    this.doc.setFontSize(10)
    this.doc.setTextColor(0, 0, 0)

    this.columns.forEach((column) => {
      const textY = this.currentY + this.headerHeight / 2 + 2

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
    this.doc.setFontSize(9)
    this.doc.setTextColor(0, 0, 0)

    this.columns.forEach((column, index) => {
      const text = row[index.toString()] || ""
      const textY = this.currentY + this.rowHeight / 2 + 2

      if (column.align === "center") {
        this.doc.text(text, currentX + column.width / 2, textY, { align: "center" })
      } else if (column.align === "right") {
        this.doc.text(text, currentX + column.width - 2, textY, { align: "right" })
      } else {
        this.doc.text(text, currentX + 2, textY)
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
}

export async function generatePdf(
  selectedProducts: Record<string, SelectedProduct>,
  calculatedIngredients: Record<string, CalculatedIngredient>,
  eventDetails: EventDetails,
  formatWeight: (value: number, unit: string) => string,
  getUnitPlural: (quantity: number, unit: string) => string,
  mode = "packliste",
  productCategories: Record<string, string> = {},
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let pageNumber = 1

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
    let headerText = `${eventDetails.type} | ${eventDetails.name} | ${eventDetails.date || "Kein Datum"}`
    if (eventDetails.ft && eventDetails.ft !== "none") headerText += ` | ${eventDetails.ft}`
    if (eventDetails.ka && eventDetails.ka !== "none") headerText += ` | ${eventDetails.ka}`
    if (mode === "bestellung" && eventDetails.supplierName) headerText += ` | Mitarbeiter: ${eventDetails.supplierName}`
    doc.text(headerText, 20, 12)
    doc.line(20, 15, pageWidth - 20, 15)
  }

  const drawFooter = () => {
    doc.setFontSize(10)
    doc.setTextColor(128, 128, 128)
    const footerText = `${eventDetails.type} | ${eventDetails.name} | ${eventDetails.date || "Kein Datum"}`
    doc.text(footerText, 20, pageHeight - 10)
    doc.text(`Seite ${pageNumber}`, pageWidth - 35, pageHeight - 10)
    doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15)
  }

  drawHeader()
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
  const numCategories = sortedCategories.length
  const maxColumns = Math.min(numCategories, 6)
  const columnWidth = (pageWidth - 40) / maxColumns
  const xPositions = Array.from({ length: maxColumns }, (_, i) => 20 + i * columnWidth)
  let yPosition = 35

  // Draw category headers
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  for (let i = 0; i < maxColumns; i++) {
    if (i < sortedCategories.length) {
      doc.text(sortedCategories[i], xPositions[i], yPosition)
    }
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  yPosition += 8

  const maxYPosition = pageHeight - 25
  const maxProductsInCategory = Math.max(0, ...sortedCategories.map((cat) => productsByCategory[cat].length))

  // Draw products in columns
  for (let productIndex = 0; productIndex < maxProductsInCategory; productIndex++) {
    if (yPosition > maxYPosition) {
      drawFooter()
      doc.addPage()
      pageNumber++
      drawHeader()
      doc.setTextColor(0, 0, 0)
      yPosition = 35

      // Redraw category headers on new page
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      for (let i = 0; i < maxColumns; i++) {
        if (i < sortedCategories.length) {
          doc.text(sortedCategories[i], xPositions[i], yPosition)
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
    yPosition += 6
  }

  // Add ingredients table if available
  if (Object.keys(calculatedIngredients).length > 0) {
    drawFooter()
    doc.addPage()
    pageNumber++
    drawHeader()
    doc.setTextColor(0, 0, 0)

    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Zutaten", 20, 25)
    doc.line(20, 28, pageWidth - 20, 28)

    // Prepare table data
    const sortedIngredients = Object.entries(calculatedIngredients).sort(([a], [b]) => a.localeCompare(b))
    const tableRows: TableRow[] = sortedIngredients.map(([ingredient, details], index) => {
      const packagingText = `${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}`
      const totalText = formatWeight(details.totalAmount, details.unit)

      return {
        "0": "", // Checkbox column
        "1": ingredient,
        "2": packagingText,
        "3": totalText,
      }
    })

    const tableColumns: TableColumn[] = [
      { header: "", width: 15, align: "center" },
      { header: "Zutat", width: 80, align: "left" },
      { header: "Verpackung", width: 120, align: "left" },
      { header: "Gesamtmenge", width: 50, align: "right" },
    ]

    const table = new CustomTable(doc, tableColumns, tableRows, 35)
    table.render()

    // Draw checkboxes in the first column
    let checkboxY = 45 // Start after header
    sortedIngredients.forEach(() => {
      doc.rect(25, checkboxY - 2, 3, 3)
      checkboxY += 8
    })
  } else {
    drawFooter()
  }

  // Generate filename
  let fileName = ""
  if (mode === "packliste" && eventDetails.date) {
    try {
      const dateParts = eventDetails.date.split(".")
      if (dateParts.length === 3) {
        const [day, month, year] = dateParts
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

  // Set document properties
  doc.setProperties({
    title: fileName,
    subject: getTitle(),
    author: "I Eat Vienna",
    keywords: `${getTitle()}, ${eventDetails.type}, ${eventDetails.name}`,
    creator: "I Eat Vienna App",
  })

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
  const filename = `packliste-${eventName.toLowerCase().replace(/\s+/g, "-")}.pdf`
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
  const filename = `einkaufsliste-${eventName.toLowerCase().replace(/\s+/g, "-")}.pdf`
  doc.save(filename)
}

"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"

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

  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  for (let i = 0; i < maxColumns; i++) {
    if (i < sortedCategories.length) doc.text(sortedCategories[i], xPositions[i], yPosition)
  }
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  yPosition += 8

  const maxYPosition = pageHeight - 25
  const maxProductsInCategory = Math.max(0, ...sortedCategories.map((cat) => productsByCategory[cat].length))

  for (let productIndex = 0; productIndex < maxProductsInCategory; productIndex++) {
    if (yPosition > maxYPosition) {
      drawFooter()
      doc.addPage()
      pageNumber++
      drawHeader()
      doc.setTextColor(0, 0, 0)
      yPosition = 35
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      for (let i = 0; i < maxColumns; i++) {
        if (i < sortedCategories.length) doc.text(sortedCategories[i], xPositions[i], yPosition)
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
        doc.rect(xPositions[colIndex], yPosition - 3, 3, 3)
        const productText = `${product.quantity}x ${product.name}`
        const maxTextWidth = columnWidth - 8
        let displayText = productText
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

    const sortedIngredients = Object.entries(calculatedIngredients).sort(([a], [b]) => a.localeCompare(b))
    const tableData = sortedIngredients.map(([ingredient, details]) => {
      const packagingText = `${details.packagingCount} ${getUnitPlural(details.packagingCount, details.packaging)} à ${formatWeight(details.amountPerPackage, details.unit)}`
      const totalText = formatWeight(details.totalAmount, details.unit)
      return ["", ingredient, packagingText, totalText]
    })

    autoTable(doc, {
      startY: 35,
      head: [["", "Zutat", "Verpackung", "Gesamtmenge"]],
      body: tableData,
      theme: "grid",
      margin: { left: 20, right: 20 },
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 80 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 40, halign: "right" },
      },
      didDrawCell: (data) => {
        if (data.column.index === 0 && data.cell.section === "body") {
          doc.rect(data.cell.x + data.cell.width / 2 - 1.5, data.cell.y + data.cell.height / 2 - 1.5, 3, 3)
        }
      },
      didDrawPage: (data) => {
        drawFooter()
        pageNumber++
        if (data.pageNumber > 1) {
          drawHeader()
        }
      },
    })
  } else {
    drawFooter()
  }

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

  doc.setProperties({
    title: fileName,
    subject: getTitle(),
    author: "I Eat Vienna",
    keywords: `${getTitle()}, ${eventDetails.type}, ${eventDetails.name}`,
    creator: "I Eat Vienna App",
  })

  doc.save(`${fileName}.pdf`)
}

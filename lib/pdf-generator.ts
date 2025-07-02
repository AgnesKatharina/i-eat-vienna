import jsPDF from "jspdf"
import "jspdf-autotable"

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface PacklisteItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  checked?: boolean
}

export interface ShoppingItem {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  checked?: boolean
}

export function generatePacklistePDF(items: PacklisteItem[], eventName = "Event"): void {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text("Packliste", 20, 20)

  // Event name
  doc.setFontSize(14)
  doc.text(`Event: ${eventName}`, 20, 35)

  // Date
  doc.setFontSize(10)
  doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, 20, 45)

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, PacklisteItem[]>,
  )

  let yPosition = 60

  Object.entries(groupedItems).forEach(([category, categoryItems]) => {
    // Category header
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text(category, 20, yPosition)
    yPosition += 10

    // Items table
    const tableData = categoryItems.map((item) => [
      item.name,
      `${item.quantity} ${item.unit}`,
      "☐", // Checkbox
    ])

    doc.autoTable({
      startY: yPosition,
      head: [["Produkt", "Menge", "Erledigt"]],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20, halign: "center" },
      },
    })

    yPosition = (doc as any).lastAutoTable.finalY + 15

    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Seite ${i} von ${pageCount} - I Eat Vienna`,
      doc.internal.pageSize.width - 60,
      doc.internal.pageSize.height - 10,
    )
  }

  // Download the PDF
  doc.save(`packliste-${eventName.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}

export function generateShoppingListPDF(items: ShoppingItem[], eventName = "Einkaufsliste"): void {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.text("Einkaufsliste", 20, 20)

  // Event name
  doc.setFontSize(14)
  doc.text(`Für: ${eventName}`, 20, 35)

  // Date
  doc.setFontSize(10)
  doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, 20, 45)

  // Group items by category
  const groupedItems = items.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ShoppingItem[]>,
  )

  let yPosition = 60

  Object.entries(groupedItems).forEach(([category, categoryItems]) => {
    // Category header
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text(category, 20, yPosition)
    yPosition += 10

    // Items as checkboxes
    doc.setFont(undefined, "normal")
    doc.setFontSize(10)

    categoryItems.forEach((item) => {
      const checkbox = item.checked ? "☑" : "☐"
      const text = `${checkbox} ${item.name} (${item.quantity} ${item.unit})`
      doc.text(text, 25, yPosition)
      yPosition += 8

      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
    })

    yPosition += 5 // Extra space between categories
  })

  // Summary
  yPosition += 10
  doc.setFont(undefined, "bold")
  doc.text(`Gesamt: ${items.length} Artikel`, 20, yPosition)

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Seite ${i} von ${pageCount} - I Eat Vienna`,
      doc.internal.pageSize.width - 60,
      doc.internal.pageSize.height - 10,
    )
  }

  // Download the PDF
  doc.save(`einkaufsliste-${eventName.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}

export function generateCombinedPDF(
  packlisteItems: PacklisteItem[],
  shoppingItems: ShoppingItem[],
  eventName = "Event",
): void {
  const doc = new jsPDF()

  // Title page
  doc.setFontSize(24)
  doc.text("Event Planung", 20, 30)

  doc.setFontSize(16)
  doc.text(`Event: ${eventName}`, 20, 50)

  doc.setFontSize(12)
  doc.text(`Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, 20, 65)

  // Table of contents
  doc.setFontSize(14)
  doc.text("Inhalt:", 20, 90)
  doc.setFontSize(12)
  doc.text("1. Packliste", 25, 105)
  doc.text("2. Einkaufsliste", 25, 115)

  // New page for Packliste
  doc.addPage()

  // Generate Packliste section
  doc.setFontSize(18)
  doc.text("1. Packliste", 20, 20)

  const groupedPackliste = packlisteItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, PacklisteItem[]>,
  )

  let yPos = 35

  Object.entries(groupedPackliste).forEach(([category, categoryItems]) => {
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text(category, 20, yPos)
    yPos += 10

    const tableData = categoryItems.map((item) => [item.name, `${item.quantity} ${item.unit}`, "☐"])

    doc.autoTable({
      startY: yPos,
      head: [["Produkt", "Menge", "Erledigt"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20, halign: "center" },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
  })

  // New page for Shopping list
  doc.addPage()

  // Generate Shopping list section
  doc.setFontSize(18)
  doc.text("2. Einkaufsliste", 20, 20)

  const groupedShopping = shoppingItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = []
      }
      acc[item.category].push(item)
      return acc
    },
    {} as Record<string, ShoppingItem[]>,
  )

  yPos = 35

  Object.entries(groupedShopping).forEach(([category, categoryItems]) => {
    doc.setFontSize(12)
    doc.setFont(undefined, "bold")
    doc.text(category, 20, yPos)
    yPos += 10

    doc.setFont(undefined, "normal")
    doc.setFontSize(10)

    categoryItems.forEach((item) => {
      const checkbox = item.checked ? "☑" : "☐"
      const text = `${checkbox} ${item.name} (${item.quantity} ${item.unit})`
      doc.text(text, 25, yPos)
      yPos += 8

      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
    })

    yPos += 5
  })

  // Footer for all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Seite ${i} von ${pageCount} - I Eat Vienna`,
      doc.internal.pageSize.width - 60,
      doc.internal.pageSize.height - 10,
    )
  }

  // Download the PDF
  doc.save(`event-planung-${eventName.toLowerCase().replace(/\s+/g, "-")}.pdf`)
}

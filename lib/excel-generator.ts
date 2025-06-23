"use client"

import * as XLSX from "xlsx"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"
import { categories, productsByCategory } from "@/lib/data"

export async function generateExcel(
  selectedProducts: Record<string, SelectedProduct>,
  calculatedIngredients: Record<string, CalculatedIngredient>,
  eventDetails: EventDetails,
  mode = "packliste",
) {
  // Create a new workbook
  const wb = XLSX.utils.book_new()

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

  // Create a worksheet for overview
  const wsData = []

  // Add general information
  if (mode !== "einkaufen") {
    wsData.push([getTitle(), ""])
    wsData.push(["Typ", eventDetails.type])
    wsData.push(["Event Name", eventDetails.name])
    if (mode === "bestellung" && eventDetails.supplierName) {
      wsData.push(["Mitarbeiter", eventDetails.supplierName])
    }
    if (eventDetails.ft && eventDetails.ft !== "none") {
      wsData.push(["Foodtruck", eventDetails.ft])
    }
    if (eventDetails.ka && eventDetails.ka !== "none") {
      wsData.push(["Kühlanhänger", eventDetails.ka])
    }
    wsData.push(["Datum", eventDetails.date])
    wsData.push([])
  } else {
    wsData.push(["Einkaufsliste", ""])
    wsData.push(["Datum", new Date().toLocaleDateString()])
    wsData.push([])
  }

  // Add products section
  wsData.push(["Produkte"])
  wsData.push(["", "Anzahl", "Produkt"])

  // Add products by category
  const displayCategories =
    mode === "einkaufen"
      ? ["Einkaufen"]
      : mode === "bestellung"
        ? ["Produkte", "Equipment", "Getränke Pet", "Getränke Glas", "Kassa"]
        : mode === "packliste"
          ? categories.filter((c) => c !== "Einkaufen")
          : categories

  for (const category of displayCategories) {
    const products =
      category === "Kassa"
        ? ["Bonrolle", "5 € Scheine", "2 € Rolle", "1 € Rolle", "50 Cent Rolle", "20 Cent Rolle", "10 Cent Rolle"]
        : [...productsByCategory[category]].sort()

    for (const product of products) {
      if (product in selectedProducts) {
        const quantity = selectedProducts[product].quantity
        const unit = selectedProducts[product].unit
        wsData.push(["☐", `${quantity} ${unit}`, product])
      }
    }
  }

  // Add ingredients section if not in einkaufen mode
  if (mode !== "einkaufen") {
    wsData.push([])
    wsData.push(["Zutaten"])
    wsData.push(["", "Menge/Verpackung", "Zutat", "Gesamtmenge", "Einheit"])

    // Sort ingredients alphabetically
    const sortedIngredients = Object.entries(calculatedIngredients).sort(([a], [b]) => a.localeCompare(b))

    for (const [ingredient, details] of sortedIngredients) {
      const packagingCount = details.packagingCount
      const packaging = details.packaging
      const amountPerPackage = details.amountPerPackage
      const totalAmount = details.totalAmount
      const unit = details.unit

      const packagingText = `${packagingCount} ${packaging} à ${amountPerPackage} ${unit}`

      wsData.push(["☐", packagingText, ingredient, totalAmount, unit])
    }
  }

  // Create the worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Set column widths
  const colWidths = [5, 30, 40, 15, 10]
  ws["!cols"] = colWidths.map((width) => ({ width }))

  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(wb, ws, "Übersicht")

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

  // Write the workbook and trigger download with file dialog
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

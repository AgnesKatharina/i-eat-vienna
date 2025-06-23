"use client"

import * as XLSX from "xlsx"
import type { SelectedProduct, EventDetails } from "@/lib/types"

interface ImportResult {
  products?: Record<string, SelectedProduct>
  details?: EventDetails
}

export async function importExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error("Failed to read file"))
          return
        }

        // Parse the Excel file
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 })

        // Initialize result objects
        const products: Record<string, SelectedProduct> = {}
        const details: EventDetails = {
          type: "Catering",
          name: "",
          ft: "",
          ka: "",
          date: "",
        }

        // Parse event details
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length < 2) continue

          if (row[0] === "Typ" && row[1]) {
            details.type = row[1]
          } else if (row[0] === "Event Name" && row[1]) {
            details.name = row[1]
          } else if (row[0] === "Foodtruck" && row[1]) {
            details.ft = row[1]
          } else if (row[0] === "Kühlanhänger" && row[1]) {
            details.ka = row[1]
          } else if (row[0] === "Datum" && row[1]) {
            details.date = row[1]
          }

          // Start parsing products
          if (row[0] === "Produkte") {
            break
          }
        }

        // Find products section
        let productSectionIndex = -1
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (row && row[0] === "Produkte") {
            productSectionIndex = i
            break
          }
        }

        // Parse products
        if (productSectionIndex >= 0) {
          for (let i = productSectionIndex + 2; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || row.length < 3) continue

            // If we hit the Zutaten section, stop parsing products
            if (row[0] === "Zutaten") {
              break
            }

            // Parse product
            const checkbox = row[0] // Checkbox (not used)
            const quantityStr = row[1] // Quantity with unit
            const productName = row[2] // Product name

            if (productName) {
              // Parse quantity and unit
              const quantityMatch = quantityStr.match(/(\d+)\s+(.+)/)
              if (quantityMatch) {
                const quantity = Number.parseInt(quantityMatch[1], 10)
                const unit = quantityMatch[2]

                products[productName] = {
                  quantity,
                  unit,
                }
              }
            }
          }
        }

        resolve({ products, details })
      } catch (error) {
        console.error("Error parsing Excel file:", error)
        reject(error)
      }
    }

    reader.onerror = (error) => {
      reject(error)
    }

    reader.readAsBinaryString(file)
  })
}

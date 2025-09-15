import type jsPDF from "jspdf"

/**
 * Draws the Special Infos section in the PDF
 * @param doc - The jsPDF document instance
 * @param notes - The notes/special information text
 * @param currentY - The current Y position in the document
 * @returns The new Y position after drawing the section
 */
export const drawSpecialInfosSection = (doc: jsPDF, notes: string, currentY: number): number => {
  if (!notes || notes.trim() === "") return currentY

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // Calculate the required height based on content
  const specialInfosBoxWidth = pageWidth - 40
  const maxWidth = specialInfosBoxWidth - 20 // Leave more space for checkboxes

  // Set font for measurement
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  const noteLines = notes.split("\n").filter((line) => line.trim() !== "")
  const processedLines: string[] = []

  noteLines.forEach((line) => {
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith("CHECKBOX:")) {
      // This is a checkbox item from the UI
      const checkboxText = trimmedLine.replace("CHECKBOX:", "").trim()
      processedLines.push(checkboxText)
    } else {
      // Regular text - split if too long
      const splitLines = doc.splitTextToSize(trimmedLine, maxWidth)
      processedLines.push(...splitLines)
    }
  })

  const lineHeight = 6 // Increased for checkbox spacing
  const minBoxHeight = 20
  const padding = 10

  const contentHeight = processedLines.length * lineHeight
  const specialInfosBoxHeight = Math.max(minBoxHeight, contentHeight + padding)

  // Check if we need a new page for special infos
  const totalSectionHeight = 25 + specialInfosBoxHeight
  if (currentY + totalSectionHeight > pageHeight - 60) {
    doc.addPage()
    currentY = 25
  }

  // Special Infos section title
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Special Infos", 20, currentY)
  doc.line(20, currentY + 2, pageWidth - 20, currentY + 2)
  currentY += 10

  // Draw special infos box border
  doc.setDrawColor(0, 0, 0)
  doc.rect(20, currentY, specialInfosBoxWidth, specialInfosBoxHeight)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)

  let textY = currentY + 8
  const maxTextY = currentY + specialInfosBoxHeight - 5

  noteLines.forEach((line: string) => {
    if (textY <= maxTextY) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith("CHECKBOX:")) {
        // Draw actual checkbox symbol
        const checkboxText = trimmedLine.replace("CHECKBOX:", "").trim()

        // Draw checkbox square
        doc.setDrawColor(0, 0, 0)
        doc.rect(25, textY - 3, 3, 3)

        // Draw the text next to checkbox
        doc.text(checkboxText, 30, textY)
      } else {
        // Regular text
        doc.text(trimmedLine, 25, textY)
      }
      textY += lineHeight
    }
  })

  currentY += specialInfosBoxHeight + 10
  return currentY
}

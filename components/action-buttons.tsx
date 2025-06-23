"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Download, FileSpreadsheet, FileIcon as FilePdf, RefreshCw, Upload } from "lucide-react"
import type { SelectedProduct, CalculatedIngredient, EventDetails } from "@/lib/types"
import { generatePdf } from "@/lib/pdf-generator"
import { generateExcel } from "@/lib/excel-generator"
import { importExcel } from "@/lib/excel-importer"

interface ActionButtonsProps {
  selectedProducts: Record<string, SelectedProduct>
  calculatedIngredients: Record<string, CalculatedIngredient>
  eventDetails: EventDetails
  handleReset: () => void
  formatWeight: (value: number, unit: string) => string
  getUnitPlural: (quantity: number, unit: string) => string
  mode: string
  setSelectedProducts?: (products: Record<string, SelectedProduct>) => void
  setEventDetails?: (details: EventDetails) => void
}

export function ActionButtons({
  selectedProducts,
  calculatedIngredients,
  eventDetails,
  handleReset,
  formatWeight,
  getUnitPlural,
  mode,
  setSelectedProducts,
  setEventDetails,
}: ActionButtonsProps) {
  const { toast } = useToast()
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async (format: "pdf" | "excel") => {
    try {
      // Check if products are selected
      if (Object.keys(selectedProducts).length === 0) {
        toast({
          title: "Keine Produkte ausgewählt",
          description: "Bitte wählen Sie mindestens ein Produkt aus.",
          variant: "destructive",
        })
        return
      }

      // Check if supplier name is provided for Bestellung mode
      if (mode === "bestellung" && (!eventDetails.supplierName || !eventDetails.supplierName.trim())) {
        toast({
          title: "Mitarbeiter Name erforderlich",
          description: "Bitte geben Sie einen Mitarbeiter Namen ein.",
          variant: "destructive",
        })
        return
      }

      if (format === "pdf") {
        await generatePdf(selectedProducts, calculatedIngredients, eventDetails, formatWeight, getUnitPlural, mode)
        toast({
          title: "PDF gespeichert",
          description: "Die PDF-Datei wurde erfolgreich gespeichert.",
        })
      } else {
        await generateExcel(selectedProducts, calculatedIngredients, eventDetails, mode)
        toast({
          title: "Excel gespeichert",
          description: "Die Excel-Datei wurde erfolgreich gespeichert.",
        })
      }

      // Close the dialog and return to the program
      setSaveDialogOpen(false)
    } catch (error) {
      console.error("Error saving file:", error)
      toast({
        title: "Fehler beim Speichern",
        description: "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const { products, details } = await importExcel(file)

      if (setSelectedProducts && products) {
        setSelectedProducts(products)
      }

      if (setEventDetails && details) {
        setEventDetails(details)
      }

      toast({
        title: "Excel importiert",
        description: "Die Excel-Datei wurde erfolgreich importiert.",
      })
    } catch (error) {
      console.error("Error importing file:", error)
      toast({
        title: "Fehler beim Importieren",
        description: "Die Datei konnte nicht importiert werden. Bitte überprüfen Sie das Format.",
        variant: "destructive",
      })
    }

    // Reset the file input
    if (event.target) {
      event.target.value = ""
    }
  }

  const getButtonTitle = () => {
    switch (mode) {
      case "packliste":
        return "Packliste speichern"
      case "einkaufen":
        return "Einkaufsliste speichern"
      case "bestellung":
        return "Bestellung speichern"
      default:
        return "Speichern"
    }
  }

  const confirmReset = () => {
    handleReset()
    setResetDialogOpen(false)
    toast({
      title: "Zurückgesetzt",
      description: "Alle Eingaben wurden zurückgesetzt.",
    })
  }

  return (
    <div className="flex flex-wrap gap-4 justify-center">
      {/* Import Excel button - only show in Packliste mode */}
      {mode === "packliste" && (
        <>
          <Button variant="outline" size="lg" className="gap-2" onClick={handleImportClick}>
            <Upload className="h-5 w-5" />
            Import Excel
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .xls" className="hidden" />
        </>
      )}

      <Button variant="outline" size="lg" className="gap-2" onClick={() => setSaveDialogOpen(true)}>
        <Download className="h-5 w-5" />
        {getButtonTitle()}
      </Button>

      <Button variant="outline" size="lg" className="gap-2" onClick={() => setResetDialogOpen(true)}>
        <RefreshCw className="h-5 w-5" />
        Zurücksetzen
      </Button>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Datei speichern</DialogTitle>
            <DialogDescription>Wählen Sie das gewünschte Format zum Speichern.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" size="lg" className="flex-col h-32 gap-2" onClick={() => handleSave("pdf")}>
              <FilePdf className="h-10 w-10" />
              <span>Als PDF speichern</span>
            </Button>

            <Button variant="outline" size="lg" className="flex-col h-32 gap-2" onClick={() => handleSave("excel")}>
              <FileSpreadsheet className="h-10 w-10" />
              <span>Als Excel speichern</span>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setSaveDialogOpen(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alles zurücksetzen?</DialogTitle>
            <DialogDescription>
              Möchten Sie wirklich alle Eingaben zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={() => setResetDialogOpen(false)}>
              Nein
            </Button>
            <Button variant="destructive" onClick={confirmReset}>
              Ja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

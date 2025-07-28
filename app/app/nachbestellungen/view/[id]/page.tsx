import { NachbestellungViewPage } from "@/components/nachbestellung-view-page"

interface PageProps {
  params: {
    id: string
  }
}

export default function NachbestellungViewPageRoute({ params }: PageProps) {
  const nachbestellungId = Number.parseInt(params.id, 10)

  if (isNaN(nachbestellungId)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Ungültige Nachbestellung</h2>
          <p className="text-gray-600">Die angegebene Nachbestellungs-ID ist ungültig.</p>
        </div>
      </div>
    )
  }

  return <NachbestellungViewPage nachbestellungId={nachbestellungId} />
}

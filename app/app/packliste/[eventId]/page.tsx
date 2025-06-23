import { PacklisteDetail } from "@/components/packliste-detail"

export default function PacklisteDetailPage({ params }: { params: { eventId: string } }) {
  return (
    <div className="container mx-auto py-8">
      <PacklisteDetail eventId={params.eventId} />
    </div>
  )
}

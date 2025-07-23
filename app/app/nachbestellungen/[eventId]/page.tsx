import { NachbestellungDetailPage } from "@/components/nachbestellung-detail-page"

export default function NachbestellungPage({ params }: { params: { eventId: string } }) {
  return <NachbestellungDetailPage eventId={params.eventId} />
}

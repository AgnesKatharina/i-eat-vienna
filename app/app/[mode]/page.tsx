import { MainApp } from "@/components/main-app"

export default function AppPage({ params }: { params: { mode: string } }) {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <MainApp mode={params.mode} />
    </main>
  )
}

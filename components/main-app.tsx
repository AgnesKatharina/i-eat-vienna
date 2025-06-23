import type React from "react"

interface MainAppProps {
  mode: string
}

export const MainApp: React.FC<MainAppProps> = ({ mode }) => {
  return <div>Original Main App Content</div>
}

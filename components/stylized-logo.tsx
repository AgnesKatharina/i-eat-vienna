import { UtensilsCrossed } from "lucide-react"

interface StylizedLogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StylizedLogo({ size = "md", className = "" }: StylizedLogoProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-100 via-blue-50 to-green-100 shadow-md"></div>
      <div className="absolute inset-3 rounded-full bg-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <UtensilsCrossed className="text-slate-800 w-12 h-12 mb-1" />
          <div className="text-xs font-bold text-slate-800 tracking-tight">I EAT VIENNA</div>
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border-4 border-white opacity-50"></div>
    </div>
  )
}

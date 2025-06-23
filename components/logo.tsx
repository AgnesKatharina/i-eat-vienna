import { UtensilsCrossed } from "lucide-react"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-100 to-blue-100 shadow-md"></div>
      <div className="absolute inset-2 rounded-full bg-white flex items-center justify-center">
        <div className="relative">
          <UtensilsCrossed className="text-slate-800 w-10 h-10" />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-400 border-2 border-white"></div>
        </div>
      </div>
    </div>
  )
}

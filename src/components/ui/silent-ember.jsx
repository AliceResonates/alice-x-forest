import * as React from "react"
import { cn } from "@/lib/utils"

export function SilentEmber() {
  const [isWarmed, setIsWarmed] = React.useState(false)

  // In a real database model this would just set a boolean flag
  // for the fragment to true. No user ID array, no counter.
  const handleTouch = () => {
    setIsWarmed(true)
    // Optional: silent backend call goes here
    // touchFragment(fragmentId)
  }

  return (
    <div className="flex justify-end mt-4 pt-4 border-t border-zinc-900/30">
      <button
        onClick={handleTouch}
        disabled={isWarmed}
        className={cn(
          "w-2.5 h-2.5 rounded-full transition-all duration-[2000ms] ease-out",
          isWarmed
            ? "bg-amber-600/60 shadow-[0_0_15px_rgba(217,119,6,0.4)] cursor-default"
            : "bg-zinc-800 hover:bg-zinc-700 cursor-pointer"
        )}
        title={isWarmed ? "Held" : "Touch"}
        aria-label="Give the text resonance"
      />
    </div>
  )
}

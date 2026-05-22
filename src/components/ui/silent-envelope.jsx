import * as React from "react"
import { cn } from "@/lib/utils"

export function SilentEnvelope({ onSeal }) {
  const [text, setText] = React.useState("")
  const [isSealing, setIsSealing] = React.useState(false)
  const timerRef = React.useRef(0)

  React.useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current)
    }
  }, [])

  const handleSeal = () => {
    if (isSealing) {
      window.clearTimeout(timerRef.current)
      timerRef.current = 0
      setIsSealing(false)
      return
    }

    setIsSealing(true)
    timerRef.current = window.setTimeout(() => {
      onSeal?.(text)
      setIsSealing(false)
      timerRef.current = 0
    }, 3000)
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 bg-zinc-950 p-8 rounded-lg border border-zinc-900">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isSealing}
        className={cn(
          "w-full h-64 bg-transparent text-zinc-300 border-none resize-none focus:outline-none focus:ring-0 text-lg leading-relaxed",
          "caret-zinc-500 custom-breathing-cursor"
        )}
        placeholder="Leave your thoughts in the undergrowth..."
      />

      <div className="flex justify-end pt-4 border-t border-zinc-900/50">
        <button
          onClick={handleSeal}
          disabled={isSealing || !text.trim()}
          className={cn(
            "px-6 py-2 rounded text-sm font-mono tracking-widest transition-all duration-500",
            isSealing
              ? "bg-amber-950/20 text-amber-500 animate-pulse border border-amber-900/50"
              : "bg-zinc-900 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
          )}
        >
          {isSealing ? "[ SEALING... CLICK HERE TO CANCEL ]" : "SEAL ENVELOPE"}
        </button>
      </div>
    </div>
  )
}

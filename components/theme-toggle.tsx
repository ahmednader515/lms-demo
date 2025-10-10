"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative h-8 w-16 rounded-full p-0 bg-muted"
      >
        <div className="absolute left-1 top-1 h-6 w-6 rounded-full bg-background shadow-md" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-8 w-16 rounded-full p-0 bg-muted hover:bg-muted/80"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <div className="absolute left-1 top-1 h-6 w-6 rounded-full bg-background shadow-md transition-transform duration-300 dark:translate-x-8">
        {theme === "dark" ? (
          <Moon className="absolute left-1 top-1 h-4 w-4" />
        ) : (
          <Sun className="absolute left-1 top-1 h-4 w-4" />
        )}
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 
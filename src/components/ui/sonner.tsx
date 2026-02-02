"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        // Default duration: 4 seconds (longer for better readability)
        duration: 4000,
        // Class names for different toast types
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md group-[.toast]:text-xs group-[.toast]:font-medium",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md group-[.toast]:text-xs group-[.toast]:font-medium",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-foreground/50 group-[.toast]:hover:text-foreground group-[.toast]:hover:bg-muted",
          // Type-specific styles
          success:
            "group-[.toaster]:border-green-500/30 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-950/30 group-[.toaster]:text-green-900 dark:group-[.toaster]:text-green-100",
          error:
            "group-[.toaster]:border-red-500/30 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950/30 group-[.toaster]:text-red-900 dark:group-[.toaster]:text-red-100",
          warning:
            "group-[.toaster]:border-yellow-500/30 group-[.toaster]:bg-yellow-50 dark:group-[.toaster]:bg-yellow-950/30 group-[.toaster]:text-yellow-900 dark:group-[.toaster]:text-yellow-100",
          info: "group-[.toaster]:border-blue-500/30 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950/30 group-[.toaster]:text-blue-900 dark:group-[.toaster]:text-blue-100",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-green-600 dark:text-green-400" />,
        info: <InfoIcon className="size-4 text-blue-600 dark:text-blue-400" />,
        warning: <TriangleAlertIcon className="size-4 text-yellow-600 dark:text-yellow-400" />,
        error: <OctagonXIcon className="size-4 text-red-600 dark:text-red-400" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
        close: <XIcon className="size-3" />,
      }}
      // Enable close button on all toasts
      closeButton
      // Gap between toasts
      gap={8}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

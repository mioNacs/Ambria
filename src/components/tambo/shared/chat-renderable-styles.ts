import { cn } from "@/lib/utils";

export const chatRenderableStyles = {
  card: cn(
    "w-full rounded-2xl border border-border/70 bg-card p-4 text-card-foreground",
    "shadow-sm shadow-black/5 dark:shadow-black/40",
  ),
  subcard: cn(
    "w-full rounded-xl border border-border/60 bg-card/80 p-3 text-card-foreground",
    "shadow-[0_1px_0_0_rgb(0_0_0/0.02)] dark:shadow-none",
  ),
  header: "flex items-start justify-between gap-4",
  kicker: "text-[11px] font-medium text-muted-foreground",
  title: "mt-1 truncate text-sm font-semibold tracking-tight text-foreground",
  subtitle:
    "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground",

  section: cn(
    "rounded-xl border border-border/60 bg-muted/10 p-3",
    "shadow-[inset_0_1px_0_0_rgb(255_255_255/0.4)] dark:shadow-none",
  ),
  sectionTitle: "text-xs font-medium text-muted-foreground",
  emptyState: cn(
    "rounded-xl border border-dashed border-border/70 bg-muted/5 p-3",
    "text-sm text-muted-foreground",
  ),

  pill:
    "inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground/90",

  button: cn(
    "inline-flex items-center gap-1.5 rounded-lg border border-border/70",
    "bg-background/70 px-2.5 py-1.5 text-xs font-medium text-foreground",
    "shadow-sm shadow-black/5 hover:bg-muted/50",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
  ),
  buttonPrimary: cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg",
    "bg-foreground px-3.5 py-2 text-sm font-semibold text-background",
    "shadow-sm shadow-black/10 hover:opacity-90",
    "transition-opacity motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
  ),

  input: cn(
    "w-full rounded-lg border border-border bg-background px-3 py-2",
    "text-sm text-foreground shadow-sm shadow-black/5",
    "placeholder:text-muted-foreground/70",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ),
  textarea: cn(
    "w-full min-h-[96px] resize-y rounded-lg border border-border bg-background px-3 py-2",
    "text-sm text-foreground shadow-sm shadow-black/5",
    "placeholder:text-muted-foreground/70",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ),
  select: cn(
    "w-full rounded-lg border border-border bg-background px-3 py-2",
    "text-sm text-foreground shadow-sm shadow-black/5",
    "transition-colors motion-reduce:transition-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ),
  checkbox: cn(
    "h-4 w-4 rounded border border-border bg-background",
    "accent-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  ),

  link: cn(
    "text-primary underline decoration-border/70 underline-offset-4",
    "hover:text-primary/90 hover:decoration-border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "rounded-sm",
  ),
} as const;

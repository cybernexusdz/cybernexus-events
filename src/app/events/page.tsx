import { EventsExplorer } from "@/components/events-explorer";
import { Badge } from "@/components/ui/badge";

export default function EventsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            CyberNexus Club Events &amp; Workshops
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse technical activities, reserve seats, and join competition waitlists.
          </p>
        </div>
        <Badge variant="cyber" className="self-start sm:self-auto py-1 px-3 font-mono text-xs">
          2026 Academic Season
        </Badge>
      </div>

      {/* Reusable Events Explorer */}
      <EventsExplorer />
    </div>
  );
}

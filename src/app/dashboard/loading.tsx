export default function DashboardLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 sm:px-8 py-10 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-border/60 pb-6 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-card/80 rounded-lg" />
          <div className="h-4 w-96 bg-card/50 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-card/60 rounded-lg" />
          <div className="h-8 w-28 bg-primary/20 rounded-lg" />
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl border border-border/50 bg-card/40 p-4 space-y-2"
          >
            <div className="h-3 w-20 bg-card/60 rounded" />
            <div className="h-7 w-28 bg-card/80 rounded" />
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-80 bg-card/60 rounded-xl" />
        <div className="h-96 rounded-xl border border-border/50 bg-card/30 p-6 space-y-3">
          <div className="h-6 w-48 bg-card/60 rounded" />
          <div className="h-4 w-72 bg-card/40 rounded" />
          <div className="h-64 bg-card/20 rounded-lg mt-4" />
        </div>
      </div>
    </div>
  );
}

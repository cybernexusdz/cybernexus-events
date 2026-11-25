export default function EventsLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-8 py-10 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-border/60 pb-6 space-y-2">
        <div className="h-8 w-64 bg-card/80 rounded-lg" />
        <div className="h-4 w-96 bg-card/50 rounded-lg" />
      </div>

      {/* Filter skeleton */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="h-9 w-64 bg-card/60 rounded-lg" />
        <div className="h-7 w-20 bg-card/40 rounded-full" />
        <div className="h-7 w-24 bg-card/40 rounded-full" />
        <div className="h-7 w-24 bg-card/40 rounded-full" />
      </div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-80 rounded-2xl border border-border/50 bg-card/40 p-6 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-20 bg-primary/20 rounded-full" />
                <div className="h-4 w-16 bg-muted/40 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-card/80 rounded" />
              <div className="h-4 w-full bg-card/50 rounded" />
              <div className="h-4 w-2/3 bg-card/50 rounded" />
            </div>
            <div className="h-9 w-full bg-card/70 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

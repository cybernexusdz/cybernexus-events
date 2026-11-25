export default function MyTicketsLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 sm:px-8 py-10 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="border-b border-border/60 pb-6 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-52 bg-card/80 rounded-lg" />
          <div className="h-4 w-80 bg-card/50 rounded-lg" />
        </div>
        <div className="h-6 w-28 bg-primary/20 rounded-full" />
      </div>

      {/* Ticket Cards Skeleton */}
      <div className="space-y-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/40 p-6 space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-border/40">
              <div className="h-5 w-24 bg-card/80 rounded-full" />
              <div className="h-4 w-36 bg-card/50 rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-3">
                <div className="h-7 w-3/4 bg-card/80 rounded" />
                <div className="h-4 w-1/2 bg-card/50 rounded" />
                <div className="h-4 w-2/3 bg-card/50 rounded" />
              </div>
              <div className="flex justify-center items-center">
                <div className="h-32 w-32 bg-white/10 rounded-xl" />
              </div>
            </div>

            <div className="pt-3 border-t border-border/40 flex justify-between">
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-card/60 rounded-lg" />
                <div className="h-8 w-28 bg-card/60 rounded-lg" />
              </div>
              <div className="h-8 w-20 bg-card/40 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

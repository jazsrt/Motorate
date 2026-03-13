export function PostCardSkeleton() {
  return (
    <div className="rounded-3xl bg-surface overflow-hidden border border-surfacehighlight/30 shadow-xl animate-pulse">
      {/* Header */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 flex items-center gap-3">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surfacehighlight" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-surfacehighlight rounded w-1/3" />
          <div className="h-3 bg-surfacehighlight rounded w-1/4" />
        </div>
      </div>

      {/* Image Placeholder */}
      <div className="w-full h-96 bg-surfacehighlight" />

      {/* Actions */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 bg-gradient-to-r from-surface/30 to-surfacehighlight/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
            <div className="h-8 w-16 bg-surfacehighlight rounded-lg" />
            <div className="h-8 w-16 bg-surfacehighlight rounded-lg" />
            <div className="h-8 w-16 bg-surfacehighlight rounded-lg" />
          </div>
          <div className="h-8 w-8 bg-surfacehighlight rounded-full" />
        </div>
      </div>

      {/* Caption */}
      <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-5 md:py-5 space-y-2 sm:space-y-3">
        <div className="h-4 bg-surfacehighlight rounded w-2/3" />
        <div className="h-4 bg-surfacehighlight rounded w-1/2" />
      </div>
    </div>
  );
}

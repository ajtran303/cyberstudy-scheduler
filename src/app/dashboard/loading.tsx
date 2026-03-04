export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-24 rounded-lg bg-muted animate-pulse" />
      <div className="h-10 w-64 rounded-md bg-muted animate-pulse" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

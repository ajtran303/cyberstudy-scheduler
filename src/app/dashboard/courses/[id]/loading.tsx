export default function CourseLoading() {
  return (
    <div className="space-y-6">
      <div className="h-16 rounded-md bg-muted animate-pulse" />
      <div className="h-10 w-96 rounded-md bg-muted animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}

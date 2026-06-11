export default function MatchesLoading() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton mb-2 h-9 w-40 rounded-lg" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  );
}

export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="skeleton h-7 w-64" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card space-y-2 p-4">
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton h-7 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="card space-y-3 p-5">
            <div className="skeleton h-5 w-40" />
            {Array.from({ length: 4 }).map((__, row) => (
              <div key={row} className="skeleton h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

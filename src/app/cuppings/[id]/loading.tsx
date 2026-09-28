export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="skeleton mb-2 h-6 w-24" />
        <div className="skeleton h-8 w-2/3" />
        <div className="skeleton mt-1 h-4 w-1/2" />
      </div>
      <div className="rounded-[10px] border border-line bg-card px-3 py-3">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton mt-3 h-10 w-full" />
        <div className="skeleton mt-3 h-10 w-full" />
        <div className="skeleton mt-3 h-10 w-full" />
        <div className="skeleton mt-3 h-20 w-full" />
      </div>
    </div>
  );
}

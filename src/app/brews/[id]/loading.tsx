import { CardSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-2 h-10 w-40" />
        <div className="skeleton mt-2 h-4 w-56" />
      </div>
      <CardSkeleton />
    </div>
  );
}

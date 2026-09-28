import { CardSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-4 h-8 w-32" />
      <div className="skeleton mb-3 h-11 w-full" />
      <div className="skeleton mb-3 h-11 w-40" />
      <CardSkeleton />
    </div>
  );
}

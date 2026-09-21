import { CardSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div>
      <div className="skeleton mb-4 h-8 w-48" />
      <CardSkeleton />
    </div>
  );
}

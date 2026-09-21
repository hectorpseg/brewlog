import { CardSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-8 w-40" />
      <CardSkeleton />
    </div>
  );
}

import { CardSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-8 w-32" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-11 w-full" />
        <div className="skeleton h-11 w-full" />
      </div>
      <CardSkeleton />
    </div>
  );
}

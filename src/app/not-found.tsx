import { ErrorState } from "@/components/states";

export default function NotFound() {
  return (
    <div className="pt-6">
      <ErrorState
        title="Page not in the notebook"
        body="This entry does not exist or was removed."
        backHref="/brews"
        backLabel="Back to brews"
      />
    </div>
  );
}

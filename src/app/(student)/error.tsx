"use client";

import { ErrorState } from "@/components/empty-state";

export default function StudentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      title="Something went wrong"
      description="An unexpected error occurred. Try refreshing the page."
      onRetry={reset}
    />
  );
}

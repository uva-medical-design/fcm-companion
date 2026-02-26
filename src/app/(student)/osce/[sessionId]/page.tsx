"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function OsceSessionRouter() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  useEffect(() => {
    async function redirect() {
      try {
        const res = await fetch(`/api/osce-session/${sessionId}`);
        if (!res.ok) {
          router.push("/osce");
          return;
        }
        const data = await res.json();
        const status = data.session?.status;

        switch (status) {
          case "door_prep":
            router.replace(`/osce/${sessionId}/door-prep`);
            break;
          case "soap_note":
            router.replace(`/osce/${sessionId}/soap-note`);
            break;
          case "completed":
            router.replace(`/osce/${sessionId}/feedback`);
            break;
          default:
            router.push("/osce");
        }
      } catch {
        router.push("/osce");
      }
    }

    redirect();
  }, [sessionId, router]);

  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-5 w-5 animate-spin-slow text-primary" />
    </div>
  );
}

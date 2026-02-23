"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmUser } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stethoscope, Play } from "lucide-react";

const DEMO_USER: FcmUser = {
  id: "demo-student",
  name: "Demo Student",
  email: null,
  role: "student",
  fcm_group: null,
  year_level: "M1",
  created_at: new Date().toISOString(),
};

function DemoRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser } = useUser();

  useEffect(() => {
    if (searchParams.get("demo") === "true") {
      localStorage.removeItem("fcm-onboarding-complete");
      setUser(DEMO_USER);
      router.push("/practice");
    }
  }, [searchParams, setUser, router]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const { user, setUser } = useUser();
  const [users, setUsers] = useState<FcmUser[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("fcm_users")
        .select("*")
        .order("name");

      if (error) {
        setError("Could not load roster. Check your Supabase connection.");
        setLoading(false);
        return;
      }

      setUsers(data || []);
      setLoading(false);
    }

    fetchUsers();
  }, []);

  useEffect(() => {
    if (user && !selectedId) {
      setSelectedId(user.id);
    }
  }, [user, selectedId]);

  function handleDemo() {
    localStorage.removeItem("fcm-onboarding-complete");
    setUser(DEMO_USER);
    router.push("/practice");
  }

  function handleContinue() {
    const selected = users.find((u) => u.id === selectedId);
    if (selected) {
      setUser(selected);
      if (selected.role === "student") {
        router.push("/cases");
      } else {
        router.push("/dashboard");
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background p-8">
      <Suspense>
        <DemoRedirect />
      </Suspense>
      <main className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div className="text-2xl font-bold tracking-tight">
            FCM Companion
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Differential diagnosis practice for UVA medical students
          </p>
        </div>

        <div className="flex w-full flex-col gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading roster...</p>
          ) : error ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                      {u.role !== "student" && (
                        <span className="ml-2 text-muted-foreground">
                          ({u.role})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={handleContinue}
                disabled={!selectedId}
                className="w-full"
              >
                Continue
              </Button>
            </>
          )}
        </div>

        <div className="flex w-full flex-col items-center gap-3">
          <div className="flex items-center gap-3 w-full">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" onClick={handleDemo} className="w-full">
            <Play className="h-4 w-4 mr-1" />
            Try as Demo Student
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          UVA School of Medicine — Foundations of Clinical Medicine
        </p>
      </main>
    </div>
  );
}

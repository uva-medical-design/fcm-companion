"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useOsceAutosave(
  sessionId: string | null,
  field: "door_prep" | "soap_note",
  data: unknown,
  enabled: boolean = true
) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const save = useCallback(
    async (payload: unknown) => {
      if (!sessionId) return;
      setSaveStatus("saving");
      const { error } = await supabase
        .from("fcm_osce_sessions")
        .update({
          [field]: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);
      setSaveStatus(error ? "error" : "saved");
    },
    [sessionId, field]
  );

  useEffect(() => {
    if (!enabled || !sessionId) return;
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lastSavedRef.current = serialized;
      save(data);
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, enabled, save, sessionId]);

  return { saveStatus };
}

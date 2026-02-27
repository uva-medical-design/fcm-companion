"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmNote, FcmCase } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Send,
  CheckCircle,
  Loader2,
  StickyNote,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NoteWithCase extends FcmNote {
  fcm_cases: FcmCase;
}

export default function NotesPage() {
  const { user } = useUser();
  const [notes, setNotes] = useState<NoteWithCase[]>([]);
  const [cases, setCases] = useState<FcmCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"all" | "osce">("all");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchData() {
      const [notesRes, casesRes] = await Promise.all([
        supabase
          .from("fcm_notes")
          .select("*, fcm_cases(*)")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("fcm_cases")
          .select("*")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (notesRes.data) setNotes(notesRes.data as NoteWithCase[]);
      if (casesRes.data) setCases(casesRes.data);
      setLoading(false);
    }

    fetchData();
  }, [user]);

  const saveNote = useCallback(
    async (caseId: string, updates: Partial<FcmNote>) => {
      if (!user) return;
      setSaving(caseId);
      await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          case_id: caseId,
          ...updates,
        }),
      });

      // Refresh notes
      const { data } = await supabase
        .from("fcm_notes")
        .select("*, fcm_cases(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) setNotes(data as NoteWithCase[]);
      setSaving(null);
    },
    [user]
  );

  function handleContentChange(caseId: string, content: string) {
    setEditContent(content);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveNote(caseId, { content });
    }, 1000);
  }

  function handleToggleStar(note: NoteWithCase) {
    saveNote(note.case_id, { is_starred: !note.is_starred });
  }

  function handleSendToInstructor(note: NoteWithCase) {
    saveNote(note.case_id, { is_sent_to_instructor: true });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  // Filter out Plan Ahead structured data from note content for display
  function displayContent(content: string | null): string {
    if (!content) return "";
    try {
      const parsed = JSON.parse(content);
      if (parsed.__planv2) return "";
    } catch {
      // Not JSON — normal note text
    }
    return content;
  }

  const starredNotes = notes.filter((n) => n.is_starred && displayContent(n.content));
  const displayNotes = view === "osce" ? starredNotes : notes;

  // Cases that don't have notes yet
  const casesWithoutNotes = cases.filter(
    (c) => !notes.find((n) => n.case_id === c.id)
  );

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Notes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Per-case notes and OSCE pearls
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          variant={view === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("all")}
        >
          <StickyNote className="h-4 w-4 mr-1" />
          All Notes
        </Button>
        <Button
          variant={view === "osce" ? "default" : "outline"}
          size="sm"
          onClick={() => setView("osce")}
        >
          <GraduationCap className="h-4 w-4 mr-1" />
          OSCE Pearls ({starredNotes.length})
        </Button>
      </div>

      {view === "osce" && starredNotes.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No starred notes yet. Star your high-yield notes to build your OSCE
            study bank.
          </CardContent>
        </Card>
      )}

      {/* Notes list */}
      <div className="space-y-3">
        {displayNotes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {note.fcm_cases?.chief_complaint || "Unknown Case"}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {note.is_sent_to_instructor && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Send className="h-2.5 w-2.5 mr-0.5" />
                      Sent
                    </Badge>
                  )}
                  <button
                    onClick={() => handleToggleStar(note)}
                    className="p-1"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        note.is_starred
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingNote === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) =>
                      handleContentChange(note.case_id, e.target.value)
                    }
                    placeholder="Add your notes..."
                    className="min-h-[100px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingNote(null)}
                    >
                      Done
                    </Button>
                    {!note.is_sent_to_instructor && displayContent(note.content) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendToInstructor(note)}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Send to Instructor
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm cursor-pointer whitespace-pre-wrap"
                  onClick={() => {
                    setEditingNote(note.id);
                    setEditContent(displayContent(note.content));
                  }}
                >
                  {displayContent(note.content) || (
                    <span className="text-muted-foreground italic">
                      Tap to add notes...
                    </span>
                  )}
                </div>
              )}
              {saving === note.case_id && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Saving...
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create notes for cases without them */}
      {view === "all" && casesWithoutNotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Add Notes For
          </h2>
          {casesWithoutNotes.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => {
                saveNote(c.id, { content: "" });
              }}
            >
              <CardContent className="p-3 text-sm text-muted-foreground">
                {c.chief_complaint}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

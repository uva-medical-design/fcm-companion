"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import type { FcmCase, FcmSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  CheckCircle,
  Settings,
  BookOpen,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";

export default function AdminPage() {
  const { user } = useUser();
  const [cases, setCases] = useState<FcmCase[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"settings" | "cases">("settings");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [showCreateCase, setShowCreateCase] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [createCaseResult, setCreateCaseResult] = useState<string | null>(null);
  const [newCase, setNewCase] = useState({
    case_id: "",
    title: "",
    chief_complaint: "",
    patient_age: "",
    patient_gender: "",
    body_system: "",
    difficulty: "Moderate",
    differential_answer_key: "[]",
  });
  const [newSchedule, setNewSchedule] = useState({
    enabled: false,
    fcm_group: "All",
    week_label: "",
    unlock_date: "",
    due_date: "",
    session_date: "",
  });

  useEffect(() => {
    async function fetchData() {
      const [casesRes, settingsRes] = await Promise.all([
        supabase.from("fcm_cases").select("*").order("sort_order"),
        supabase.from("fcm_settings").select("*"),
      ]);

      if (casesRes.data) setCases(casesRes.data);
      if (settingsRes.data) {
        const map: Record<string, unknown> = {};
        for (const s of settingsRes.data) {
          map[s.key] = s.value;
        }
        setSettings(map);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function saveSetting(key: string, value: unknown) {
    setSaving(true);
    await supabase
      .from("fcm_settings")
      .upsert(
        {
          key,
          value: JSON.stringify(value),
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function toggleCaseActive(caseItem: FcmCase) {
    await supabase
      .from("fcm_cases")
      .update({ is_active: !caseItem.is_active })
      .eq("id", caseItem.id);

    setCases((prev) =>
      prev.map((c) =>
        c.id === caseItem.id ? { ...c, is_active: !c.is_active } : c
      )
    );
  }

  async function handleCreateCase() {
    if (!newCase.case_id || !newCase.title || !newCase.chief_complaint) return;
    setCreatingCase(true);
    setCreateCaseResult(null);
    try {
      let answerKey = [];
      try {
        answerKey = JSON.parse(newCase.differential_answer_key);
      } catch {
        // ignore parse errors, use empty array
      }

      const caseData = {
        case_id: newCase.case_id,
        title: newCase.title,
        chief_complaint: newCase.chief_complaint,
        patient_age: newCase.patient_age ? parseInt(newCase.patient_age) : null,
        patient_gender: newCase.patient_gender || null,
        body_system: newCase.body_system || null,
        difficulty: newCase.difficulty,
        differential_answer_key: answerKey,
        is_active: true,
        sort_order: cases.length,
      };

      const { data, error } = await supabase
        .from("fcm_cases")
        .insert(caseData)
        .select()
        .single();

      if (error) throw error;

      // Optionally create schedule
      if (newSchedule.enabled && newSchedule.unlock_date && newSchedule.due_date && newSchedule.session_date) {
        await supabase.from("fcm_schedule").insert({
          case_id: data.id,
          fcm_group: newSchedule.fcm_group === "All" ? null : newSchedule.fcm_group,
          week_label: newSchedule.week_label,
          unlock_date: newSchedule.unlock_date,
          due_date: newSchedule.due_date,
          session_date: newSchedule.session_date,
          semester: (settings.semester as string) || "2026-Spring",
        });
      }

      setCases((prev) => [...prev, data]);
      setCreateCaseResult("Case created successfully");
      setShowCreateCase(false);
      // Reset form
      setNewCase({ case_id: "", title: "", chief_complaint: "", patient_age: "", patient_gender: "", body_system: "", difficulty: "Moderate", differential_answer_key: "[]" });
      setNewSchedule({ enabled: false, fcm_group: "All", week_label: "", unlock_date: "", due_date: "", session_date: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setCreateCaseResult(`Failed: ${message}`);
    } finally {
      setCreatingCase(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    setResetResult(null);
    try {
      const { data, error } = await supabase.rpc("reset_test_data");
      if (error) throw error;
      setResetResult(
        `Reset complete: ${data.cleared.submissions} submissions, ${data.cleared.notes} notes, ${data.cleared.osce_responses} OSCE responses cleared.`
      );
      setShowResetConfirm(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setResetResult(`Reset failed: ${message}`);
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Admin access required.
        </p>
      </div>
    );
  }

  const feedbackMode = (settings.feedback_mode as string) || "combined";
  const defaultFramework =
    (settings.default_framework as string) || "vindicate";
  const semester = (settings.semester as string) || "2026-Spring";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System settings and case library management
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-2">
        <Button
          variant={tab === "settings" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("settings")}
        >
          <Settings className="h-4 w-4 mr-1" />
          Settings
        </Button>
        <Button
          variant={tab === "cases" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("cases")}
        >
          <BookOpen className="h-4 w-4 mr-1" />
          Case Library ({cases.length})
        </Button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4" />
          Saved
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-4">
          {/* Feedback Mode */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Feedback Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                Controls what students see after submitting their differential
              </p>
              <Select
                value={feedbackMode}
                onValueChange={(v) => saveSetting("feedback_mode", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breadth">
                    Breadth — Focus on VINDICATE coverage
                  </SelectItem>
                  <SelectItem value="cant_miss">
                    Can&apos;t-Miss — Focus on dangerous diagnoses
                  </SelectItem>
                  <SelectItem value="combined">
                    Combined — Both breadth and can&apos;t-miss (recommended)
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Default Framework */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Default Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={defaultFramework}
                onValueChange={(v) => saveSetting("default_framework", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vindicate">VINDICATE</SelectItem>
                  <SelectItem value="anatomic">Head-to-Toe Anatomic</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Semester */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Semester</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={semester}
                onChange={(e) => saveSetting("semester", e.target.value)}
                placeholder="e.g., 2026-Spring"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "cases" && (
        <div className="space-y-3">
          <Button onClick={() => setShowCreateCase(true)} size="sm">
            <Plus className="h-4 w-4" />
            Create Case
          </Button>
          {createCaseResult && (
            <p className={`text-xs ${createCaseResult.startsWith("Failed") ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>
              {!createCaseResult.startsWith("Failed") && <CheckCircle className="h-3.5 w-3.5 inline mr-1" />}
              {createCaseResult}
            </p>
          )}
          {cases.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {c.case_id}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {c.difficulty}
                      </Badge>
                      {!c.is_active && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.chief_complaint}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{c.body_system}</span>
                      <span>
                        {c.differential_answer_key?.length || 0} diagnoses in
                        key
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCaseActive(c)}
                  >
                    {c.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Testing Tools — Danger Zone */}
      <div className="border-t pt-6 mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" />
          Testing Tools
        </h2>
        <Card className="border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Reset Test Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Clears all submissions, notes, and OSCE responses.
                  Preserves roster, cases, schedule, and settings.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="shrink-0"
                onClick={() => setShowResetConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            </div>
            {resetResult && (
              <p
                className={`text-xs mt-3 ${
                  resetResult.startsWith("Reset complete")
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                }`}
              >
                {resetResult.startsWith("Reset complete") && (
                  <CheckCircle className="h-3.5 w-3.5 inline mr-1" />
                )}
                {resetResult}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Case Dialog */}
      <Dialog open={showCreateCase} onOpenChange={setShowCreateCase}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Case</DialogTitle>
            <DialogDescription>
              Add a new case to the FCM case library
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="case_id">Case ID *</Label>
                <Input
                  id="case_id"
                  value={newCase.case_id}
                  onChange={(e) => setNewCase((p) => ({ ...p, case_id: e.target.value }))}
                  placeholder="FCM-CV-002"
                />
              </div>
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={newCase.title}
                  onChange={(e) => setNewCase((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Chest Pain Case 2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="chief_complaint">Chief Complaint *</Label>
              <Input
                id="chief_complaint"
                value={newCase.chief_complaint}
                onChange={(e) => setNewCase((p) => ({ ...p, chief_complaint: e.target.value }))}
                placeholder="55-year-old male with acute chest pain"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="patient_age">Patient Age</Label>
                <Input
                  id="patient_age"
                  type="number"
                  value={newCase.patient_age}
                  onChange={(e) => setNewCase((p) => ({ ...p, patient_age: e.target.value }))}
                  placeholder="55"
                />
              </div>
              <div>
                <Label htmlFor="patient_gender">Patient Gender</Label>
                <Select
                  value={newCase.patient_gender}
                  onValueChange={(v) => setNewCase((p) => ({ ...p, patient_gender: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="body_system">Body System</Label>
                <Select
                  value={newCase.body_system}
                  onValueChange={(v) => setNewCase((p) => ({ ...p, body_system: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["Cardiovascular", "Pulmonary", "GI", "Musculoskeletal", "Neurological", "Renal/GU", "Infectious", "Endocrine/Metabolic", "Other"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={newCase.difficulty}
                  onValueChange={(v) => setNewCase((p) => ({ ...p, difficulty: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="answer_key">Differential Answer Key (JSON)</Label>
              <Textarea
                id="answer_key"
                value={newCase.differential_answer_key}
                onChange={(e) => setNewCase((p) => ({ ...p, differential_answer_key: e.target.value }))}
                className="font-mono text-xs min-h-24"
                placeholder='[{"diagnosis": "Acute Coronary Syndrome", "tier": "most_likely", "is_common": true, "is_cant_miss": true}]'
              />
            </div>

            {/* Schedule section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="schedule_enabled"
                  checked={newSchedule.enabled}
                  onChange={(e) => setNewSchedule((p) => ({ ...p, enabled: e.target.checked }))}
                  className="rounded border"
                />
                <Label htmlFor="schedule_enabled" className="font-medium">Schedule this case</Label>
              </div>
              {newSchedule.enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="fcm_group">FCM Group</Label>
                      <Select
                        value={newSchedule.fcm_group}
                        onValueChange={(v) => setNewSchedule((p) => ({ ...p, fcm_group: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Groups</SelectItem>
                          <SelectItem value="A">Group A</SelectItem>
                          <SelectItem value="B">Group B</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="week_label">Week Label</Label>
                      <Input
                        id="week_label"
                        value={newSchedule.week_label}
                        onChange={(e) => setNewSchedule((p) => ({ ...p, week_label: e.target.value }))}
                        placeholder="Week 8"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="unlock_date">Unlock Date</Label>
                      <Input
                        id="unlock_date"
                        type="date"
                        value={newSchedule.unlock_date}
                        onChange={(e) => setNewSchedule((p) => ({ ...p, unlock_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input
                        id="due_date"
                        type="date"
                        value={newSchedule.due_date}
                        onChange={(e) => setNewSchedule((p) => ({ ...p, due_date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="session_date">Session Date</Label>
                      <Input
                        id="session_date"
                        type="date"
                        value={newSchedule.session_date}
                        onChange={(e) => setNewSchedule((p) => ({ ...p, session_date: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCase(false)} disabled={creatingCase}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCase}
              disabled={creatingCase || !newCase.case_id || !newCase.title || !newCase.chief_complaint}
            >
              {creatingCase ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Case"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all test data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all student submissions, notes, and
              OSCE responses. The roster, cases, schedule, and settings will be
              preserved.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm font-medium text-destructive">
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
              disabled={resetting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Resetting...
                </>
              ) : (
                "Reset Test Data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

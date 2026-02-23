"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-context";
import { Sun, Moon, Monitor, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "fcm-onboarding-complete";

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      // Small delay so the page renders first
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleComplete() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  }

  const themeOptions = [
    { value: "light" as const, icon: Sun, label: "Light", description: "Clean and bright" },
    { value: "dark" as const, icon: Moon, label: "Dark", description: "Easy on the eyes" },
    { value: "system" as const, icon: Monitor, label: "System", description: "Match your device" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        {step === 0 && (
          <>
            <DialogHeader>
              <div className="flex justify-center mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Stethoscope className="h-6 w-6" />
                </div>
              </div>
              <DialogTitle className="text-center">Welcome to FCM Companion</DialogTitle>
              <DialogDescription className="text-center">
                Practice differential diagnosis, get AI feedback, and prepare for FCM sessions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="mt-0.5 text-primary font-medium text-sm">1</span>
                <div>
                  <p className="text-sm font-medium">Build your differential</p>
                  <p className="text-xs text-muted-foreground">Add diagnoses for each case using the autocomplete search</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="mt-0.5 text-primary font-medium text-sm">2</span>
                <div>
                  <p className="text-sm font-medium">Get feedback</p>
                  <p className="text-xs text-muted-foreground">Submit to see how your list compares to the expert differential</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <span className="mt-0.5 text-primary font-medium text-sm">3</span>
                <div>
                  <p className="text-sm font-medium">Practice more</p>
                  <p className="text-xs text-muted-foreground">Try extra cases from the practice library to sharpen your skills</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setStep(1)} className="w-full">
                Next
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">Choose your appearance</DialogTitle>
              <DialogDescription className="text-center">
                You can change this anytime from the sidebar.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3 py-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    theme === opt.value
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <opt.icon className={cn(
                    "h-6 w-6",
                    theme === opt.value ? "text-primary" : "text-muted-foreground"
                  )} />
                  <div className="text-center">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={handleComplete} className="w-full">
                Get started
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

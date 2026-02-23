"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  title: string;
  content: React.ReactNode;
}

function Accordion({ sections }: { sections: Section[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {sections.map((section, i) => (
        <Card key={i}>
          <button
            className="flex w-full items-center justify-between p-4 text-left"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            aria-expanded={openIndex === i}
          >
            <span className="text-sm font-medium">{section.title}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                openIndex === i && "rotate-180"
              )}
            />
          </button>
          {openIndex === i && (
            <CardContent className="pt-0 pb-4">
              <div className="text-sm leading-relaxed space-y-3">
                {section.content}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

export default function ReferencePage() {
  const sections: Section[] = [
    {
      title: "What Is a Differential Diagnosis?",
      content: (
        <>
          <p>
            A differential diagnosis is a list of possible conditions that could
            explain a patient&apos;s symptoms. It&apos;s not about getting the
            &quot;right answer&quot; — it&apos;s about thinking broadly and
            systematically.
          </p>
          <p>
            When you see a chief complaint like &quot;45-year-old female with
            chest pain,&quot; your job is to consider all the plausible causes —
            from the most common to the most dangerous.
          </p>
          <div className="rounded-lg bg-accent/50 p-3">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              Example
            </p>
            <p>
              <strong>Chief complaint:</strong> &quot;22-year-old male with chest
              pain&quot;
            </p>
            <p className="mt-1">
              A good differential might include: Acute Coronary Syndrome,
              Pericarditis, Costochondritis, Pulmonary Embolism, Pneumothorax,
              Rib Contusion, GERD, Anxiety/Panic Attack, Myocarditis.
            </p>
            <p className="mt-1 text-muted-foreground">
              Notice: you only have age, gender, and chief complaint. You
              don&apos;t need the full history to start thinking broadly.
            </p>
          </div>
        </>
      ),
    },
    {
      title: "Broad vs. Focused Differential",
      content: (
        <>
          <p>
            <strong>Broad differential:</strong> Cast a wide net. Include
            diagnoses from multiple organ systems and VINDICATE categories. This
            is what you do before you know the full picture — and it&apos;s what
            FCM expects early in training.
          </p>
          <p>
            <strong>Focused differential:</strong> After gathering history and
            physical exam findings, you narrow your list. This happens after the
            patient encounter, not before.
          </p>
          <div className="rounded-lg bg-accent/50 p-3">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              Key insight
            </p>
            <p>
              On the OSCE, you get points for thinking of as many close
              differentials as possible — not just the right one. Breadth is
              valued.
            </p>
          </div>
        </>
      ),
    },
    {
      title: "The VINDICATE Framework",
      content: (
        <>
          <p>
            VINDICATE is a mnemonic that helps you systematically consider
            categories of disease. Using it prevents you from anchoring on one
            type of diagnosis.
          </p>
          <div className="space-y-2 mt-2">
            {[
              {
                letter: "V",
                label: "Vascular",
                examples: "MI, PE, stroke, DVT, aortic dissection",
              },
              {
                letter: "I",
                label: "Infectious",
                examples:
                  "Pneumonia, UTI, meningitis, appendicitis, cholecystitis",
              },
              {
                letter: "N",
                label: "Neoplastic",
                examples: "Lung cancer, lymphoma, brain tumor",
              },
              {
                letter: "D",
                label: "Degenerative",
                examples: "Osteoarthritis, disc herniation, spinal stenosis",
              },
              {
                letter: "I",
                label: "Iatrogenic / Intoxication",
                examples: "Drug side effects, medication overdose, alcohol",
              },
              {
                letter: "C",
                label: "Congenital",
                examples:
                  "Congenital heart disease, Marfan syndrome, sickle cell",
              },
              {
                letter: "A",
                label: "Autoimmune / Allergic",
                examples: "Lupus, rheumatoid arthritis, anaphylaxis",
              },
              {
                letter: "T",
                label: "Traumatic",
                examples: "Fractures, rib contusion, muscle strain",
              },
              {
                letter: "E",
                label: "Endocrine / Metabolic",
                examples: "Diabetes, thyroid disease, electrolyte imbalance",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border p-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-medium shrink-0">
                  {item.letter}
                </span>
                <div>
                  <p className="font-medium text-xs">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.examples}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "What Is an Illness Script?",
      content: (
        <>
          <p>
            An illness script is a mental model of a disease. Over time, you
            build these through experience. Each script has three parts:
          </p>
          <div className="space-y-2 mt-2">
            <div className="rounded-lg border p-2">
              <p className="text-xs font-medium">
                1. Predisposing / Epidemiology
              </p>
              <p className="text-xs text-muted-foreground">
                Who gets this? Age, gender, risk factors, demographics
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xs font-medium">2. Pathophysiology</p>
              <p className="text-xs text-muted-foreground">
                What&apos;s happening in the body? The mechanism of disease
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xs font-medium">3. Clinical Presentation</p>
              <p className="text-xs text-muted-foreground">
                What does the patient look like? Symptoms, signs, lab findings
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-accent/50 p-3 mt-2">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              Example: Acute Pericarditis
            </p>
            <p className="text-xs">
              <strong>Who:</strong> Young adult, often after viral illness or
              chest trauma
            </p>
            <p className="text-xs">
              <strong>What:</strong> Inflammation of the pericardium
            </p>
            <p className="text-xs">
              <strong>How it presents:</strong> Sharp pleuritic chest pain, worse
              lying down, better leaning forward. Friction rub on exam. Diffuse
              ST elevation on ECG.
            </p>
          </div>
        </>
      ),
    },
    {
      title: "How to Present a Differential",
      content: (
        <>
          <p>
            When presenting your differential in FCM, use this structure:
          </p>
          <div className="space-y-2 mt-2">
            <div className="rounded-lg border p-2">
              <p className="text-xs font-medium">
                1. Start with the most likely
              </p>
              <p className="text-xs text-muted-foreground">
                &quot;My leading diagnosis is [X] because...&quot;
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xs font-medium">
                2. Mention what you need to rule out
              </p>
              <p className="text-xs text-muted-foreground">
                &quot;I want to rule out [dangerous condition] because...&quot;
              </p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-xs font-medium">
                3. Show your breadth
              </p>
              <p className="text-xs text-muted-foreground">
                &quot;I also considered [categories/diagnoses] to make sure
                I&apos;m not missing anything.&quot;
              </p>
            </div>
          </div>
          <div className="rounded-lg bg-accent/50 p-3 mt-2">
            <p className="font-medium text-xs text-muted-foreground mb-1">
              Pro tip
            </p>
            <p>
              You don&apos;t need to be right. You need to show that you&apos;re
              thinking systematically and considering important possibilities.
              Your coach wants to see your clinical reasoning, not a memorized
              list.
            </p>
          </div>
        </>
      ),
    },
    {
      title: "Common vs. Can't-Miss Diagnoses",
      content: (
        <>
          <p>
            Every differential should consider two categories of diagnoses:
          </p>
          <div className="rounded-lg border p-2 mt-2">
            <p className="text-xs font-medium">Common diagnoses</p>
            <p className="text-xs text-muted-foreground">
              Conditions that are statistically most likely given the
              presentation. &quot;When you hear hoofbeats, think horses.&quot;
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 mt-2 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-xs font-medium">
              Can&apos;t-miss diagnoses
            </p>
            <p className="text-xs text-muted-foreground">
              Dangerous conditions that must be considered regardless of how
              likely they are. Missing these could be life-threatening. Examples:
              PE in chest pain, cauda equina in back pain, ectopic pregnancy in
              abdominal pain.
            </p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            A good differential includes both. The feedback in this app
            specifically tracks whether you identified the common and can&apos;t-miss
            diagnoses for each case.
          </p>
        </>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resources</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Learning resources for differential diagnosis
        </p>
      </div>

      <Accordion sections={sections} />
    </div>
  );
}

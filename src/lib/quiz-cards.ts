import type { FcmCase, FcmSubmission, FeedbackResult } from "@/types";
import { VINDICATE_CATEGORIES } from "@/types";

// ─── Quiz card types ────────────────────────────────────────────────
export type QuizCard =
  | { type: "recall"; question: string; answer: string }
  | {
      type: "true_false";
      statement: string;
      correct: boolean;
      explanation: string;
    }
  | {
      type: "multiple_choice";
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    };

// ─── Utilities ──────────────────────────────────────────────────────
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Full card generation (7+ cards) ────────────────────────────────
export function generateCards(
  caseData: FcmCase,
  submission: FcmSubmission,
  feedback: FeedbackResult
): QuizCard[] {
  const cards: QuizCard[] = [];
  const studentDiagnoses = submission.diagnoses.map((d) => d.diagnosis);

  // 1. Chief complaint recall (always first)
  cards.push({
    type: "recall",
    question: "What was this week's chief complaint?",
    answer: caseData.chief_complaint,
  });

  // 2. True/False: "Was [diagnosis] in your differential?"
  const allMissed = [...feedback.common_missed, ...feedback.cant_miss_missed];
  const shuffledStudent = shuffle([...studentDiagnoses]).slice(0, 2);
  const shuffledMissed = shuffle([...allMissed]).slice(0, 1);
  for (const d of shuffledStudent) {
    cards.push({
      type: "true_false",
      statement: `"${d}" was in your differential`,
      correct: true,
      explanation: `Yes — you included ${d} in your submission.`,
    });
  }
  for (const d of shuffledMissed) {
    cards.push({
      type: "true_false",
      statement: `"${d}" was in your differential`,
      correct: false,
      explanation: `No — ${d} was a diagnosis you missed. Remember it for next time.`,
    });
  }

  // 3. Can't-miss identification (multiple choice)
  const allCantMiss = [...feedback.cant_miss_hit, ...feedback.cant_miss_missed];
  if (allCantMiss.length > 0) {
    const target = allCantMiss[0];
    const distractors = shuffle(
      [...feedback.common_hit, ...feedback.common_missed].filter(
        (d) => !allCantMiss.includes(d)
      )
    ).slice(0, 3);

    if (distractors.length >= 2) {
      const options = shuffle([target, ...distractors]);
      cards.push({
        type: "multiple_choice",
        question: `Which of these is a can't-miss diagnosis for "${caseData.chief_complaint}"?`,
        options,
        correctIndex: options.indexOf(target),
        explanation: `${target} is a can't-miss diagnosis — missing it could lead to serious patient harm.`,
      });
    }
  }

  // 4. VINDICATE category match for a diagnosis they submitted
  const diagWithCategory = submission.diagnoses.find(
    (d) => d.vindicate_categories?.length || d.vindicate_category
  );
  if (diagWithCategory) {
    const catKey =
      diagWithCategory.vindicate_categories?.[0] ||
      diagWithCategory.vindicate_category ||
      "";
    const catLabel =
      VINDICATE_CATEGORIES.find((c) => c.key === catKey)?.label || catKey;

    if (catLabel && catKey) {
      const wrongCats = shuffle(
        VINDICATE_CATEGORIES.filter((c) => c.key !== catKey).map(
          (c) => c.label
        )
      ).slice(0, 3);
      const options = shuffle([catLabel, ...wrongCats]);
      cards.push({
        type: "multiple_choice",
        question: `What VINDICATE category does "${diagWithCategory.diagnosis}" fall under?`,
        options,
        correctIndex: options.indexOf(catLabel),
        explanation: `${diagWithCategory.diagnosis} is categorized as ${catLabel} (${catKey}).`,
      });
    }
  }

  // 5. How many diagnoses did you submit? (recall)
  cards.push({
    type: "recall",
    question: "How many diagnoses did you include in your differential?",
    answer: `${studentDiagnoses.length} diagnoses`,
  });

  // 6. Missed diagnosis reveal (if any missed)
  if (feedback.cant_miss_missed.length > 0) {
    cards.push({
      type: "recall",
      question: "Which can't-miss diagnosis did you miss? (Tap to reveal)",
      answer: feedback.cant_miss_missed.join(", "),
    });
  } else if (feedback.common_missed.length > 0) {
    const missed = feedback.common_missed.slice(0, 3);
    cards.push({
      type: "recall",
      question: "Name a common diagnosis you missed. (Tap to reveal)",
      answer: missed.join(", "),
    });
  }

  // 7. Most likely diagnosis (multiple choice)
  if (feedback.tiered_differential.most_likely.length > 0) {
    const target = feedback.tiered_differential.most_likely[0];
    const distractors = shuffle(
      [
        ...feedback.tiered_differential.moderate,
        ...feedback.tiered_differential.less_likely,
      ].filter((d) => d !== target)
    ).slice(0, 3);
    if (distractors.length >= 2) {
      const options = shuffle([target, ...distractors]);
      cards.push({
        type: "multiple_choice",
        question: "Which diagnosis was ranked as most likely?",
        options,
        correctIndex: options.indexOf(target),
        explanation: `${target} was the top-ranked diagnosis in the expert differential.`,
      });
    }
  }

  // Shuffle all except the first (chief complaint always first)
  const [first, ...rest] = cards;
  return [first, ...shuffle(rest)];
}

// ─── Quick card generation (3-4 cards, ~60s) ────────────────────────
export function generateQuickCards(
  caseData: FcmCase,
  submission: FcmSubmission,
  feedback: FeedbackResult
): QuizCard[] {
  const cards: QuizCard[] = [];

  // Card 1: Chief complaint recall (always — what students forget first)
  cards.push({
    type: "recall",
    question: "What was this week's chief complaint?",
    answer: caseData.chief_complaint,
  });

  // Card 2: Can't-miss diagnosis MC (highest clinical value)
  const allCantMiss = [...feedback.cant_miss_hit, ...feedback.cant_miss_missed];
  if (allCantMiss.length > 0) {
    const target = allCantMiss[0];
    const distractors = shuffle(
      [...feedback.common_hit, ...feedback.common_missed].filter(
        (d) => !allCantMiss.includes(d)
      )
    ).slice(0, 3);

    if (distractors.length >= 2) {
      const options = shuffle([target, ...distractors]);
      cards.push({
        type: "multiple_choice",
        question: `Which of these is a can't-miss diagnosis for "${caseData.chief_complaint}"?`,
        options,
        correctIndex: options.indexOf(target),
        explanation: `${target} is a can't-miss diagnosis — missing it could lead to serious patient harm.`,
      });
    }
  }

  // Card 3: Most likely diagnosis MC (key retrieval practice)
  if (feedback.tiered_differential.most_likely.length > 0) {
    const target = feedback.tiered_differential.most_likely[0];
    const distractors = shuffle(
      [
        ...feedback.tiered_differential.moderate,
        ...feedback.tiered_differential.less_likely,
      ].filter((d) => d !== target)
    ).slice(0, 3);
    if (distractors.length >= 2) {
      const options = shuffle([target, ...distractors]);
      cards.push({
        type: "multiple_choice",
        question: "Which diagnosis was ranked as most likely?",
        options,
        correctIndex: options.indexOf(target),
        explanation: `${target} was the top-ranked diagnosis in the expert differential.`,
      });
    }
  }

  // Card 4: Missed diagnosis reveal OR T/F about a submitted diagnosis
  const allMissed = [...feedback.cant_miss_missed, ...feedback.common_missed];
  if (allMissed.length > 0) {
    cards.push({
      type: "recall",
      question:
        feedback.cant_miss_missed.length > 0
          ? "Which can't-miss diagnosis did you miss? (Tap to reveal)"
          : "Name a common diagnosis you missed. (Tap to reveal)",
      answer: allMissed.slice(0, 3).join(", "),
    });
  } else {
    // No missed diagnoses — T/F about a diagnosis they did submit
    const studentDiagnoses = submission.diagnoses.map((d) => d.diagnosis);
    if (studentDiagnoses.length > 0) {
      const d = shuffle(studentDiagnoses)[0];
      cards.push({
        type: "true_false",
        statement: `"${d}" was in your differential`,
        correct: true,
        explanation: `Yes — you included ${d} in your submission. Nice recall!`,
      });
    }
  }

  return cards;
}

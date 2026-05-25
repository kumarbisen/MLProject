import type { z } from "zod";

type StepParams<T> = {
  inputData?: T;
  getInitData?: () => T;
};

/** Mastra passes trigger data via getInitData() on the first step; later steps use inputData. */
export function resolveStepInput<T extends Record<string, unknown>>(
  params: StepParams<T>
): T {
  const fromStep = params.inputData;
  if (
    fromStep &&
    typeof fromStep === "object" &&
    Object.keys(fromStep).length > 0
  ) {
    return fromStep;
  }
  if (params.getInitData) {
    return params.getInitData() as T;
  }
  return {} as T;
}

export type TriggerInput = {
  nichePrompt: string;
  ownerTelegramId: string;
  productLimit: number;
  platformFeePercent: number;
  payoutSchedule: "daily" | "weekly" | "monthly";
};

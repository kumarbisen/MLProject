import { storefrontBuilderWorkflow } from "./storefrontBuilderWorkflow.js";
import type { StorefrontBuilderTrigger } from "./storefrontBuilderWorkflow.js";

export async function runStorefrontBuild(input: StorefrontBuilderTrigger) {
  const run = await storefrontBuilderWorkflow.createRunAsync();
  return run.start({
    inputData: {
      nichePrompt: input.nichePrompt,
      ownerTelegramId: input.ownerTelegramId,
      productLimit: input.productLimit ?? 5,
      platformFeePercent: input.platformFeePercent ?? 10,
      payoutSchedule: input.payoutSchedule ?? "weekly",
    },
  });
}

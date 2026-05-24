/**
 * mastra.config.ts
 *
 * Mastra configuration — registers the agent and workflow
 * so they appear in `mastra dev` (Mastra Studio).
 */
import { Mastra } from "@mastra/core";
import { locusFounderAgent } from "./agents/locusFounderAgent.js";
import { storefrontBuilderWorkflow } from "./workflows/storefrontBuilderWorkflow.js";

export const mastra: Mastra = new Mastra({
  agents: {
    locusFounder: locusFounderAgent,
  },
  workflows: {
    storefrontBuilder: storefrontBuilderWorkflow,
  },
});

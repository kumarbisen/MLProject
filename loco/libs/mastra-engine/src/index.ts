/**
 * index.ts — Public API for the mastra-engine library
 */
export { mastra } from "./mastra.config.js";
export { locusFounderAgent } from "./agents/locusFounderAgent.js";
export { storefrontBuilderWorkflow } from "./workflows/storefrontBuilderWorkflow.js";
export type { StorefrontBuilderTrigger } from "./workflows/storefrontBuilderWorkflow.js";
export { runStorefrontBuild } from "./workflows/runStorefrontBuild.js";

// Tools
export { sourceProductsTool } from "./tools/sourceProducts.js";
export { buildStorefrontTool } from "./tools/buildStorefront.js";
export { writeListingsTool } from "./tools/writeListings.js";
export { integrateLocusCheckoutTool } from "./tools/integrateLocusCheckout.js";
export { registerWith17Track } from "./tools/tracker.js";
export { routePayoutsTool } from "./tools/routePayouts.js";
export { notifyOwnerTool } from "./tools/notifyOwner.js";

// DB
export { storeDB } from "./db/inMemoryStore.js";
export type { StoreRecord } from "./db/inMemoryStore.js";
export { customerStore } from "./db/customerStore.js";
export type {
  CustomerUser,
  ChatMessage,
  ActivityLog,
  AgentState,
  AppMeta,
} from "./db/customerStore.js";
export {
  logBuildStarted,
  logStoreStatusChange,
  logBuildFinished,
  logCommandFinished,
  syncStoreToDashboard,
} from "./services/dashboardEvents.js";
export { seedCustomerDemo, verifyPassword, hashPassword } from "./db/seedCustomerDemo.js";

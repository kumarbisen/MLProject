import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const Register17TrackInputSchema = z.object({
  trackingNumber: z.string().min(1).describe("The tracking code from the supplier or dropshipper"),
  carrierCode: z.number().int().optional().describe("Optional 17TRACK integer code for the specific shipping carrier"),
});

const Register17TrackOutputSchema = z.object({
  status: z.enum(["success", "failed"]),
  trackingNumber: z.string(),
  details: z.string().optional(),
  error: z.string().optional(),
  errors: z.unknown().optional(),
});

export const registerWith17Track = createTool({
  id: "register-shipment-tracker",
  description: "Registers a new package tracking number with 17TRACK for background monitoring.",
  inputSchema: Register17TrackInputSchema,
  outputSchema: Register17TrackOutputSchema,
  execute: async ({ context }) => {
    const token = process.env.TRACK17_API_TOKEN;
    if (!token) {
      throw new Error("Missing 17TRACK API key (TRACK17_API_TOKEN) in environment variables.");
    }

    const url = process.env.TRACK17_BASE_URL ?? "https://api.17track.net/track/v1/register";
    const payload = [
      {
        number: context.trackingNumber,
        carrier: context.carrierCode ?? 0,
      },
    ];

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "17token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: any = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          status: "failed" as const,
          trackingNumber: context.trackingNumber,
          error: `17TRACK request failed with HTTP ${response.status}`,
          errors: result,
        };
      }

      if (result?.code === 0 && Array.isArray(result?.data?.accepted) && result.data.accepted.length > 0) {
        return {
          status: "success" as const,
          trackingNumber: context.trackingNumber,
          details: "Monitoring active. Waiting for webhook telemetry.",
        };
      }

      return {
        status: "failed" as const,
        trackingNumber: context.trackingNumber,
        errors: result?.data?.rejected ?? result,
      };
    } catch (error) {
      return {
        status: "failed" as const,
        trackingNumber: context.trackingNumber,
        error: String(error),
      };
    }
  },
});
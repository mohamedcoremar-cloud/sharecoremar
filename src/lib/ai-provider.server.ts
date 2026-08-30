/**
 * Server-only AI provider resolver for the merchandising_inventory agent.
 *
 * Order of attempts:
 *   1. The project owner's own external key (Google Gemini or OpenAI) — billed
 *      directly by that provider, independent of the Lovable subscription.
 *   2. Lovable AI credits through the Lovable AI Gateway (optional fallback).
 *   3. Neither available / both blocked -> a typed error the caller surfaces.
 *
 * This module is only reachable from server function handlers. It never runs in
 * the browser and never returns key material.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export type AiLeg = "own_google" | "own_openai" | "lovable";

export type ResolvedAiLeg = {
  leg: AiLeg;
  /** Human label shown in the admin screen, e.g. "Your Google key (gemini-2.5-flash)". */
  label: string;
  model: LanguageModel;
};

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly attempts: { leg: AiLeg; status?: number; message: string }[] = [],
  ) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

const GOOGLE_MODEL = "gemini-3.6-flash";
const OPENAI_MODEL = "gpt-5-mini";
const LOVABLE_MODEL = "google/gemini-3.7-flash";

/**
 * Build the ordered list of legs to try. Call inside a server function handler —
 * process.env is only populated at call time.
 */
export function resolveAiLegs(options?: {
  useOwnKey?: boolean;
  fallbackToLovable?: boolean;
}): ResolvedAiLeg[] {
  const useOwnKey = options?.useOwnKey ?? true;
  const fallbackToLovable = options?.fallbackToLovable ?? true;

  const legs: ResolvedAiLeg[] = [];

  const googleKey = process.env["GEMINI_API_KEY"]?.trim();
  const openaiKey = process.env["OPENAI_API_KEY"]?.trim();
  const lovableKey = process.env["LOVABLE_API_KEY"]?.trim();

  if (useOwnKey && googleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    legs.push({
      leg: "own_google",
      label: `Your Google key (${GOOGLE_MODEL})`,
      model: google(GOOGLE_MODEL),
    });
  }

  if (useOwnKey && openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    legs.push({
      leg: "own_openai",
      label: `Your OpenAI key (${OPENAI_MODEL})`,
      model: openai(OPENAI_MODEL),
    });
  }

  const wantLovable = fallbackToLovable || legs.length === 0;
  if (wantLovable && lovableKey) {
    const gateway = createOpenAICompatible({
      name: "lovable",
      baseURL: "https://ai.gateway.lovable.dev/v1",
      headers: {
        "Lovable-API-Key": lovableKey,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
    });
    legs.push({
      leg: "lovable",
      label: `Lovable AI credits (${LOVABLE_MODEL})`,
      model: gateway(LOVABLE_MODEL),
    });
  }

  return legs;
}

function statusOf(error: unknown): number | undefined {
  const candidate = error as { statusCode?: number; status?: number } | null;
  return candidate?.statusCode ?? candidate?.status;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * A failure that means "this provider can't serve the request, try the next one":
 * bad/expired key, rate limit, exhausted quota/credits, upstream outage.
 * A 400 is the request's own fault and is never retried on another provider.
 */
function shouldFailOver(error: unknown): boolean {
  const status = statusOf(error);
  if (status === undefined) return true; // network-level failure
  if (status === 400) return false;
  return status === 401 || status === 402 || status === 403 || status === 429 || status >= 500;
}

/**
 * Run `task` against each configured leg in order, failing over on provider-level
 * errors. Resolves with the result plus the leg that actually served it, so the
 * caller can record who paid for the call.
 */
export async function runWithAiFailover<T>(
  task: (leg: ResolvedAiLeg) => Promise<T>,
  options?: { useOwnKey?: boolean; fallbackToLovable?: boolean },
): Promise<{ result: T; leg: AiLeg; label: string }> {
  const legs = resolveAiLegs(options);

  if (legs.length === 0) {
    throw new AiUnavailableError(
      "No AI provider is configured. Add your own GEMINI_API_KEY or OPENAI_API_KEY, or enable the Lovable AI credits fallback.",
    );
  }

  const attempts: { leg: AiLeg; status?: number; message: string }[] = [];

  for (const leg of legs) {
    try {
      const result = await task(leg);
      return { result, leg: leg.leg, label: leg.label };
    } catch (error) {
      const status = statusOf(error);
      attempts.push({ leg: leg.leg, status, message: messageOf(error) });
      if (!shouldFailOver(error)) {
        throw new AiUnavailableError(messageOf(error), attempts);
      }
    }
  }

  const last = attempts[attempts.length - 1];
  throw new AiUnavailableError(
    `Every configured AI provider failed. Last error${last?.status ? ` (${last.status})` : ""}: ${last?.message ?? "unknown"}`,
    attempts,
  );
}

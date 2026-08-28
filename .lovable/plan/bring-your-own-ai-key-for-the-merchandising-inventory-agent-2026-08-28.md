# Bring Your Own AI Key for the merchandising_inventory Agent

## Feasibility: yes

Nothing in the app calls an AI provider today. The `ai_agents` registry is
documentation-only (it already carries `provider` and `model` columns), and the
Item 3 bulk-intake extraction call has not been built yet. So the provider choice
is still fully open — your own key can be the primary path from day one, with
Lovable's credits as a fallback.

## What you need to supply

Pick one (both can be added; the agent uses whichever is configured):

| Provider | Key you create | Format | Models used |
|---|---|---|---|
| **Google AI Studio** (recommended for this task) | Gemini API key | `AIza...` | `gemini-2.5-flash` / `gemini-2.5-pro` — strong image + PDF reading, cheapest per price list |
| **OpenAI** | Platform API key | `sk-...` (project keys `sk-proj-...`) | `gpt-5-mini` / `gpt-5` vision |

You top up and monitor the balance directly with that provider; billing never
touches your Lovable subscription. The key is stored as a project secret
(server-side only, never shipped to the browser) — I request it through the
secret prompt when we build Item 3, so you paste it into a masked field, not
into chat.

Recommendation: Google Gemini. Price lists photographed on a phone and multi-page
PDFs are its strongest case, and cost per extraction is the lowest of the two.

## Automatic fallback

Yes. The extraction runs through one small server-side resolver with an ordered
chain:

```text
1. your external key (if present and enabled)
      | on 401/403 (bad key), 429 (rate limit), 402/quota exhausted, or 5xx
      v
2. Lovable AI credits (google/gemini-3.7-flash via the gateway)
      | if that is also blocked (402/403)
      v
3. surface a clear error in the admin upload screen — no silent failure,
   no fabricated draft rows
```

Rules the resolver follows:
- A malformed request (400) is never retried on the other provider — same input
  would fail again; the error is shown as-is.
- Every extraction records which provider actually served it, so you can see in
  the admin screen whether your key or Lovable credits paid for it.
- One switch in Admin > AI Agents to disable the fallback entirely if you want
  hard-stop behaviour instead of spending Lovable credits.

## Blast radius

Scoped to the merchandising_inventory extraction call only:
- No change to Level 1 fulfillment, order pipeline, or supplier/logistics portals.
- No RLS policy, GRANT, or RPC signature changes.
- No behaviour change for any other registry agent — they remain
  documentation-only rows; each agent keeps its own `provider`/`model` values, so
  switching this one does not switch the others.
- The catalog submission approval chain is untouched: AI output still lands as
  `draft` submissions and still needs the full admin/supplier approval path
  before anything publishes.

## Technical notes

- New server-only module (e.g. `src/lib/ai-provider.server.ts`) resolves the
  provider chain and reads `process.env` inside the handler.
- Secrets: `GEMINI_API_KEY` and/or `OPENAI_API_KEY`, plus existing
  `LOVABLE_API_KEY` for the fallback leg.
- External providers are called with the AI SDK (`@ai-sdk/google` /
  `@ai-sdk/openai`); the Lovable leg keeps the gateway provider already
  documented for this stack.
- Streaming used for extraction so long multi-page files can't be cut off by the
  request timeout.

## Next step

Confirm which provider key you'll supply (or both). Then this configuration work
folds into building Item 3 — it is not a separate sprint.

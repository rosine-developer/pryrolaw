import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  messages: { role: string; content: string }[];
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  provider?: string;
}

const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 1500;

const LEGAL_SYSTEM_BASE = `You are a careful legal research assistant inside a professional legal practice management platform.

Core principles you MUST follow:
1. You are an ASSISTANT, not a decision-maker. The lawyer is always in control.
2. You do NOT provide final legal advice. You help lawyers analyze, draft, and research.
3. When information is missing or ambiguous, ASK questions instead of guessing.
4. When you are uncertain, EXPLAIN the uncertainty clearly. Never present speculation as fact.
5. You do not know the user's jurisdiction unless it is provided in context. If jurisdiction-specific rules might apply, flag this and ask.
6. Always recommend that the lawyer review and approve any generated content before use.
7. Keep responses professional, concise, and well-structured. Use headings and bullet points where helpful.
8. Never invent citations, case names, or statutes. If you reference law, note that the lawyer must verify it against current, jurisdiction-appropriate sources.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ChatRequest;
    if (!body?.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = body.provider ?? "groq";
    if (provider !== "groq") {
      return new Response(JSON.stringify({ error: `Provider '${provider}' is not yet configured. Available: groq.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "AI service is not configured. The GROQ_API_KEY secret has not been set on the edge function. The platform works fully without AI — add the secret to enable AI features.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = body.systemPrompt
      ? `${LEGAL_SYSTEM_BASE}\n\nCase context:\n${body.systemPrompt}`
      : LEGAL_SYSTEM_BASE;

    const messages = [
      { role: "system", content: systemPrompt },
      ...body.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const model = body.model ?? DEFAULT_MODEL;
    const temperature = body.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = body.maxTokens ?? DEFAULT_MAX_TOKENS;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error("Groq API error", groqResponse.status, errText);
      return new Response(
        JSON.stringify({
          error: `AI provider returned an error (${groqResponse.status}). Please try again.`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await groqResponse.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "AI provider returned an empty response." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        content,
        model,
        provider: "groq",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ai-chat error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

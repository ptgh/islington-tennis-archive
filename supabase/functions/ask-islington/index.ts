import { convertToModelMessages, type UIMessage } from "npm:ai@7";
import { createResponsesCall } from "../_shared/responses.ts";
import scene from "./scene-data.json" with { type: "json" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};

const instructions = `You are the guide inside "Islington Tennis", an illustrated 3D miniature map of Islington, London.
Answer visitors' questions about the tennis courts, venues, coaching, social play, landmarks, parks, stations and buses shown in the scene.
Use ONLY the scene data below. If the answer is not in it, say you don't know and suggest checking the venue's official booking page.
Never invent prices, opening times or availability. Mention that details were verified on the dates given in the data when relevant.
Keep answers short, friendly and in British English. Use short markdown lists where helpful.

SCENE DATA (JSON):
${JSON.stringify(scene)}`;

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json(405, "Method not allowed");
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return json(500, "The assistant is not configured.");
  let messages: UIMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) return json(400, "Invalid conversation.");
  } catch {
    return json(400, "Invalid request.");
  }
  try {
    const call = createResponsesCall(
      req,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      await convertToModelMessages(messages),
      instructions,
    );
    const response = await call.response();
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(cors)) if (!headers.has(k)) headers.set(k, v);
    headers.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    if (req.signal.aborted) return json(499, "Request cancelled.");
    const status = (error as { statusCode?: number })?.statusCode;
    if (status === 429) return json(429, "Too many questions right now — please wait a moment and try again.");
    if (status === 402) return json(402, "The assistant has run out of AI credits. Please try again later.");
    console.error("ask-islington error", error);
    return json(500, "The assistant couldn't answer just now.");
  }
});

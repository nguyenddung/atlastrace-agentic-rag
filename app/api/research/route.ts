import { z } from "zod";
import { runResearch } from "@/lib/agents/research-team";

export const maxDuration = 60;

const requestSchema = z.object({
  question: z.string().trim().min(12).max(500),
  mode: z.enum(["demo", "live"]).default("demo"),
});

export async function POST(request: Request) {
  try {
    const input = requestSchema.parse(await request.json());
    const result = await runResearch(input.question, input.mode);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Ask a specific question between 12 and 500 characters." }, { status: 400 });
    }
    return Response.json({ error: "The research team could not complete this run." }, { status: 500 });
  }
}


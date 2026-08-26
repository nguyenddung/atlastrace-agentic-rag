import { z } from "zod";
import { runResearch } from "@/lib/agents/research-team";
import { getDictionary } from "@/lib/i18n/dictionary";
import { defaultLocale, locales } from "@/lib/i18n/locale";

export const maxDuration = 60;

const requestSchema = z.object({
  question: z.string().trim().min(12).max(500),
  mode: z.enum(["demo", "live"]).default("demo"),
  locale: z.enum(locales).default(defaultLocale),
});

/** Best-effort locale for error messages: a rejected body has no parsed locale. */
function localeFromRequest(body: unknown) {
  const candidate = (body as { locale?: unknown } | null)?.locale;
  return locales.find((value) => value === candidate) ?? defaultLocale;
}

export async function POST(request: Request) {
  let body: unknown = null;

  try {
    body = await request.json();
    const input = requestSchema.parse(body);
    const result = await runResearch(input.question, input.mode, input.locale);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const dictionary = getDictionary(localeFromRequest(body));
    if (error instanceof z.ZodError) {
      return Response.json({ error: dictionary.errorLength }, { status: 400 });
    }
    return Response.json({ error: dictionary.errorGeneric }, { status: 500 });
  }
}

import { z } from "zod";
import { runResearch } from "@/lib/agents/research-team";
import { getDictionary } from "@/lib/i18n/dictionary";
import { defaultLocale, locales } from "@/lib/i18n/locale";
import { checkRateLimit } from "@/lib/rate-limit";

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

/** Vercel sets x-forwarded-for; local dev and other hosts fall back to a shared bucket. */
function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  let body: unknown = null;

  const rateLimit = checkRateLimit(clientKey(request));
  if (!rateLimit.allowed) {
    const dictionary = getDictionary(defaultLocale);
    return Response.json(
      { error: dictionary.errorRateLimited },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } },
    );
  }

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

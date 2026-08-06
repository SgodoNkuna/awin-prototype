import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as z4 from "zod/v4";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureAdmin } from "@/lib/admin-roles.functions";

const eventFieldsSchema = z4.object({
  title: z4.string().describe("The event's title/name as printed on the poster."),
  event_date: z4
    .string()
    .describe("ISO date, YYYY-MM-DD. If no year is printed, assume the nearest future occurrence of that month/day."),
  event_time: z4.string().nullable().describe("24-hour HH:MM start time, or null if no time is printed."),
  location: z4.string().describe("Venue/address as printed on the poster."),
  description: z4
    .string()
    .describe("A short 1-2 sentence public-facing description suitable for an events listing."),
  is_awin_hosted: z4
    .boolean()
    .describe(
      "true if A-Win (African Women Investment Network) is the host/organizer; false if this is another organization's event and the poster only shows A-Win attending, having a stall, or being a guest (look for 'hosted by', a different org's branding, or A-Win named as a guest/partner).",
    ),
});

const inputSchema = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
});

/**
 * Reads an event poster image and extracts structured fields to prefill the
 * Admin > Events form. Requires ANTHROPIC_API_KEY — not yet configured for
 * this project, so this throws a clear setup error until it is.
 */
export const extractEventFromPoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => inputSchema.parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AI poster extraction isn't set up yet — add ANTHROPIC_API_KEY to the server environment to enable this.",
      );
    }

    const match = data.imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image data");
    const [, mediaType, base64] = match;

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
    const client = new Anthropic({ apiKey });

    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { format: zodOutputFormat(eventFieldsSchema) },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType as any, data: base64 },
            },
            {
              type: "text",
              text: "Read this event poster and extract the fields.",
            },
          ],
        },
      ],
    });

    if (!response.parsed_output) throw new Error("Could not read the poster — try a clearer image");
    return response.parsed_output;
  });

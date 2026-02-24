import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { DesignTokens } from "@/types";

// Allow large image uploads (up to 10MB)
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Preset theme definitions
const PRESETS: Record<string, { tokens: DesignTokens; mood: string }> = {
  "clinical-sharp": {
    tokens: {
      primary: "#3b82f6",
      background: "#f8fafc",
      foreground: "#0f172a",
      card: "#ffffff",
      card_foreground: "#0f172a",
      border: "#cbd5e1",
      muted: "#f1f5f9",
      muted_foreground: "#64748b",
      sidebar: "#f1f5f9",
      radius: "0.25rem",
    },
    mood: "clinical sharp",
  },
  "warm-rounded": {
    tokens: {
      primary: "#c2410c",
      background: "#fefce8",
      foreground: "#422006",
      card: "#fffbeb",
      card_foreground: "#422006",
      border: "#fde68a",
      muted: "#fef3c7",
      muted_foreground: "#92400e",
      sidebar: "#fef3c7",
      radius: "0.75rem",
    },
    mood: "warm inviting",
  },
  "material-you": {
    tokens: {
      primary: "#7c3aed",
      background: "#faf5ff",
      foreground: "#1e1b4b",
      card: "#ffffff",
      card_foreground: "#1e1b4b",
      border: "#ddd6fe",
      muted: "#ede9fe",
      muted_foreground: "#6b21a8",
      sidebar: "#ede9fe",
      radius: "1rem",
    },
    mood: "playful modern",
  },
  "mono-minimal": {
    tokens: {
      primary: "#171717",
      background: "#ffffff",
      foreground: "#171717",
      card: "#fafafa",
      card_foreground: "#171717",
      border: "#e5e5e5",
      muted: "#f5f5f5",
      muted_foreground: "#737373",
      sidebar: "#fafafa",
      radius: "0rem",
    },
    mood: "mono minimal",
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, url, preset } = body as {
      image?: string;
      url?: string;
      preset?: string;
    };

    // Handle presets — no API call needed
    if (preset && PRESETS[preset]) {
      return NextResponse.json({
        tokens: PRESETS[preset].tokens,
        mood: PRESETS[preset].mood,
      });
    }

    if (preset) {
      return NextResponse.json({ error: "Unknown preset" }, { status: 400 });
    }

    // Need either image or URL for vision extraction
    if (!image && !url) {
      return NextResponse.json(
        { error: "Provide image (base64), url, or preset" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service unavailable" },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    // Build the vision content
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    if (image) {
      // Detect media type from base64 header or default to png
      let mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" =
        "image/png";
      let imageData = image;
      if (image.startsWith("data:")) {
        const match = image.match(/^data:(image\/\w+);base64,/);
        if (match) {
          mediaType = match[1] as typeof mediaType;
          imageData = image.replace(/^data:image\/\w+;base64,/, "");
        }
      }
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: imageData },
      });
    } else if (url) {
      // Check if URL points to an image or a webpage
      const isImageUrl = /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(url);
      if (isImageUrl) {
        content.push({
          type: "image",
          source: { type: "url", url },
        });
      } else {
        // For webpage URLs, do a HEAD check then try fetching as image
        try {
          const headRes = await fetch(url, { method: "HEAD", redirect: "follow" });
          const contentType = headRes.headers.get("content-type") || "";
          if (contentType.startsWith("image/")) {
            content.push({
              type: "image",
              source: { type: "url", url },
            });
          } else {
            // It's a webpage — fetch and convert via OG image or screenshot
            // Try to find an OG image from the page
            const pageRes = await fetch(url, { redirect: "follow" });
            const html = await pageRes.text();
            const ogMatch = html.match(
              /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
            ) || html.match(
              /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
            );
            if (ogMatch?.[1]) {
              const ogUrl = ogMatch[1].startsWith("http")
                ? ogMatch[1]
                : new URL(ogMatch[1], url).href;
              content.push({
                type: "image",
                source: { type: "url", url: ogUrl },
              });
            } else {
              return NextResponse.json(
                {
                  error:
                    "This URL is a webpage, not an image. Please take a screenshot and upload it instead, or paste a direct image URL (.png, .jpg).",
                },
                { status: 400 }
              );
            }
          }
        } catch {
          return NextResponse.json(
            { error: "Could not fetch that URL. Try a direct image link or upload a screenshot." },
            { status: 400 }
          );
        }
      }
    }

    content.push({
      type: "text",
      text: `Analyze this UI screenshot and extract the design system tokens.
Return a JSON object with exactly these keys:
{
  "primary": "#hex",
  "background": "#hex",
  "foreground": "#hex",
  "card": "#hex",
  "card_foreground": "#hex",
  "border": "#hex",
  "muted": "#hex",
  "muted_foreground": "#hex",
  "sidebar": "#hex",
  "radius": "Xrem",
  "mood": "1-2 word descriptor"
}

Guidelines:
- "primary" = the dominant accent/brand color
- "background" = the page background color
- "foreground" = the main text color
- "card" = card/surface background color
- "card_foreground" = card text color
- "border" = border/divider color
- "muted" = subtle secondary background
- "muted_foreground" = secondary/placeholder text color
- "sidebar" = navigation/sidebar background
- "radius" = corner rounding: "0rem" for sharp, "0.5rem" for moderate, "1rem" for rounded
- "mood" = 1-2 word style descriptor (e.g. "clinical sharp", "warm playful", "minimal clean")

Return ONLY valid JSON, no other text.`,
    });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response
    const jsonStr = responseText
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(jsonStr);

    const tokens: DesignTokens = {
      primary: parsed.primary || "#0b8574",
      background: parsed.background || "#fafaf9",
      foreground: parsed.foreground || "#1c1917",
      card: parsed.card || "#fafaf9",
      card_foreground: parsed.card_foreground || "#1c1917",
      border: parsed.border || "#d6d3d1",
      muted: parsed.muted || "#f5f5f4",
      muted_foreground: parsed.muted_foreground || "#78716c",
      sidebar: parsed.sidebar || "#f5f5f4",
      radius: parsed.radius || "0.625rem",
    };

    return NextResponse.json({
      tokens,
      mood: parsed.mood || "extracted",
    });
  } catch (error) {
    console.error("Theme extraction error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to extract theme: ${message}` },
      { status: 500 }
    );
  }
}

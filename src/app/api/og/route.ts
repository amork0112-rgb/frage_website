import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Add protocol if missing
    const targetUrl = url.startsWith("http") ? url : `https://${url}`;
    
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "bot-crawler", // Some sites block requests without a UA
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch URL");
    }

    const html = await response.text();

    // Simple regex-based extraction to avoid heavy dependencies like cheerio
    const getMetaTag = (name: string) => {
      const regex = new RegExp(
        `<meta\\s+(?:name|property)=["'](?:og:)?${name}["']\\s+content=["']([^"']+)["']`,
        "i"
      );
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    const getTitle = () => {
        const ogTitle = getMetaTag("title");
        if (ogTitle) return ogTitle;
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return titleMatch ? titleMatch[1] : "";
    }

    const title = getTitle();
    const description = getMetaTag("description");
    const image = getMetaTag("image");
    
    // Extract domain
    const domain = new URL(targetUrl).hostname;

    return NextResponse.json({
      title: title || domain,
      description: description || "",
      image: image || "",
      url: targetUrl,
      domain,
    });
  } catch (error) {
    console.error("OG Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

type Preview = {
  title: string;
  description: string;
  image: string;
};

const cache = new Map<string, Preview>();

const normalizeUrl = (base: string, src: string) => {
  try {
    if (src.startsWith("//")) return `https:${src}`;
    if (src.startsWith("http://") || src.startsWith("https://")) return src;
    const b = new URL(base);
    if (src.startsWith("/")) return `${b.origin}${src}`;
    return `${b.origin}/${src}`;
  } catch {
    return src;
  }
};

const extract = (html: string, key: string) => {
  const r1 = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
  const m1 = html.match(r1);
  if (m1 && m1[1]) return m1[1];
  const r2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${key}["']`, "i");
  const m2 = html.match(r2);
  if (m2 && m2[1]) return m2[1];
  return null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const target = String(searchParams.get("url") || "");
    if (!target) {
      return NextResponse.json({ error: "missing_url" }, { status: 400 });
    }
    const u = new URL(target);
    if (!["http:", "https:"].includes(u.protocol)) {
      return NextResponse.json({ error: "invalid_url" }, { status: 400 });
    }
    if (cache.has(target)) {
      return NextResponse.json(cache.get(target), { status: 200 });
    }
    const res = await fetch(target, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const fallback = { title: "", description: "", image: "/images/home-classroom.jpg" };
      cache.set(target, fallback);
      return NextResponse.json(fallback, { status: 200 });
    }
    const html = await res.text();
    const ogTitle = extract(html, "og:title");
    const ogDesc = extract(html, "og:description");
    let ogImage = extract(html, "og:image");
    if (!ogImage) {
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        ogImage = imgMatch[1];
      }
    }
    const image = ogImage ? normalizeUrl(target, ogImage) : "/images/home-classroom.jpg";
    const title =
      ogTitle ||
      (() => {
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m && m[1] ? m[1] : "";
      })();
    const description = ogDesc || "";
    const payload: Preview = { title, description, image };
    cache.set(target, payload);
    return NextResponse.json(payload, { status: 200 });
  } catch {
    const fallback = { title: "", description: "", image: "/images/home-classroom.jpg" };
    return NextResponse.json(fallback, { status: 200 });
  }
}

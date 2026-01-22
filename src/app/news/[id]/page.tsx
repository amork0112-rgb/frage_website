export const dynamic = "force-dynamic";
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

type PromotionDetail = {
  id: number;
  title: string;
  pinned: boolean;
  push_enabled: boolean;
  created_at: string;
  posts: {
    id: number;
    title: string;
    content: string;
    created_at: string;
    image_url?: string;
  } | null;
};

export default function NewsPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [promotion, setPromotion] = useState<PromotionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const idNum = Number(params.id);
      if (Number.isNaN(idNum)) {
        router.push("/news");
        return;
      }

      try {
        const res = await fetch(`/api/news/${idNum}`, { next: { revalidate: 0 } });
        const json = await res.json();
        if (!json.ok || !json.data) {
          setLoading(false);
          // router.push("/news"); // Optional: redirect on error
          return;
        }
        setPromotion(json.data);
      } catch (err) {
        console.error("Error fetching news detail:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id, router]);

  if (loading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Loading…</div>;
  }

  if (!promotion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 mb-4">해당 소식을 찾을 수 없습니다.</p>
          <Link href="/news" className="text-sm font-bold text-frage-blue">뉴스 목록으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  const formatted = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(promotion.posts?.created_at || promotion.created_at));

  const categoryStyle = "bg-blue-50 text-blue-600";

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link href="/news" className="flex items-center gap-2 text-slate-500 hover:text-frage-blue transition-colors text-sm font-bold">
            <ArrowLeft className="w-4 h-4" />
            Back to News
          </Link>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl py-12 px-6">
        <div className="mb-8">
          <span className={`inline-block px-3 py-1 text-xs font-bold rounded mb-4 ${categoryStyle}`}>
            NEWS
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
            {promotion.title || promotion.posts?.title}
          </h1>
          <p className="text-slate-500 font-medium">{formatted}</p>
        </div>

        {promotion.posts?.image_url && (
          <div className="mb-10 rounded-2xl overflow-hidden shadow-sm">
            <img src={promotion.posts.image_url} alt={promotion.title || promotion.posts.title} className="w-full h-auto object-cover" />
          </div>
        )}

        <div className="prose prose-lg max-w-none prose-slate prose-headings:font-bold prose-a:text-frage-blue">
          {(promotion.posts?.content || "")
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      </article>
    </div>
  );
}

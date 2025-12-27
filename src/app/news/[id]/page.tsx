import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewsPostPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );

  const { data: post } = await supabase
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!post) {
    redirect("/news");
  }

  const date = new Date(post.created_at);
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);

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
            <span className={`inline-block px-3 py-1 text-xs font-bold rounded mb-4 ${
                  post.category.toLowerCase().includes('notice') ? 'bg-red-50 text-red-600' :
                  post.category.toLowerCase().includes('event') ? 'bg-orange-50 text-orange-600' :
                  'bg-blue-50 text-blue-600'
            }`}>
                {post.category.toUpperCase()}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
                {post.title}
            </h1>
            <p className="text-slate-500 font-medium">
                {formatted}
            </p>
        </div>

        {post.image_url && (
            <div className="mb-10 rounded-2xl overflow-hidden shadow-sm">
                <img src={post.image_url} alt={post.title} className="w-full h-auto object-cover" />
            </div>
        )}

        <div className="prose prose-lg max-w-none prose-slate prose-headings:font-bold prose-a:text-frage-blue">
          {post.content.split('\n').map((line: string, i: number) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
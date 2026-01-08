import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Post, Profile } from "@/lib/types";

export default async function CommunityPage() {
  const supabase = createSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="mx-auto max-w-4xl py-10 px-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
          로그인 후 이용 가능합니다.
        </div>
      </section>
    );
  }

  const isAdmin = ((user as any).app_metadata?.role ?? "parent") === "admin";

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, category, created_at, author_id")
    .order("created_at", { ascending: false });

  if (error) {
    // Handle error gracefully, maybe just show empty list or log
    console.error("Error fetching posts:", error);
  }

  const posts = (data as unknown as Post[]) ?? [];

  return (
    <section className="mx-auto max-w-4xl py-10 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-frage-navy">Parent Community</h1>
          <p className="mt-2 text-slate-600">
            학부모님을 위한 소통 공간입니다.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/community/write"
            className="rounded-lg bg-frage-primary px-4 py-2 text-sm font-bold text-white hover:bg-purple-800 transition-colors"
          >
            + 글쓰기
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
          등록된 게시글이 없습니다.
        </div>
      ) : (
        <ul className="grid gap-4">
          {posts.map((post) => {
            const date = new Date(post.created_at);
            const formatted = new Intl.DateTimeFormat("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric"
            }).format(date);
            return (
              <li key={post.id} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-frage-primary/50 hover:shadow-md transition-all">
                <Link href={`/community/${post.id}`} className="block">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {post.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-frage-primary transition-colors">
                        {post.title}
                      </h3>
                    </div>
                    <span className="text-sm text-slate-400">{formatted}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

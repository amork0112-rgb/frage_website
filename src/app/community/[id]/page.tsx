import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Link from "next/link";
import type { Post, Profile } from "@/lib/types";

export default async function PostPage({
  params
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {}
      }
    }
  );

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session) {
    return (
      <section className="mx-auto max-w-4xl py-10 px-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
          로그인 후 이용 가능합니다.
        </div>
      </section>
    );
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const isAdmin = (profile as Profile)?.role === "admin";

  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !post) {
    return (
      <section className="mx-auto max-w-4xl py-10 px-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
          게시글을 찾을 수 없습니다.
        </div>
        <div className="mt-6">
          <Link href="/community" className="text-frage-primary hover:underline">
            목록으로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  const date = new Date(post.created_at);
  const formatted = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);

  return (
    <article className="mx-auto max-w-4xl py-10 px-6">
      <div className="mb-6 border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between">
          <Link
            href="/community"
            className="text-sm font-medium text-slate-500 hover:text-frage-primary mb-4 inline-block"
          >
            ← 목록으로 돌아가기
          </Link>
          {isAdmin && (
            <Link
              href={`/community/${params.id}/edit`}
              className="text-sm font-bold text-frage-accent hover:underline"
            >
              수정하기
            </Link>
          )}
        </div>
        
        <div className="flex items-center gap-3 mb-3">
          <span className="rounded bg-frage-primary/10 px-2.5 py-0.5 text-sm font-semibold text-frage-primary">
            {post.category}
          </span>
          <span className="text-sm text-slate-500">{formatted}</span>
        </div>
        <h1 className="text-3xl font-bold text-frage-navy md:text-4xl">
          {post.title}
        </h1>
      </div>

      <div className="prose prose-lg prose-slate max-w-none">
        {post.content.split('\n').map((line: string, i: number) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </article>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import TeacherHeader from "@/components/TeacherHeader";

export const dynamic = "force-dynamic";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/portal");
        return;
      }
      
      // DB-only check for teacher
      const { data: teacher } = await supabase
        .from("teachers")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (teacher) {
        setAuthorized(true);
      } else {
        // Double check if admin in profiles (admins usually don't use teacher layout, but just in case)
        // Actually, requirement says master_teacher -> /teacher/home.
        // master_teacher should be in 'teachers' table.
        // If not found in teachers, redirect.
        router.replace("/portal");
      }
    };
    checkUser();
  }, [router]);

  if (!authorized) return <div className="min-h-screen bg-white" />;

  return (
    <>
      <TeacherHeader />
      <main>{children}</main>
    </>
  );
}

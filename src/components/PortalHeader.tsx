"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Video, Bell, MessageCircle, User, LogOut, FileText, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function PortalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarInitials, setAvatarInitials] = useState<string>("S");
  const [parentName, setParentName] = useState<string>("학부모");
  const [studentDisplayName, setStudentDisplayName] = useState<string>("");
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (pathname.startsWith("/portal")) {
          const res = await fetch("/api/portal/home", { cache: "no-store" });
          const payload = await res.json();
          const students = Array.isArray(payload?.students) ? payload.students : [];
          setIsEnrolled(students.length > 0);
          setNewStatus(null);
          const first = students[0] || null;
          const name = String(first?.englishName || first?.name || "학부모");
          setStudentDisplayName(name);
        } else if (pathname.startsWith("/admission")) {
          const res = await fetch("/api/admission/home", { cache: "no-store" });
          const payload = await res.json();
          const items = Array.isArray(payload?.items) ? payload.items : [];
          setIsEnrolled(false);
          const ns = items[0] || null;
          setNewStatus(String(ns?.status || ""));
          const name = String(ns?.parent_name || "학부모");
          setParentName(name);
          const v = name.trim();
          const parts = v.split(/\s+/);
          const a = parts[0]?.[0] || "";
          const b = parts[1]?.[0] || "";
          setAvatarInitials(((a + b).toUpperCase() || a.toUpperCase() || "S") as string);
        } else {
          setIsEnrolled(false);
          setNewStatus(null);
          setParentName("학부모");
          setAvatarInitials("S");
        }
      } catch {
      }
    })();
  }, [router, pathname]);

  const menuItems = [
    { name: "홈", href: "/portal/home", icon: Home },
    ...(isEnrolled ? [{ name: "영상 과제", href: "/portal/video", icon: Video }] : []),
    ...(isEnrolled ? [{ name: "월간 리포트", href: "/portal/report", icon: FileText }] : []),
    { name: "학사일정", href: "/calendar", icon: Calendar },
    { name: "공지사항", href: "/portal/notices", icon: Bell },
    { name: "요청 전달", href: "/portal/requests", icon: MessageCircle },
    { name: "내 자녀", href: "/portal/child", icon: User },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="bg-white sticky top-0 z-20 px-4 py-3 border-b border-slate-200 flex items-center justify-between shadow-sm lg:hidden">
        <h1 className="text-lg font-bold text-frage-navy">학부모 포털</h1>
        <div className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-full bg-frage-blue text-white flex items-center justify-center font-bold text-xs hover:opacity-80 transition-opacity"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt={studentDisplayName || "아바타"} width={32} height={32} className="rounded-full object-cover" />
            ) : (
              avatarInitials
            )}
          </button>

          {/* Mobile Dropdown */}
          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-20 animate-fade-in-up">
                <Link 
                  href="/portal/child" 
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="w-4 h-4" />
                  내 자녀 정보
                </Link>
                <div className="h-px bg-slate-100 my-1" />
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Desktop Header / Navigation */}
      <header className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="container mx-auto px-6 max-w-[1200px] h-16 flex items-center justify-between">
          <Link href="/portal/home" className="text-xl font-bold text-frage-navy">FRAGE Portal</Link>
          <nav className="flex gap-8">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-bold transition-colors flex items-center gap-2 ${
                    isActive ? "text-frage-blue" : "text-slate-500 hover:text-frage-navy"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-3 relative">
             <span className="text-sm font-bold text-slate-700">{studentDisplayName || parentName}</span>
             
             <div className="relative">
               <button 
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
                 className="w-8 h-8 rounded-full bg-frage-blue text-white flex items-center justify-center font-bold text-xs hover:opacity-80 transition-opacity"
               >
                 {avatarUrl ? (
                  <Image src={avatarUrl} alt={studentDisplayName || "아바타"} width={32} height={32} className="rounded-full object-cover" />
                 ) : (
                  avatarInitials
                 )}
               </button>

               {/* Desktop Dropdown */}
               {isMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setIsMenuOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-20 animate-fade-in-up">
                    <Link 
                      href="/portal/child" 
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      내 자녀 정보
                    </Link>
                    <div className="h-px bg-slate-100 my-1" />
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                </>
               )}
             </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex justify-between items-center z-20 text-[10px] font-medium text-slate-400 safe-area-pb">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/portal/home" && pathname.startsWith(item.href));
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex flex-col items-center gap-1 p-2 min-w-[60px] ${isActive ? "text-frage-blue" : ""}`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? "fill-current" : ""}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

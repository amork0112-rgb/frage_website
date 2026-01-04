"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Bell, MessageSquare, Users, LogOut, Menu, X, Settings, AlertCircle, FileText, Plus, Calendar, GraduationCap, Bus, Video } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudentsMenuOpen, setIsStudentsMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const r = localStorage.getItem("admin_role");
      setRole(r || null);
    } catch {}
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data?.user?.email || "";
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
        const masterTeacherEmail = process.env.NEXT_PUBLIC_MASTER_TEACHER_EMAIL || "";
        if (email && adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
          localStorage.setItem("admin_role", "admin");
          setRole("admin");
        } else if (email && masterTeacherEmail && email.toLowerCase() === masterTeacherEmail.toLowerCase()) {
          localStorage.setItem("admin_role", "teacher");
          setRole("teacher");
        }
      } catch {}
    })();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "admin_role") {
        setRole(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isTeacher = !!role && ["teacher", "교사"].some((k) => role!.toLowerCase().includes(k));
  if (isTeacher) return null;

  const menuItems = [
    { name: "대시보드", href: "/admin/home", icon: Home },
    { name: "공지사항", href: "/admin/notices", icon: Bell },
    { name: "학사일정", href: "/admin/academic-calendar", icon: Calendar },
    { name: "요청 관리", href: "/admin/requests", icon: MessageSquare },
    { name: "이탈 시그널", href: "/admin/alerts", icon: AlertCircle },
    { name: "원생 관리", href: "/admin/students", icon: Users },
    { name: "영상 과제", href: "/admin/video-assignments", icon: Video },
  ];

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-[1100] shadow-md text-white">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-frage-orange rounded-lg flex items-center justify-center text-white font-black text-lg">A</div>
            <Link href="/admin/home" className="text-xl font-bold tracking-tight text-white">
                FRAGE <span className="text-frage-orange">Admin</span>
            </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            if (item.href === "/admin/students") {
              return (
                <div key={item.href} className="relative">
                  <button
                    aria-haspopup="menu"
                    aria-expanded={isStudentsMenuOpen}
                    onClick={() => setIsStudentsMenuOpen((v) => !v)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                      isActive
                        ? "bg-slate-800 text-frage-orange"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title="원생/차량"
                  >
                    <Users className={`w-4 h-4 ${isActive ? "stroke-2" : "stroke-1.5"}`} />
                    원생/차량
                  </button>
                  {isStudentsMenuOpen && (
                    <div
                      role="menu"
                      aria-label="원생/차량 메뉴"
                      className="absolute left-0 mt-2 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-lg z-[1200]"
                    >
                      <Link
                        role="menuitem"
                        href="/admin/students"
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-t-xl ${
                          pathname.startsWith("/admin/students") ? "text-frage-orange bg-slate-800" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                        onClick={() => setIsStudentsMenuOpen(false)}
                      >
                        <Users className="w-4 h-4" />
                        원생 관리
                      </Link>
                      <Link
                        role="menuitem"
                        href="/admin/new-students"
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-bold ${
                          pathname.startsWith("/admin/new-students") ? "text-frage-orange bg-slate-800" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                        onClick={() => setIsStudentsMenuOpen(false)}
                      >
                        <Users className="w-4 h-4" />
                        신규생 관리
                      </Link>
                      <Link
                        role="menuitem"
                        href="/admin/transport"
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-b-xl ${
                          pathname.startsWith("/admin/transport") ? "text-frage-orange bg-slate-800" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                        onClick={() => setIsStudentsMenuOpen(false)}
                      >
                        <Bus className="w-4 h-4" />
                        차량 관리
                      </Link>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  isActive 
                  ? "bg-slate-800 text-frage-orange" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "stroke-2" : "stroke-1.5"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User / Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
           <div className="hidden md:flex items-center gap-3">
               <div className="text-right">
                   <p className="text-xs font-bold text-white">행정팀</p>
                   <p className="text-[10px] text-slate-400">본사</p>
               </div>
               <div className="relative">
                 <button
                   aria-haspopup="menu"
                   aria-expanded={isSettingsOpen}
                   onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                   className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400"
                   title="설정"
                 >
                   <Settings className="w-5 h-5" />
                 </button>
                 {isSettingsOpen && (
                   <div
                     role="menu"
                     aria-label="관리 메뉴"
                     className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-lg z-[1200]"
                   >
                     <Link
                       role="menuitem"
                       href="/admin/teachers"
                       className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-t-xl ${pathname.startsWith("/admin/teachers") ? "text-frage-orange bg-slate-800" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                       onClick={() => setIsSettingsOpen(false)}
                     >
                       <Users className="w-4 h-4" />
                       계정 관리
                     </Link>
                     <div className="h-px bg-slate-800" />
                     <Link
                       role="menuitem"
                       href="/admin/teacher-classes"
                       className={`flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-b-xl ${pathname.startsWith("/admin/teacher-classes") ? "text-frage-orange bg-slate-800" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}
                       onClick={() => setIsSettingsOpen(false)}
                     >
                       <GraduationCap className="w-4 h-4" />
                       강사 클래스 관리
                     </Link>
                   </div>
                 )}
               </div>
               <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-colors" title="로그아웃">
                   <LogOut className="w-5 h-5" />
               </button>
           </div>

           {/* Mobile Menu Button */}
           <button 
             className="md:hidden p-2 text-slate-400"
             onClick={() => setIsMenuOpen(!isMenuOpen)}
           >
             {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {isMenuOpen && (
        <>
          <div className="fixed inset-0 z-[1050]" onClick={() => setIsMenuOpen(false)} />
          <div className="md:hidden border-t border-slate-800 bg-slate-900 absolute top-full left-0 right-0 shadow-lg z-[1100]">
            <div className="p-2 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${
                      pathname.startsWith(item.href) ? "bg-slate-800 text-frage-orange" : "text-slate-400"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              <div className="h-px bg-slate-800 my-2"></div>
              <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-400 hover:bg-slate-800"
              >
                  <LogOut className="w-5 h-5" />
                  로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Video, FileText, LogOut, Menu, X, Users, UserPlus } from "lucide-react";

export default function TeacherHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem("admin_role");
      setRole(r || null);
      const id = localStorage.getItem("current_teacher_id");
      setTeacherId(id || null);
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === "admin_role") {
        setRole(e.newValue);
      }
      if (e.key === "current_teacher_id") {
        setTeacherId(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isTeacher =
    !role ||
    ["teacher", "교사"].some((k) => role.toLowerCase().includes(k));
  if (!isTeacher) return null;

  const menuItems = [
    { name: "Dashboard", href: "/teacher/home", icon: Home },
    { name: "신규생관리", href: "/teacher/new-students", icon: UserPlus },
    { name: "Students", href: "/teacher/students", icon: Users },
    { name: "Video Homework", href: "/teacher/video", icon: Video },
    { name: "Reports", href: "/teacher/reports", icon: FileText },
  ];

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-frage-navy rounded-lg flex items-center justify-center text-white font-black text-lg">T</div>
            <Link href="/teacher/home" className="text-xl font-bold text-slate-900 tracking-tight">
                FRAGE <span className="text-frage-blue">Teacher</span>
            </Link>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-1">
          {menuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                  isActive 
                  ? "bg-slate-100 text-frage-blue" 
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
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
                   <p className="text-xs font-bold text-slate-900">{teacherId === "master_teacher" ? "관리자" : "Ms. Anna"}</p>
                   <p className="text-[10px] text-slate-500">{teacherId === "master_teacher" ? "Master Teacher" : "Teacher"}</p>
               </div>
               <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                   <UserIcon />
               </div>
               <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
                   <LogOut className="w-5 h-5" />
               </button>
           </div>

           {/* Mobile Menu Button */}
           <button 
             className="md:hidden p-2 text-slate-600"
             onClick={() => setIsMenuOpen(!isMenuOpen)}
           >
             {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
           </button>
        </div>
      </div>

      {/* Mobile Nav Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute w-full left-0 shadow-lg">
          <div className="p-2 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold ${
                    pathname.startsWith(item.href) ? "bg-slate-50 text-frage-blue" : "text-slate-600"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
            <div className="h-px bg-slate-100 my-2"></div>
            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-red-500 hover:bg-red-50"
            >
                <LogOut className="w-5 h-5" />
                Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

function UserIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
        </svg>
    )
}

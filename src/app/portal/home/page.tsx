"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bell, 
  FileText, 
  HelpCircle, 
  AlertTriangle, 
  ChevronDown,
  MessageSquare,
  Video,
  User,
  Bus,
  Car,
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { supabase } from "@/lib/supabase";

export default function ParentPortalHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [studentStatus, setStudentStatus] = useState<string | null>(null);
  type StudentProfile = {
    id: string;
    name: string;
    englishName: string;
    className: string;
    campus: string;
    profile_completed?: boolean;
    use_bus?: boolean | null;
    address?: string | null;
    latestReport?: {
      id: string;
      message: string;
      rate: number;
      date: string;
    } | null;
    pendingVideoCount?: number;
  };

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [needOnboarding, setNeedOnboarding] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | 4>(1);
  const [onboardingUseBus, setOnboardingUseBus] = useState<boolean | null>(null);
  const [onboardingCommuteType, setOnboardingCommuteType] = useState<"bus" | "pickup" | "walk" | "">("");
  const [onboardingAddress, setOnboardingAddress] = useState("");
  const [onboardingDetailAddress, setOnboardingDetailAddress] = useState("");
  const [onboardingPickupPlace, setOnboardingPickupPlace] = useState("");
  const [onboardingDropoffPlace, setOnboardingDropoffPlace] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  
  // For Enrolled Students
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string; target_month: string; published_at: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; message: string; date?: string; title?: string; isRead?: boolean; category?: string; createdAt?: string }[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  
  const handleContact = () => {
    // KakaoTalk Channel URL
    window.open("http://pf.kakao.com/_TxdXxnG/chat", "_blank");
  };

  const [readReportIds, setReadReportIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("read_reports");
    if (saved) {
      try {
        setReadReportIds(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const markReportAsRead = (id: string) => {
    if (!readReportIds.includes(id)) {
      const next = [...readReportIds, id];
      setReadReportIds(next);
      localStorage.setItem("read_reports", JSON.stringify(next));
    }
  };

  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Load Daum Postcode script
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        const { data: parent } = await supabase
          .from("parents")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();

        if (!parent) {
          setAuthorized(false);
          setAuthChecked(true);
          router.replace("/portal");
          return;
        }
        setAuthorized(true);
        setAuthChecked(true);
        setAuthUserId(user.id);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      console.log("useEffect for data fetching: authChecked=", authChecked, ", authorized=", authorized);
      try {
        if (!authChecked || !authorized) {
          console.log("Not authorized or auth not checked, setting loading to false.");
          setLoading(false);
          return;
        }
        console.log("Fetching /api/portal/home...");
        const res = await fetch("/api/portal/home", { cache: "no-store" });
        const payload = await res.json();
        const students = Array.isArray(payload?.students) ? payload.students : [];
        
        const first = students[0] || null;
        if (first) {
          setStudentProfile({
            ...first,
            name: first.name || "학생"
          });
          setStudentStatus(first.type || "enrolled");
        } else {
          setStudentStatus(null);
          setStudentProfile(null);
        }

        if (first && first.id) {
          setStudentId(String(first.id));
        } else {
          setStudentId(null);
        }

        // The following onboarding logic is moved to a separate useEffect
        // to ensure it runs only when studentProfile is fully set.
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, authorized, router]);

  useEffect(() => {
    if (!studentProfile) return;

    const profileCompleted = studentProfile.profile_completed === true;
    const useBus = typeof studentProfile.use_bus === "boolean"
      ? studentProfile.use_bus
      : null;
    const address = typeof studentProfile.address === "string"
      && studentProfile.address.trim().length > 0
        ? studentProfile.address
        : "";

    const need =
      profileCompleted !== true ||
      useBus === null ||
      (useBus === true && !address);

    setNeedOnboarding(need);
  }, [studentProfile]);

  const handleAddressSearch = () => {
    if (typeof window !== "undefined" && (window as any).daum) {
      new (window as any).daum.Postcode({
        oncomplete: function (data: any) {
          let fullAddr = data.address;
          let extraAddr = "";

          if (data.addressType === "R") {
            if (data.bname !== "") {
              extraAddr += data.bname;
            }
            if (data.buildingName !== "") {
              extraAddr += extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
            }
            fullAddr += extraAddr !== "" ? " (" + extraAddr + ")" : "";
          }

          setOnboardingAddress(fullAddr);
        },
      }).open();
    } else {
      alert("주소 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  // Fetch data for Students
  useEffect(() => {
    if (!studentId) return;
    
    let alive = true;
    const load = async () => {
      if (studentStatus === "enrolled") {
        try {
          const res = await fetch(`/api/portal/reports?studentId=${studentId}`);
          const data = await res.json();
          if (alive) {
            const items = (data?.items || []).map((r: any) => ({
              id: r.id,
              title: r.title,
              date: r.date,
              status: r.status,
              target_month: r.target_month || r.date,
              published_at: r.created_at || r.date
            }));
            setMonthlyReports(items);
          }
        } catch {}
        try {
          const res = await fetch(`/api/portal/notifications?studentId=${studentId}`);
          const data = await res.json();
          if (alive) {
            const list = (data?.items || []).map((n: any) => ({
              id: n.id,
              message: n.message,
              date: n.date,
              title: n.title || "알림",
              isRead: n.read_at != null,
              category: n.category || "General",
              createdAt: n.created_at || new Date().toISOString()
            }));
            setNotifications(list);
          }
        } catch {}
      }

      try {
        // 공지사항 (posts 테이블) 가져오기 - Every student should see this
        const { data: noticeData, error: noticeError } = await supabase
          .from("posts")
          .select("*")
          .eq("category", "notice")
          .eq("is_archived", false)
          .order("created_at", { ascending: false })
          .limit(2);
        
        if (!noticeError && noticeData) {
          setNotices(noticeData);
        }
      } catch (err) {
        console.error("Notice fetch error:", err);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [studentId, studentStatus]);

  if (!authChecked) return null;

  if (loading || !studentProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        Loading...
      </div>
    );
  }

  const renderOnboardingModal = () => {
    if (!needOnboarding || !studentId) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6 mx-4 relative">
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  원활한 학습 안내를 위해{" "}
                  <br className="hidden sm:block" />
                  처음 한 번만 정보를 확인해 주세요.
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  입력하신 정보는 언제든지 수정할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                  {onboardingStep}
                </span>
                <span className="font-bold">
                  {onboardingStep === 1
                    ? "Step 1. 보호자 계정 연결"
                    : onboardingStep === 2
                    ? "Step 2. 등·하원 / 차량 정보"
                    : onboardingStep === 3
                    ? "Step 3. 주소 입력"
                    : "Step 4. 완료"}
                </span>
              </div>
              <span className="font-bold">
                {onboardingStep}/4
              </span>
            </div>
          </div>

          {onboardingStep === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    현재 로그인한 계정을 자녀 정보와 연결합니다.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    계정 연결 중입니다. 다음 버튼을 눌러 계속 진행해 주세요.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700">등·하원 방식을 선택해 주세요.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingUseBus(true);
                      setOnboardingCommuteType("bus");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      onboardingUseBus === true
                        ? "border-frage-blue bg-blue-50 text-frage-blue"
                        : "border-slate-100 bg-white text-slate-400"
                    }`}
                  >
                    <Bus className="w-6 h-6" />
                    <span className="text-sm font-bold">셔틀 버스</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingUseBus(false);
                      setOnboardingCommuteType("pickup");
                    }}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      onboardingUseBus === false
                        ? "border-frage-blue bg-blue-50 text-frage-blue"
                        : "border-slate-100 bg-white text-slate-400"
                    }`}
                  >
                    <Car className="w-6 h-6" />
                    <span className="text-sm font-bold">직접 등원</span>
                  </button>
                </div>
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(1)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={onboardingUseBus === null}
                  onClick={() => setOnboardingStep(3)}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700">주소를 입력해 주세요.</p>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      placeholder="주소 찾기 버튼을 눌러주세요"
                      value={onboardingAddress}
                      className="flex-1 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        new (window as any).daum.Postcode({
                          oncomplete: function(data: any) {
                            setOnboardingAddress(data.address);
                            if (data.buildingName) {
                              setOnboardingDetailAddress(data.buildingName);
                            }
                          }
                        }).open();
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-900 text-xs font-bold text-white whitespace-nowrap"
                    >
                      주소 찾기
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="상세 주소를 입력해 주세요 (동, 호수 등)"
                    value={onboardingDetailAddress}
                    onChange={(e) => setOnboardingDetailAddress(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-frage-blue focus:border-transparent outline-none"
                  />
                </div>

                {onboardingUseBus && (
                   <div className="space-y-2 pt-2 border-t border-slate-100 mt-2">
                      <p className="text-xs font-bold text-slate-500">셔틀 승하차 장소 (선택)</p>
                      <input
                        type="text"
                        placeholder="예: 단지 내 정문, XX동 앞 등"
                        value={onboardingPickupPlace}
                        onChange={(e) => setOnboardingPickupPlace(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-frage-blue focus:border-transparent outline-none"
                      />
                   </div>
                )}
              </div>
              
              {onboardingError && (
                <p className="text-xs text-red-500 font-bold">{onboardingError}</p>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOnboardingStep(2)}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-bold text-slate-600 hover:bg-slate-200"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={!onboardingAddress || onboardingSaving}
                  onClick={async () => {
                    try {
                      setOnboardingSaving(true);
                      setOnboardingError("");
                      const finalAddress = onboardingAddress + (onboardingDetailAddress ? ` ${onboardingDetailAddress}` : "");
                      
                      const payload = {
                        use_bus: onboardingUseBus,
                        commute_type: onboardingUseBus 
                            ? "bus" 
                            : onboardingCommuteType === "pickup" 
                            ? "self" 
                            : "bus",
                        address: finalAddress.length > 0 ? finalAddress : null,
                        pickup_place: onboardingPickupPlace.trim() || null,
                        dropoff_place: onboardingDropoffPlace.trim() || null,
                        parent_auth_user_id: authUserId,
                        profile_completed: true,
                      };
                      const res = await fetch(
                        `/api/students/${studentId}/onboarding`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(payload),
                        }
                      );
                      if (!res.ok) {
                        setOnboardingError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
                        setOnboardingSaving(false);
                        return;
                      }
                      setNeedOnboarding(false);
                    } catch {
                      setOnboardingError("저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
                      setOnboardingSaving(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-frage-blue text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {onboardingSaving ? "저장 중..." : "저장하고 시작하기"}
                </button>
              </div>
            </div>
          )}

          {needOnboarding && (
            <details className="mt-4 text-sm text-gray-500 border-t border-slate-100 pt-4">
              <summary className="cursor-pointer font-medium select-none flex items-center gap-2 text-slate-600">
                <HelpCircle className="w-4 h-4" />
                자주 묻는 질문
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-slate-500 pl-6 list-disc">
                <li>아이디/비밀번호를 등록해주세요</li>
                <li>재원생의 경우 회원가입 없이 휴대폰 인증만 합니다.</li>
                <li>차량·학습 안내를 위한 정보로 처음 한 번만 입력합니다.</li>
              </ul>
            </details>
          )}
        </div>
      </div>
    );
  };

  // --- ENROLLED STUDENT VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      {renderOnboardingModal()}

      <main className="px-4 md:px-6 py-6 max-w-6xl mx-auto space-y-8">
        
        {/* Top Section: Welcome & Quick Status */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                 <span className="text-frage-blue">{studentProfile?.name || "학생"}</span> 학부모님! 👋
              </h1>
              <p className="text-sm text-slate-500 font-medium">오늘도 즐거운 하루 보내세요.</p>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            
            {studentStatus === "applicant" && (
              <section className="bg-orange-50 rounded-3xl p-6 border border-orange-100">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-600 shadow-sm">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">입학 절차 진행 중</h2>
                    <p className="text-sm text-slate-600 mt-0.5">현재 입학 상담 및 테스트 단계입니다.</p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl p-4 text-sm text-slate-600">
                  <p>학원 방문 및 상담이 완료되면 정규반 배정 후 전체 메뉴를 이용하실 수 있습니다.</p>
                </div>
              </section>
            )}

            {/* Today's Dajim Report Card */}
            {studentStatus === "enrolled" && studentProfile?.latestReport && (
              <section 
                onClick={() => markReportAsRead(studentProfile.latestReport!.id)}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">✨ 오늘의 다짐 리포트</h2>
                    {!readReportIds.includes(studentProfile.latestReport.id) && (
                      <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(studentProfile.latestReport.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-base font-bold text-slate-800">
                    <span>금일 다짐활동</span>
                    {studentProfile.latestReport.rate === 100 ? (
                      <span className="text-green-600">All completed 💚</span>
                    ) : (
                      <span className="text-orange-500">{studentProfile.latestReport.rate}% 완료</span>
                    )}
                  </div>
                  
                  {/* Word Test Info - Mock or Extract from message */}
                  <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg inline-block">
                    Word Test 1/8 예정
                  </div>
                </div>

                <Link 
                  href={`/portal/daily/${studentProfile.latestReport.id}`}
                  className="flex items-center justify-center w-full py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  [전체 브리핑 보기]
                </Link>
              </section>
            )}

            {/* Video Homework Reminder */}
            {studentStatus === "enrolled" && (studentProfile?.pendingVideoCount || 0) > 0 && (
              <Link href="/portal/video">
                <section className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 flex items-center justify-between group hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">비디오 과제가 기다리고 있어요! 🎥</h3>
                      <p className="text-blue-100 text-xs mt-0.5">
                        {studentProfile?.name} 학생이 제출해야 할 과제가 {studentProfile?.pendingVideoCount}건 있습니다.
                      </p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </section>
              </Link>
            )}

            {/* 2. Notices Grid */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-frage-orange" />
                  공지사항
                </h2>
                <Link href="/portal/notices" className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">
                  더보기
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notices.map((notice) => (
                  <Link key={notice.id} href={`/portal/notices/${notice.id}`}>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600`}>
                            공지
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-frage-blue transition-colors">
                          {notice.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span>{new Date(notice.created_at).toLocaleDateString()}</span>
                        <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
                      </p>
                    </div>
                  </Link>
                ))}
                {notices.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">등록된 공지사항이 없습니다.</p>
                  </div>
                )}
              </div>
            </section>

            {/* 2. Monthly Report Card */}
            {studentStatus === "enrolled" && (
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-white rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                
                <div className="relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-frage-navy" />
                        월간 리포트
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">이번 달 학습 성취도를 확인하세요.</p>
                    </div>
                    <Link href="/portal/report" className="text-xs font-bold text-frage-blue bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors">
                      전체보기
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {monthlyReports.length > 0 ? (
                      monthlyReports.slice(0, 2).map((report) => (
                        <Link key={report.id} href="/portal/report" className="block">
                          <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-100 transition-colors border border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-frage-navy shadow-sm border border-slate-100">
                                <span className="text-lg font-black">{new Date(report.target_month).getMonth() + 1}</span>
                                <span className="text-[10px] font-bold text-slate-400 ml-0.5">월</span>
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900">{report.title}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{new Date(report.published_at).toLocaleDateString()} 발행</p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400">
                              <ChevronDown className="w-5 h-5 -rotate-90" />
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 font-medium">아직 발행된 리포트가 없습니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Right Column (Side Widgets) */}
          <div className="space-y-6">
            
            {/* Quick Actions Grid */}
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 mb-4">빠른 메뉴</h3>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/portal/requests" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">요청 전달</span>
                </Link>
                <Link href="/portal/video" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group relative">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">영상 과제</span>
                  {studentProfile?.pendingVideoCount ? (
                    <span className="absolute top-3 right-3 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                      {studentProfile.pendingVideoCount}
                    </span>
                  ) : null}
                </Link>
                <Link href="/portal/child" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <User className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">자녀 정보</span>
                </Link>
                <button onClick={handleContact} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">문의하기</span>
                </button>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}

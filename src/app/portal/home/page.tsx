"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bell, 
  FileText, 
  HelpCircle, 
  CheckCircle, 
  FileCheck, 
  Calendar, 
  AlertTriangle, 
  ChevronDown,
  MessageSquare,
  Video,
  User,
  Bus,
  Car
} from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { supabase } from "@/lib/supabase";

export default function ParentPortalHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [studentStatus, setStudentStatus] = useState<string | null>(null);
  const [studentType, setStudentType] = useState<"enrolled" | "applicant" | null>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);
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

  // For New Students
  const [currentStep, setCurrentStep] = useState("대기");
  const [admissionOpen, setAdmissionOpen] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [myReservation, setMyReservation] = useState<any>(null);

  const [studentId, setStudentId] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [allSlots, setAllSlots] = useState<any[]>([]);
  const fmtYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };
  const parseYMD = (s: string) => {
    const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
    return new Date(y, m - 1, d);
  };
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const DEFAULT_TIMES = useMemo((): string[] => {
    const times: string[] = [];
    for (let h = 10; h <= 20; h++) {
      times.push(`${String(h).padStart(2, "0")}:00`);
    }
    return times;
  }, []);

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
    const today = new Date();
    while (today.getDay() === 0 || today.getDay() === 6) {
      today.setDate(today.getDate() + 1);
    }
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!authChecked || !authorized) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/portal/home", { cache: "no-store" });
        const payload = await res.json();
        const students = Array.isArray(payload?.students) ? payload.students : [];
        
        const first = students[0] || null;
        if (first && first.type === "applicant") {
          setStudentType("applicant");
          setStudentProfile(first);
          setStudentStatus(first.status || "waiting");
        } else if (first && first.type === "enrolled") {
          setStudentStatus("enrolled");
          setStudentType("enrolled");
          setStudentProfile(first);
        } else {
          setStudentType(null);
          setStudentProfile(null);
        }

        if (first && first.id) {
          setStudentId(String(first.id));
        } else {
          setStudentId(null);
        }

        if (first) {
          const profileCompleted = first.profile_completed === true;
          const useBus = typeof first.use_bus === "boolean" ? first.use_bus : null;
          const address = typeof first.address === "string" && first.address.trim().length > 0
              ? first.address
              : "";
          
          // Onboarding is needed if:
          // 1. Profile is not marked completed
          // 2. OR useBus is not set (null)
          // 3. OR useBus is true but address is missing
          const need =
            profileCompleted !== true ||
            useBus === null ||
            (useBus === true && !address);
            
          setNeedOnboarding(need);
          
          if (useBus !== null) {
            setOnboardingUseBus(useBus);
          } else {
            setOnboardingUseBus(null);
          }
          
          if (useBus === true) {
            setOnboardingCommuteType("bus");
          } else {
            setOnboardingCommuteType("");
          }
          
          setOnboardingAddress(address);
          setOnboardingDetailAddress("");
          setOnboardingPickupPlace("");
          setOnboardingDropoffPlace("");
          setOnboardingStep(1);
          setOnboardingError(null);
        } else {
          setNeedOnboarding(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authChecked, authorized, router]);

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

  const handleReserve = (slot: any) => {
    if (!confirm(`${slot.date} ${slot.time}에 입학 테스트를 예약하시겠습니까?`)) return;

    const reservation = {
        slotId: slot.id,
        date: slot.date,
        time: slot.time,
        reservedAt: new Date().toISOString()
    };

    setMyReservation(reservation);

    setAllSlots(prev => prev.map((s: any) => s.id === slot.id ? { ...s, current: (s.current || 0) + 1 } : s));
    setAvailableSlots(prev => prev.map((s: any) => s.id === slot.id ? { ...s, current: (s.current || 0) + 1 } : s).filter((s: any) => s.isOpen));
    
    alert("예약이 완료되었습니다.");
  };

  const handleCancelReservation = () => {
      if(!confirm("예약을 취소하시겠습니까?")) return;
      
      if (myReservation) {
        const id = myReservation.slotId;
        setAllSlots(prev => prev.map((s: any) => s.id === id ? { ...s, current: Math.max(0, (s.current || 1) - 1) } : s));
        setAvailableSlots(prev => prev.map((s: any) => s.id === id ? { ...s, current: Math.max(0, (s.current || 1) - 1) } : s).filter((s: any) => s.isOpen));
      }

      setMyReservation(null);
  };

  // Fetch data for Enrolled Students
  useEffect(() => {
    if (studentStatus !== "enrolled") return;
    if (!studentId) return;
    
    let alive = true;
    const load = async () => {
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

      try {
        // 공지사항 (posts 테이블) 가져오기
        const { data } = await supabase
          .from("posts")
          .select("*")
          .eq("category", "notice")
          .order("created_at", { ascending: false })
          .limit(2);
        
        if (alive && data) {
          setNotices(data);
        }
      } catch {}
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [studentId, studentStatus]);

  if (!authChecked) return null;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
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

  if (studentType === "applicant") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
        <PortalHeader />
        {renderOnboardingModal()}
        
        <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-yellow-700">신규 학생 상태</div>
              <div className="text-sm font-bold text-yellow-900">{(studentProfile?.status || "waiting") === "waiting" ? "상담 대기" : String(studentProfile?.status || "신규")}</div>
              <div className="text-xs text-yellow-800 mt-1">아직 수업은 시작되지 않았습니다.</div>
            </div>
            <button
              onClick={() => {
                const el = document.getElementById("consultation-reservation");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            >
              상담 예약
            </button>
          </div>
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900">
              <span className="text-frage-blue">{studentProfile?.name || "학생"}</span> 학부모님!<br/>
              환영합니다!
            </h1>
            <p className="text-slate-500 mt-2 text-sm">현재 입학 절차가 진행 중입니다.</p>
          </div>

          {/* Current Status Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400">현재 진행 상태</p>
                <h2 className="text-xl font-bold text-slate-900">{currentStep}</h2>
              </div>
            </div>
            
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-blue-500 transition-all duration-500"
                 style={{ 
                   width: admissionOpen ? "70%" : (myReservation || currentStep.includes("상담")) ? "40%" : "10%" 
                 }}
               ></div>
            </div>
            <p className="text-right text-xs text-blue-500 font-bold mt-2">
              {admissionOpen ? "입학 서류 작성 단계" : myReservation ? "입학 테스트 예약 완료" : "입학 테스트 예약 대기"}
            </p>
          </div>

          {/* STEP 1: Admission Test Reservation */}
          {!admissionOpen && (
            <section className="animate-fade-in-up delay-100">
                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    STEP 1. 입학 테스트 예약
                </h3>
                
                {myReservation ? (
                    <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="inline-block px-2 py-0.5 rounded bg-purple-200 text-purple-700 text-xs font-bold mb-2">예약 완료</span>
                                <h4 className="text-lg font-bold text-slate-800">입학 테스트 일정이 확정되었습니다.</h4>
                                <p className="text-slate-600 mt-1">
                                    {myReservation.date} {myReservation.time}
                                </p>
                                <p className="text-xs text-slate-400 mt-2">
                                    * 변경이 필요하시면 학원으로 문의해주세요.
                                </p>
                            </div>
                            <button 
                                onClick={handleCancelReservation}
                                className="text-sm text-slate-400 underline hover:text-red-500"
                            >
                                예약 취소
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                      <div id="consultation-reservation" className="bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <div className="p-4 flex items-center justify-between">
                          <div className="font-bold text-slate-900">
                            {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setViewMode("month")}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${viewMode === "month" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200"}`}
                            >
                              월간
                            </button>
                            <button 
                              onClick={() => setViewMode("week")}
                              className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${viewMode === "week" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-700 border-slate-200"}`}
                            >
                              주간
                            </button>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => {
                                  if (viewMode === "month") {
                                    const d = new Date(currentMonth);
                                    d.setMonth(d.getMonth() - 1);
                                    const nextMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  } else {
                                    const base = parseYMD(selectedDate || fmtYMD(new Date()));
                                    base.setDate(base.getDate() - 7);
                                    const nextDate = fmtYMD(base);
                                    setSelectedDate(nextDate);
                                    const nextMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  }
                                }}
                                className="p-2 rounded-lg border border-slate-200 bg-white"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                              <button
                                onClick={() => {
                                  if (viewMode === "month") {
                                    const d = new Date(currentMonth);
                                    d.setMonth(d.getMonth() + 1);
                                    const nextMonth = new Date(d.getFullYear(), d.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  } else {
                                    const base = parseYMD(selectedDate || fmtYMD(new Date()));
                                    base.setDate(base.getDate() + 7);
                                    const nextDate = fmtYMD(base);
                                    setSelectedDate(nextDate);
                                    const nextMonth = new Date(base.getFullYear(), base.getMonth(), 1);
                                    setCurrentMonth(nextMonth);
                                    
                                  }
                                }}
                                className="p-2 rounded-lg border border-slate-200 bg-white"
                              >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 pt-0">
                          {viewMode === "month" ? (
                            <div className="grid grid-cols-7 gap-2">
                              {["일","월","화","수","목","금","토"].map((d) => (
                                <div key={d} className="text-xs font-bold text-slate-400 text-center">{d}</div>
                              ))}
                              {(() => {
                                const startDay = new Date(currentMonth);
                                const firstDayIndex = startDay.getDay();
                                const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
                                const today = new Date();
                                const cells = [];
                                for (let i = 0; i < firstDayIndex; i++) {
                                  cells.push(<div key={`pad-${i}`} />);
                                }
                                for (let day = 1; day <= daysInMonth; day++) {
                                  const y = currentMonth.getFullYear();
                                  const m = String(currentMonth.getMonth() + 1).padStart(2, "0");
                                  const dd = String(day).padStart(2, "0");
                                  const dateStr = `${y}-${m}-${dd}`;
                                  const isToday = today.getFullYear() === y && today.getMonth() === currentMonth.getMonth() && today.getDate() === day;
                                  const isSelected = selectedDate === dateStr;
                                  cells.push(
                                    <button
                                      key={dateStr}
                                      onClick={() => {
                                        setSelectedDate(dateStr);
                                      }}
                                      className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"}`}
                                    >
                                      <div className={`text-xs md:text-sm font-bold ${isToday ? "text-purple-600" : "text-slate-700"}`}>
                                        {day}
                                      </div>
                                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                        {allSlots.filter(s => s.date === dateStr && s.isOpen).length}개 오픈
                                      </div>
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          ) : (
                            <div className="grid grid-cols-7 gap-2">
                              {["일","월","화","수","목","금","토"].map((d) => (
                                <div key={d} className="text-xs font-bold text-slate-400 text-center">{d}</div>
                              ))}
                              {(() => {
                                const base = parseYMD(selectedDate || fmtYMD(new Date()));
                                const dayIdx = base.getDay();
                                const start = new Date(base);
                                start.setDate(base.getDate() - dayIdx);
                                const today = new Date();
                                const cells = [];
                                for (let i = 0; i < 7; i++) {
                                  const d = new Date(start);
                                  d.setDate(start.getDate() + i);
                                  const y = d.getFullYear();
                                  const m = String(d.getMonth() + 1).padStart(2, "0");
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  const dateStr = `${y}-${m}-${dd}`;
                                  const isToday = today.getFullYear() === y && today.getMonth() === d.getMonth() && today.getDate() === d.getDate();
                                  const isSelected = selectedDate === dateStr;
                                  cells.push(
                                    <button
                                      key={dateStr}
                                      onClick={() => {
                                        setSelectedDate(dateStr);
                                      }}
                                      className={`h-16 md:h-20 rounded-xl border flex flex-col items-center justify-center transition-all ${isSelected ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"}`}
                                    >
                                      <div className={`text-xs md:text-sm font-bold ${isToday ? "text-purple-600" : "text-slate-700"}`}>
                                        {d.getDate()}
                                      </div>
                                      <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                        {allSlots.filter(s => s.date === dateStr && s.isOpen).length}개 오픈
                                      </div>
                                    </button>
                                  );
                                }
                                return cells;
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {(() => {
                          const baseTimes = DEFAULT_TIMES;
                          const openSlots = allSlots
                            .filter(s => s.date === selectedDate && s.isOpen)
                            .sort((a, b) => {
                              const ai = baseTimes.indexOf(a.time);
                              const bi = baseTimes.indexOf(b.time);
                              if (ai === -1 || bi === -1) return a.time.localeCompare(b.time);
                              return ai - bi;
                            });
                          if (openSlots.length === 0) {
                            return (
                              <div className="col-span-3 text-center text-slate-400 text-sm font-medium py-6">
                                선택한 날짜에 예약 가능한 시간이 없습니다.
                              </div>
                            );
                          }
                          return openSlots.map(slot => {
                            const isFull = (slot.current || 0) >= slot.max;
                            const canReserve = !isFull;
                            return (
                              <button
                                key={slot.id}
                                onClick={() => canReserve && handleReserve(slot)}
                                disabled={!canReserve}
                                className={`h-20 rounded-2xl border text-sm font-bold flex flex-col items-center justify-center ${
                                  canReserve
                                    ? "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                                    : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                <span>{slot.time}</span>
                                <span className="text-xs">{`신청 ${slot.current || 0}/${slot.max}`}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                )}
            </section>
          )}

          {/* Action Items */}
          {admissionOpen ? (
            <section className="animate-fade-in-up">
              <div className="block group">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200 transform transition-all hover:scale-[1.02]">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold backdrop-blur-sm">필수</span>
                        <h2 className="text-xl font-bold">신규 입학 서류 패키지</h2>
                      </div>
                      <p className="text-blue-100 text-sm mb-4">입학원서, 실태조사서 등 필수 서류를<br/>한 번에 제출해주세요.</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:bg-white group-hover:text-blue-600 transition-all">
                      <FileCheck className="w-6 h-6" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-blue-100 group-hover:text-white">
                    <span>서류 작성하기</span>
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="bg-slate-100 rounded-xl p-4 text-center text-slate-500 text-sm">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p>입학이 확정되면<br/>입학 서류 패키지가 이곳에 표시됩니다.</p>
            </div>
          )}

          {/* Guide Links */}
          <div className="grid grid-cols-1 gap-3">
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">입학 일정</p>
             </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              입학 관련 문의: 053-754-0577
            </p>
          </div>

        </main>
      </div>
    );
  }

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
            
            {/* 1. Notices Grid */}
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
                <Link href="/portal/video" className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 hover:bg-frage-blue/5 hover:text-frage-blue transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 mb-2 group-hover:text-frage-blue group-hover:scale-110 transition-all">
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold">영상 과제</span>
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

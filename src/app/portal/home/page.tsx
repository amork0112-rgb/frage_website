"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, FileText, HelpCircle, CheckCircle, FileCheck, Calendar, Truck, AlertTriangle } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";

export default function ParentPortalHome() {
  const [loading, setLoading] = useState(true);
  const [studentStatus, setStudentStatus] = useState<string>("enrolled"); // 'enrolled' or 'new'
  const [newStudentProfile, setNewStudentProfile] = useState<any>(null);
  
  // For Enrolled Students
  const [monthlyReports, setMonthlyReports] = useState<{ id: string; title: string; date: string; status: string }[]>([]);
  const [notifications, setNotifications] = useState<{ id?: string; message: string; date?: string }[]>([]);
  
  // For New Students
  const [currentStep, setCurrentStep] = useState("대기");
  const [admissionOpen, setAdmissionOpen] = useState(false);

  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [myReservation, setMyReservation] = useState<any>(null);

  const [studentId, setStudentId] = useState<string>("s8");

  useEffect(() => {
    try {
      // 1. Get logged in user
      const accountRaw = localStorage.getItem("portal_account");
      const account = accountRaw ? JSON.parse(accountRaw) : null;
      
      if (account) {
        setStudentId(account.id);
      }

      // 2. Check if this user is in signup_profiles (New Student)
      const rawProfiles = localStorage.getItem("signup_profiles");
      const profiles = rawProfiles ? JSON.parse(rawProfiles) : [];
      const profile = profiles.find((p: any) => p.id === (account?.id || "unknown"));

      if (profile && profile.status !== "enrolled") {
        setStudentStatus("new");
        setNewStudentProfile(profile);

        // Load Slots
        const rawSlots = localStorage.getItem("admission_test_slots");
        if (rawSlots) {
            const slots = JSON.parse(rawSlots);
            // Show all slots, filter logic can be improved later
            setAvailableSlots(slots.filter((s: any) => s.isOpen));
        }

        // Load My Reservation
        const rawRes = localStorage.getItem("student_reservations");
        if (rawRes) {
            const allRes = JSON.parse(rawRes);
            const myRes = allRes[profile.id];
            if (myRes) {
                setMyReservation(myRes);
            }
        }

        // Check admission progress
        const checklistsRaw = localStorage.getItem("teacher_new_student_checklists");
        if (checklistsRaw) {
          const checklists = JSON.parse(checklistsRaw);
          const checklist = checklists[profile.id];
          
          if (checklist?.admission_confirmed?.checked) {
            setAdmissionOpen(true);
            setCurrentStep("입학 확정");
          } else if (checklist?.consultation_confirmed?.checked) {
            setCurrentStep("상담 확정");
          } else {
            setCurrentStep(profile.status === "waiting" ? "입학 대기" : "상담 전");
          }
        }
      } else {
        setStudentStatus("enrolled");
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReserve = (slot: any) => {
    if (!confirm(`${slot.date} ${slot.time}에 입학 테스트를 예약하시겠습니까?`)) return;

    const reservation = {
        slotId: slot.id,
        date: slot.date,
        time: slot.time,
        reservedAt: new Date().toISOString()
    };

    setMyReservation(reservation);

    // Save to local storage
    const rawRes = localStorage.getItem("student_reservations");
    const allRes = rawRes ? JSON.parse(rawRes) : {};
    allRes[newStudentProfile.id] = reservation;
    localStorage.setItem("student_reservations", JSON.stringify(allRes));

    // Update slot count (Optimistic UI)
    const rawSlots = localStorage.getItem("admission_test_slots");
    if (rawSlots) {
        const slots = JSON.parse(rawSlots);
        const updatedSlots = slots.map((s: any) => {
            if (s.id === slot.id) {
                return { ...s, current: (s.current || 0) + 1 };
            }
            return s;
        });
        localStorage.setItem("admission_test_slots", JSON.stringify(updatedSlots));
        setAvailableSlots(updatedSlots.filter((s: any) => s.isOpen));
    }
    
    alert("예약이 완료되었습니다.");
  };

  const handleCancelReservation = () => {
      if(!confirm("예약을 취소하시겠습니까?")) return;
      
      // Update slot count
      const rawSlots = localStorage.getItem("admission_test_slots");
      if (rawSlots && myReservation) {
          const slots = JSON.parse(rawSlots);
          const updatedSlots = slots.map((s: any) => {
              if (s.id === myReservation.slotId) {
                  return { ...s, current: Math.max(0, (s.current || 0) - 1) };
              }
              return s;
          });
          localStorage.setItem("admission_test_slots", JSON.stringify(updatedSlots));
          setAvailableSlots(updatedSlots.filter((s: any) => s.isOpen));
      }

      setMyReservation(null);
      
      const rawRes = localStorage.getItem("student_reservations");
      const allRes = rawRes ? JSON.parse(rawRes) : {};
      delete allRes[newStudentProfile.id];
      localStorage.setItem("student_reservations", JSON.stringify(allRes));
  };

  // Fetch data for Enrolled Students
  useEffect(() => {
    if (studentStatus !== "enrolled") return;
    
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
            status: r.status
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
            date: n.date
          }));
          setNotifications(list);
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  // --- NEW STUDENT VIEW ---
  if (studentStatus === "new") {
    return (
      <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
        <PortalHeader />
        
        <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900">
              환영합니다,<br/>
              <span className="text-frage-blue">{newStudentProfile?.studentName}</span> 학부모님!
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
                    <div className="space-y-3">
                        {availableSlots.length === 0 ? (
                            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                                현재 예약 가능한 일정이 없습니다.<br/>
                                학원으로 문의 부탁드립니다.
                            </div>
                        ) : (
                            availableSlots.map(slot => {
                                const isFull = (slot.current || 0) >= slot.max;
                                return (
                                <button
                                    key={slot.id}
                                    onClick={() => !isFull && handleReserve(slot)}
                                    disabled={isFull}
                                    className={`w-full p-4 rounded-xl border transition-all text-left flex justify-between items-center group ${
                                        isFull 
                                        ? 'bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed' 
                                        : 'bg-white border-slate-200 hover:border-purple-500 hover:shadow-md'
                                    }`}
                                >
                                    <div>
                                        <div className={`font-bold transition-colors ${isFull ? 'text-slate-400' : 'text-slate-800 group-hover:text-purple-600'}`}>
                                            {slot.date}
                                        </div>
                                        <div className="text-sm text-slate-500">
                                            {slot.time} <span className="text-slate-300">|</span> 
                                            <span className={isFull ? "text-red-500 font-bold ml-1" : "ml-1"}>
                                                {isFull ? "마감" : `잔여 ${slot.max - (slot.current || 0)}석`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        isFull 
                                        ? 'bg-slate-200 text-slate-400' 
                                        : 'bg-slate-50 text-slate-600 group-hover:bg-purple-600 group-hover:text-white'
                                    }`}>
                                        {isFull ? "예약불가" : "예약하기"}
                                    </div>
                                </button>
                                );
                            })
                        )}
                    </div>
                )}
            </section>
          )}

          {/* Action Items */}
          {admissionOpen ? (
             <section className="animate-fade-in-up">
              <Link href="/portal/admission" className="block group">
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
              </Link>
            </section>
          ) : (
            <div className="bg-slate-100 rounded-xl p-4 text-center text-slate-500 text-sm">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
              <p>입학이 확정되면<br/>입학 서류 패키지가 이곳에 표시됩니다.</p>
            </div>
          )}

          {/* Guide Links */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Truck className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">셔틀버스 안내</p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <Calendar className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">입학 일정</p>
             </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-400">
              입학 관련 문의: 02-1234-5678 (행정실)
            </p>
          </div>

        </main>
      </div>
    );
  }

  // --- ENROLLED STUDENT VIEW (Existing) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-8">
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-frage-blue" />
            공지사항
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {notifications.length > 0 ? notifications.map((n, idx) => (
              <div key={n.id || idx} className="p-4">
                <p className="text-sm text-slate-800 font-medium">{n.message}</p>
                {n.date && <p className="text-xs text-slate-400 mt-1">{n.date}</p>}
              </div>
            )) : (
              <div className="p-4 text-sm text-slate-500">현재 공지사항이 없습니다.</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-frage-navy" />
            학부모 포털 사용방법
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3 text-sm text-slate-700">
            <p className="font-bold text-slate-900">로그인 후 이용 가능한 주요 메뉴:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>영상 과제: 자녀의 오늘 과제를 녹화/확인합니다.</li>
              <li>월간 리포트: 학습 진행과 피드백을 확인합니다.</li>
              <li>공지사항: 학원 안내 및 공지 메시지를 확인합니다.</li>
              <li>요청 전달: 결석/지각/문의 등 전달 사항을 등록합니다.</li>
              <li>내 자녀: 자녀 기본 정보와 차량(등·하원) 정보를 관리합니다.</li>
            </ul>
            <p className="font-bold text-slate-900 mt-3">빠른 시작:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>상단 메뉴에서 원하는 기능으로 이동하세요.</li>
              <li>자녀 사진을 눌러 프로필 사진을 업로드할 수 있습니다.</li>
              <li>차량 정보 저장 후에는 포털 홈에서 최신 공지를 우선 확인하세요.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-frage-navy" />
            월간 리포트 (Monthly Report)
          </h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {(monthlyReports.length > 0 ? monthlyReports : []).map((report) => (
              <Link key={report.id} href="/portal/report" className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-frage-navy group-hover:text-white transition-colors">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{report.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{report.date}</p>
                  </div>
                </div>
              </Link>
            ))}
            {monthlyReports.length === 0 && (
              <div className="p-4 text-sm text-slate-500">아직 발행된 월간 리포트가 없습니다.</div>
            )}
          </div>
        </section>


      </main>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PortalHeader from "@/components/PortalHeader";
import { 
  User, MapPin, School, Bus, Clock, Shield, Bell, Info, Camera, 
  Calendar, Phone, Home, Smile, Edit2, Check, X, ChevronDown, 
  Settings, Save, Users 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Student = { 
  student_id: string; 
  student_name: string; 
  english_first_name: string; 
  birth_date: string; 
  gender: string; 
  campus: string; 
  status: string; 
  address: string | null; 
  use_bus: boolean | null; 
  pickup_lat: number | null; 
  pickup_lng: number | null; 
  dropoff_lat: number | null; 
  dropoff_lng: number | null; 
  pickup_address: string | null;
  dropoff_address: string | null;
  photo_url: string | null;
  commute_type: string | null;

  parent_name: string; 
  parent_phone: string; 

  class_id: string | null; 
  class_name: string | null; 
  class_sort_order: number | null; 
}; 

export default function ChildPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isSiblingDropdownOpen, setIsSiblingDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State (for current student)
  const [formData, setFormData] = useState<{
    address: string;
    phone: string;
    birthDate: string;
    gender: string;
    commuteType: string;
    pickupLat: string;
    pickupLng: string;
    pickupAddress: string;
    dropoffLat: string;
    dropoffLng: string;
    dropoffAddress: string;
  }>({
    address: "",
    phone: "",
    birthDate: "",
    gender: "",
    commuteType: "",
    pickupLat: "",
    pickupLng: "",
    pickupAddress: "",
    dropoffLat: "",
    dropoffLng: "",
    dropoffAddress: "",
  });

  // Derived Current Student
  const [isSaving, setIsSaving] = useState(false);

  const getDisplayClass = (className?: string | null) => {
    return className && className.trim() ? className : "반 배정 중";
  };

  const currentStudent = useMemo(() => 
    students.find(s => s.student_id === currentStudentId) || null
  , [students, currentStudentId]);

  // Fetch Data
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/portal");
          return;
        }

        // Use v_students_full VIEW as the single source of truth
        const { data: studentRows } = await supabase
          .from("v_students_full")
          .select("*")
          .eq("parent_auth_user_id", user.id)
          .order("student_id", { ascending: true });

        if (studentRows && studentRows.length > 0) {
          const mapped: Student[] = studentRows.map(s => ({
            student_id: String(s.student_id),
            student_name: s.student_name || "",
            english_first_name: s.english_first_name || "",
            birth_date: s.birth_date || "",
            gender: s.gender || "",
            campus: s.campus || "",
            status: s.status || "",
            address: s.address,
            use_bus: s.use_bus,
            pickup_lat: s.pickup_lat,
            pickup_lng: s.pickup_lng,
            dropoff_lat: s.dropoff_lat,
            dropoff_lng: s.dropoff_lng,
            pickup_address: s.pickup_address || null,
            dropoff_address: s.dropoff_address || null,
            photo_url: s.photo_url || null,
            commute_type: s.commute_type || null,
            parent_name: s.parent_name || "",
            parent_phone: s.parent_phone || "",
            class_id: s.class_id ? String(s.class_id) : null,
            class_name: s.class_name || null,
            class_sort_order: s.class_sort_order || null
          }));
          setStudents(mapped);
          // Preserve selected child if possible
          setCurrentStudentId(prev => {
             const exists = mapped.find(s => s.student_id === prev);
             return exists ? prev : mapped[0].student_id;
          });
        } else {
            setStudents([]);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Sync Form with Current Student
  useEffect(() => {
    if (currentStudent) {
      setFormData({
        address: currentStudent.address || "",
        phone: currentStudent.parent_phone || "", // Mapping to parent_phone as per v_students_full
        birthDate: currentStudent.birth_date || "",
        gender: currentStudent.gender || "",
        commuteType: currentStudent.commute_type || (currentStudent.use_bus ? "bus" : "self"),
        pickupLat: currentStudent.pickup_lat ? String(currentStudent.pickup_lat) : "",
        pickupLng: currentStudent.pickup_lng ? String(currentStudent.pickup_lng) : "",
        pickupAddress: currentStudent.pickup_address || "",
        dropoffLat: currentStudent.dropoff_lat ? String(currentStudent.dropoff_lat) : "",
        dropoffLng: currentStudent.dropoff_lng ? String(currentStudent.dropoff_lng) : "",
        dropoffAddress: currentStudent.dropoff_address || "",
      });
    }
  }, [currentStudent]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStudentId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    const url = URL.createObjectURL(file);
    // Optimistic update
    setStudents(prev => prev.map(s => s.student_id === currentStudentId ? { ...s, photo_url: url } : s));

    try {
        // Upload logic would go here
    } catch (e) {}
  };

  const handleSave = async () => {
    if (!currentStudentId) return;
    setSaving(true);
    try {
      // UPDATE still targets the 'students' table directly
      const { error } = await supabase
        .from("students")
        .update({
          address: formData.address,
          // phone: formData.phone, // Update logic for parent_phone or student_phone as needed
          pickup_lat: formData.pickupLat ? parseFloat(formData.pickupLat) : null,
          pickup_lng: formData.pickupLng ? parseFloat(formData.pickupLng) : null,
          pickup_address: formData.pickupAddress || null,
          dropoff_lat: formData.dropoffLat ? parseFloat(formData.dropoffLat) : null,
          dropoff_lng: formData.dropoffLng ? parseFloat(formData.dropoffLng) : null,
          dropoff_address: formData.dropoffAddress || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", Number(currentStudentId));

      if (error) throw error;
      
      alert("저장되었습니다.");
      
      // Update local state
      setStudents(prev => prev.map(s => s.student_id === currentStudentId ? {
        ...s,
        address: formData.address,
        pickup_lat: formData.pickupLat ? parseFloat(formData.pickupLat) : null,
        pickup_lng: formData.pickupLng ? parseFloat(formData.pickupLng) : null,
        pickup_address: formData.pickupAddress || null,
        dropoff_lat: formData.dropoffLat ? parseFloat(formData.dropoffLat) : null,
        dropoff_lng: formData.dropoffLng ? parseFloat(formData.dropoffLng) : null,
        dropoff_address: formData.dropoffAddress || null,
      } : s));
      
    } catch (e) {
      console.error(e);
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>;
  
  if (students.length === 0) {
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 lg:pb-10">
            <PortalHeader />
            <main className="max-w-3xl mx-auto px-6 py-20 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">현재 반 배정이 진행 중입니다.</h2>
                <p className="text-slate-500 text-sm">
                    자녀 정보가 확인되지 않을 경우 학원으로 문의해주세요.
                </p>
            </main>
        </div>
    );
  }

  if (!currentStudent) return null;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32 lg:pb-10">
      <PortalHeader />
      
      <main className="max-w-3xl mx-auto md:px-6 md:py-8">
        
        {/* Child Context Header */}
        <div className="bg-white md:rounded-3xl shadow-sm border-b md:border border-slate-200 overflow-visible relative z-10">
          <div className="p-6 pb-8 bg-frage-navy text-white md:rounded-t-3xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none"></div>
             
             <div className="relative flex flex-col items-center">
                {/* Sibling Switcher */}
                <div className="relative mb-6">
                    <button 
                        onClick={() => setIsSiblingDropdownOpen(!isSiblingDropdownOpen)}
                        className="flex items-center gap-2 text-2xl font-black hover:opacity-90 transition-opacity"
                    >
                        {currentStudent.student_name} <span className="text-white/50 text-lg font-normal">({currentStudent.english_first_name})</span>
                        <ChevronDown className={`w-6 h-6 text-white/50 transition-transform ${isSiblingDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {isSiblingDropdownOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 text-slate-900 z-50 animate-fade-in-up">
                            <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50 mb-1">
                                자녀 선택
                            </div>
                            {students.map(s => (
                                <button
                                    key={s.student_id}
                                    onClick={() => {
                                        setCurrentStudentId(s.student_id);
                                        setIsSiblingDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 flex items-center justify-between ${s.student_id === currentStudentId ? "text-frage-blue bg-blue-50" : ""}`}
                                >
                                    <span>{s.student_name} ({s.english_first_name})</span>
                                    {s.student_id === currentStudentId && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status Badge - Removed Status Text as requested */}
                <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10 mb-6">
                    <span>FRAGE {currentStudent.campus} · {getDisplayClass(currentStudent.class_name)}</span>
                 </div>

                {/* Profile Photo */}
                <div className="relative group">
                    <div className="w-28 h-28 rounded-full border-4 border-white/20 shadow-xl overflow-hidden bg-slate-800 relative">
                        {currentStudent.photo_url ? (
                            <img src={currentStudent.photo_url} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white/30">
                                {currentStudent.english_first_name.charAt(0)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full text-frage-navy flex items-center justify-center shadow-lg hover:bg-slate-100 transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
             </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="bg-white md:rounded-b-3xl shadow-sm border-x border-b border-slate-200 p-6 md:p-8 space-y-10">
            
            {/* 1. Basic Info */}
            <section>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                        <User className="w-3.5 h-3.5" />
                    </div>
                    기본 정보
                </h3>
                <div className="space-y-4 pl-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5">생년월일</label>
                            <div className="text-sm font-bold text-slate-900 border-b border-slate-100 py-2 bg-slate-50/50 px-1 rounded-sm">
                                {formData.birthDate || "-"}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">* 행정 정보로 수정이 불가능합니다.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5">성별</label>
                            <div className="text-sm font-bold text-slate-900 border-b border-slate-100 py-2 bg-slate-50/50 px-1 rounded-sm">
                                {formData.gender === 'M' ? "남 (Male)" : formData.gender === 'F' ? "여 (Female)" : "-"}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">* 행정 정보로 수정이 불가능합니다.</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">주소</label>
                        <input 
                            type="text" 
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            placeholder="주소를 입력해주세요"
                            className="w-full text-sm font-bold text-slate-900 border-b border-slate-200 py-2 focus:outline-none focus:border-frage-blue bg-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-1.5">학부모 연락처</label>
                        <input 
                            type="tel" 
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            placeholder="010-0000-0000"
                            className="w-full text-sm font-bold text-slate-900 border-b border-slate-200 py-2 focus:outline-none focus:border-frage-blue bg-transparent"
                        />
                    </div>
                </div>
            </section>

            <div className="h-px bg-slate-100" />

            {/* 2. School Info (Read Only) */}
            <section>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                        <School className="w-3.5 h-3.5" />
                    </div>
                    수업 정보
                </h3>
                <div className="grid grid-cols-2 gap-4 pl-2">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <span className="text-xs text-slate-400 font-bold block mb-1">Campus</span>
                        <span className="text-sm font-bold text-slate-900">{currentStudent.campus}</span>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <span className="text-xs text-slate-400 font-bold block mb-1">Class</span>
                        <span className="text-sm font-bold text-slate-900">{getDisplayClass(currentStudent.class_name)}</span>
                    </div>
                </div>
            </section>

            <div className="h-px bg-slate-100" />

            {/* 3. Commute Info */}
            <section>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
                        <Clock className="w-3.5 h-3.5" />
                    </div>
                    등·하원 방식
                </h3>
                <div className="space-y-4 pl-2">
                     <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm font-bold text-slate-600">등하원 방식</span>
                        <span className="text-sm font-bold text-slate-900">
                            {formData.commuteType === "pickup" ? "Pickup" : 
                             formData.commuteType === "walk" ? "Walk" : 
                             formData.commuteType === "bus" ? "셔틀 버스" : "미지정"}
                        </span>
                     </div>
                </div>
            </section>

            <div className="h-px bg-slate-100" />

            {/* 4. Guardian Info (Read Only from Parent Table) */}
             <section>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                        <Shield className="w-3.5 h-3.5" />
                    </div>
                    보호자 정보
                </h3>
                <div className="pl-2">
                    <p className="text-sm text-slate-600 font-medium">
                        계정 정보와 연동되어 있습니다.
                    </p>
                </div>
            </section>
            
        </div>

        {/* Save Button */}
        <div className="mt-8 px-4 md:px-0">
            <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-frage-navy text-white font-bold text-lg py-4 rounded-2xl shadow-lg shadow-frage-navy/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? "저장 중..." : "변경사항 저장"}
            </button>
        </div>

      </main>
    </div>
  );
}

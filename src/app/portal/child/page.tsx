"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PortalHeader from "@/components/PortalHeader";
import { User, MapPin, School, Bus, Clock, Shield, Bell, Info, Camera, Calendar, Phone, Home, Smile, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ChildPage() {
  // Mock Data
  const [isEditing, setIsEditing] = useState(false);
  const [studentProfile, setStudentProfile] = useState({
    name: { en: "", ko: "" },
    photoUrl: "",
    class: "",
    campus: "",
    teacher: "",
    birthDate: "",
    gender: "",
    address: "",
    studentPhone: ""
  });

  // Temporary state for editing
  const [editForm, setEditForm] = useState(studentProfile);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isValidType = ["image/jpeg", "image/png"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024;
      if (!isValidType) {
        alert("JPEG 또는 PNG 형식의 이미지만 업로드할 수 있습니다.");
        return;
      }
      if (!isValidSize) {
        alert("이미지 파일 크기는 최대 5MB까지 가능합니다.");
        return;
      }
      const url = URL.createObjectURL(file);
      setStudentProfile(prev => ({ ...prev, photoUrl: url }));
      setEditForm(prev => ({ ...prev, photoUrl: url }));
      try {
        const accountId = userId || "";
        if (accountId) {
          const key = `portal_parent_photos_${accountId}`;
          const raw = localStorage.getItem(key);
          const arr = raw ? JSON.parse(raw) : [];
          const next = Array.isArray(arr) ? [url, ...arr].slice(0, 30) : [url];
          localStorage.setItem(key, JSON.stringify(next));
        }
      } catch (e) {}
    }
  };

  const startEditing = () => {
    setEditForm(studentProfile);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(studentProfile);
  };

  const saveEditing = () => {
    setStudentProfile(editForm);
    setIsEditing(false);
    // Here you would typically send an API request to update the data
    alert("정보가 수정되었습니다.");
  };

  const [transportForm, setTransportForm] = useState({
    arrivalMethod: "shuttle" as "shuttle" | "self" | "guardian",
    pickupPlace: "",
    departureMethod: "shuttle" as "shuttle" | "self" | "guardian",
    dropoffPlace: "",
    pickupVerified: false,
    dropoffVerified: false,
    defaultDepartureTime: "16:30"
  });

  const [guardianInfo, setGuardianInfo] = useState({
    name: "보호자",
    accountId: "",
    notifications: true
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          return;
        }
        setUserId(user.id);
        const { data: rows } = await supabase
          .from("parents")
          .select("*")
          .eq("auth_user_id", user.id)
          .limit(1);
        const parent = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        const parentName = String(parent?.name || "보호자");
        setGuardianInfo(prev => ({
          ...prev,
          name: parentName,
          accountId: user.id,
        }));
      } catch (e) {}
    })();
    const savedTransport = localStorage.getItem("child_transport");
    if (savedTransport) {
      const t = JSON.parse(savedTransport);
      setTransportForm(prev => ({
        ...prev,
        arrivalMethod: t.arrivalMethod || prev.arrivalMethod,
        pickupPlace: t.pickupPlace || "",
        pickupVerified: !!t.pickupVerified,
        departureMethod: t.departureMethod || prev.departureMethod,
        dropoffPlace: t.dropoffPlace || "",
        dropoffVerified: !!t.dropoffVerified,
        defaultDepartureTime: t.defaultDepartureTime || prev.defaultDepartureTime
      }));
    }
  }, []);

  const canSubmitTransport = !!transportForm.arrivalMethod && !!transportForm.departureMethod;

  const handleTransportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitTransport) return;
    try {
      localStorage.setItem("child_transport", JSON.stringify(transportForm));
      localStorage.setItem("needs_child_setup", "false");
    } catch (e) {}
    alert("자녀 등·하원/차량 정보가 저장되었습니다.");
    router.push("/portal/home");
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 py-8 max-w-xl mx-auto space-y-8">
        
        {/* 1. Student Profile Card */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-24 bg-frage-navy/5"></div>
           <div className="relative flex flex-col items-center">
              
              {/* Photo Upload Area */}
              <div className="relative group cursor-pointer" onClick={handlePhotoClick}>
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-200 mb-4 relative">
                  {(isEditing ? editForm.photoUrl : studentProfile.photoUrl)
                    ? ((isEditing ? editForm.photoUrl : studentProfile.photoUrl).startsWith("blob:")
                        ? (
                          <img
                            src={isEditing ? editForm.photoUrl : studentProfile.photoUrl}
                            alt={studentProfile.name.en || studentProfile.name.ko || "학생"}
                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                          />
                        ) : (
                          <Image
                            src={isEditing ? editForm.photoUrl : studentProfile.photoUrl}
                            alt={studentProfile.name.en || studentProfile.name.ko || "학생"}
                            width={96}
                            height={96}
                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                          />
                        ))
                    : (
                      <div className="w-full h-full flex items-center justify-center bg-frage-blue text-white text-lg font-bold">
                        {(() => {
                          const en = String(studentProfile.name.en || "").trim();
                          const ko = String(studentProfile.name.ko || "").trim();
                          if (en) {
                            const parts = en.split(/\s+/);
                            const a = parts[0]?.[0] || "";
                            const b = parts[1]?.[0] || "";
                            return (a + b).toUpperCase() || a.toUpperCase() || "S";
                          }
                          return ko.slice(0, 2) || "학생";
                        })()}
                      </div>
                    )
                  }
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-100 text-frage-blue">
                   <Camera className="w-4 h-4" />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
              </div>
              
              <h1 className="text-2xl font-bold text-frage-navy mb-1">
                {studentProfile.name.en}
              </h1>
              <p className="text-slate-500 font-medium mb-6">
                {studentProfile.name.ko}
              </p>

              <div className="w-full space-y-4">
                 {/* Basic Info Grid (Read-only) */}
                 <div className="grid gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-600">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-frage-blue shadow-sm">
                              <School className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-bold">Class</span>
                        </div>
                        <span className="font-bold text-slate-900">{studentProfile.class}</span>
                     </div>
                     
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-600">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-frage-blue shadow-sm">
                              <MapPin className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-bold">Campus</span>
                        </div>
                        <span className="font-bold text-slate-900">{studentProfile.campus}</span>
                     </div>

                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-600">
                           <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-frage-blue shadow-sm">
                              <User className="w-4 h-4" />
                           </div>
                           <span className="text-sm font-bold">Teacher</span>
                        </div>
                        <span className="font-bold text-slate-900">{studentProfile.teacher}</span>
                     </div>
                 </div>

                 {/* Detailed Info (Editable) */}
                 <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4 relative">
                     <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Details</h3>
                        {!isEditing ? (
                          <button 
                            onClick={startEditing}
                            className="text-xs font-bold text-frage-blue flex items-center gap-1 hover:underline"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={saveEditing}
                              className="text-xs font-bold text-green-600 flex items-center gap-1 hover:underline bg-green-50 px-2 py-1 rounded"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button 
                              onClick={cancelEditing}
                              className="text-xs font-bold text-red-500 flex items-center gap-1 hover:underline bg-red-50 px-2 py-1 rounded"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        )}
                     </div>
                     
                     <div className="space-y-4">
                       <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Date of Birth</span>
                          {isEditing ? (
                            <input 
                              type="date"
                              className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-frage-blue"
                              value={editForm.birthDate}
                              onChange={(e) => setEditForm({...editForm, birthDate: e.target.value})}
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-800">{studentProfile.birthDate}</span>
                          )}
                       </div>
                       
                       <div className="flex items-center gap-3">
                          <Smile className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Gender</span>
                          {isEditing ? (
                            <select 
                              className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-frage-blue"
                              value={editForm.gender}
                              onChange={(e) => setEditForm({...editForm, gender: e.target.value})}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          ) : (
                            <span className="text-sm font-bold text-slate-800">{studentProfile.gender}</span>
                          )}
                       </div>

                       <div className="flex items-center gap-3">
                          <Home className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Address</span>
                          {isEditing ? (
                            <input 
                              type="text"
                              className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-frage-blue"
                              value={editForm.address}
                              onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-800 flex-1 truncate">{studentProfile.address}</span>
                          )}
                       </div>

                       <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-600 w-24 flex-shrink-0">Phone</span>
                          {isEditing ? (
                            <input 
                              type="tel"
                              className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-frage-blue"
                              value={editForm.studentPhone}
                              onChange={(e) => setEditForm({...editForm, studentPhone: e.target.value})}
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-800 flex-1">{studentProfile.studentPhone}</span>
                          )}
                       </div>
                     </div>
                 </div>
              </div>
           </div>
        </section>

        {/* 2. Transport Info */}
        <section>
           <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 px-1">
              <Bus className="w-5 h-5 text-frage-yellow" />
              등·하원 / 차량 정보
           </h2>
           <form onSubmit={handleTransportSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                 <label className="block text-sm font-bold text-slate-600 mb-2">등원 방법</label>
                <select
                  required
                  value={transportForm.arrivalMethod}
                  onChange={(e) => setTransportForm({ ...transportForm, arrivalMethod: e.target.value as "shuttle" | "self" | "guardian" })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-frage-blue bg-white"
                >
                  <option value="shuttle">셔틀 버스</option>
                  <option value="guardian">보호자 등원</option>
                  <option value="self">자가 등원</option>
                </select>
               </div>
               <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">등원 장소</label>
                <input
                  type="text"
                  value={transportForm.pickupPlace}
                  onChange={(e) => setTransportForm({ ...transportForm, pickupPlace: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none ${transportForm.arrivalMethod === "self" ? "border-slate-200 bg-slate-100 cursor-not-allowed" : "border-slate-200 focus:border-frage-blue"}`}
                  placeholder="예: 수성구 ○○아파트 정문"
                  disabled={transportForm.arrivalMethod === "self"}
                />
                <div className="mt-2">
                  {transportForm.arrivalMethod !== "self" && transportForm.pickupPlace.trim() && (
                    <span className="text-xs text-slate-600">정차 지점은 배정 후 안내드립니다</span>
                  )}
                </div>
               </div>
               <div>
                 <label className="block text-sm font-bold text-slate-600 mb-2">하원 방법</label>
                <select
                  required
                  value={transportForm.departureMethod}
                  onChange={(e) => setTransportForm({ ...transportForm, departureMethod: e.target.value as "shuttle" | "self" | "guardian" })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-frage-blue bg-white"
                >
                  <option value="shuttle">셔틀 버스</option>
                  <option value="guardian">보호자 하원</option>
                  <option value="self">자가 하원</option>
                </select>
               </div>
               <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">하원 장소</label>
                <input
                  type="text"
                  value={transportForm.dropoffPlace}
                  onChange={(e) => setTransportForm({ ...transportForm, dropoffPlace: e.target.value })}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none ${transportForm.departureMethod === "self" ? "border-slate-200 bg-slate-100 cursor-not-allowed" : "border-slate-200 focus:border-frage-blue"}`}
                  placeholder="예: 수성구 ○○아파트 후문"
                  disabled={transportForm.departureMethod === "self"}
                />
                <div className="mt-2">
                  {transportForm.departureMethod !== "self" && transportForm.dropoffPlace.trim() && (
                    <span className="text-xs text-slate-600">정차 지점은 배정 후 안내드립니다</span>
                  )}
                </div>
               </div>
             </div>
             <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
               <span className="text-sm text-slate-600 font-bold flex items-center gap-2">
                 <Clock className="w-4 h-4" /> 기본 하원 시간
               </span>
               <input
                 type="time"
                 value={transportForm.defaultDepartureTime}
                 onChange={(e) => setTransportForm({ ...transportForm, defaultDepartureTime: e.target.value })}
                 className="text-frage-navy font-bold bg-yellow-50 px-2 py-1 rounded border border-yellow-100 text-sm"
               />
             </div>
             <button
               type="submit"
               disabled={!canSubmitTransport}
               className="w-full md:w-auto px-5 py-3 bg-frage-navy text-white rounded-xl font-bold hover:bg-frage-blue transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
               정보 저장 및 다음 단계로 이동
             </button>
           </form>
        </section>

        {/* 3. Guardian Info */}
        <section>
           <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2 px-1">
              <Shield className="w-5 h-5 text-frage-green" />
              보호자 계정 정보
           </h2>
           <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-slate-900">{guardianInfo.name}</h3>
                 </div>
              </div>
              
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
             <div className="flex items-center gap-2 text-slate-600">
                <User className="w-4 h-4" />
                <span className="text-sm font-bold">보호자 아이디</span>
                <span className="ml-auto text-sm font-bold text-slate-800">{guardianInfo.accountId || "미설정"}</span>
             </div>
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-slate-600">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-bold">알림 수신 (Notifications)</span>
               </div>
                   <div className={`px-3 py-1 rounded-full text-xs font-bold ${guardianInfo.notifications ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                      {guardianInfo.notifications ? "ON" : "OFF"}
                   </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Footer Notice */}
        <div className="text-center space-y-2 py-4">
           <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-frage-blue mb-2">
              <Info className="w-5 h-5" />
           </div>
           <p className="text-xs text-slate-400 leading-relaxed">
              This information is managed by FRAGE.<br/>
              If you notice anything incorrect, please contact the office.
           </p>
        </div>

      </main>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PortalHeader from "@/components/PortalHeader";
import { User, MapPin, School, Bus, Clock, Shield, Bell, Info, Camera, Calendar, Phone, Home, Smile, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    kakao: any;
  }
}

const KAKAO_MAP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

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
  const [studentId, setStudentId] = useState<string>("");

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
      (async () => {
        try {
          if (studentId) {
            await supabase
              .from("students")
              .update({ photo_url: url })
              .eq("id", Number(studentId));
          }
        } catch (e) {}
      })();
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
    arrivalMethod: "shuttle" as "shuttle" | "self" | "academy",
    pickupPlace: "",
    departureMethod: "shuttle" as "shuttle" | "self" | "academy",
    dropoffPlace: "",
    pickupVerified: false,
    dropoffVerified: false,
    defaultDepartureTime: "16:30"
  });
  const [pickupCoord, setPickupCoord] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });
  const [dropoffCoord, setDropoffCoord] = useState<{ lat: string; lng: string }>({ lat: "", lng: "" });

  const [mapOpen, setMapOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState<"pickup" | "dropoff">("pickup");

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
        const parentId = parent ? String(parent.id) : null;
        if (!parentId) {
          return;
        }
        const { data: studentRows } = await supabase
          .from("v_students_full")
          .select(
            "id,student_name,english_first_name,class_name,campus,birth_date,gender,address,student_phone,photo_url"
          )
          .eq("parent_id", parentId)
          .limit(1);
        const s = Array.isArray(studentRows) && studentRows.length > 0 ? studentRows[0] : null;
        if (s) {
          const numericId =
            typeof s.id === "number" ? s.id : Number.parseInt(String(s.id), 10);
          const studentIdStr = numericId && !Number.isNaN(numericId) ? String(numericId) : "";
          if (!studentIdStr) {
            return;
          }
          setStudentId(studentIdStr);
          setStudentProfile({
            name: { en: String(s.english_first_name || ""), ko: String(s.student_name || "") },
            photoUrl: String(s.photo_url || ""),
            class: String(s.class_name || ""),
            campus: String(s.campus || ""),
            teacher: "",
            birthDate: String(s.birth_date || ""),
            gender: String(s.gender || ""),
            address: String(s.address || ""),
            studentPhone: String(s.student_phone || ""),
          });
          setEditForm({
            name: { en: String(s.english_first_name || ""), ko: String(s.student_name || "") },
            photoUrl: String(s.photo_url || ""),
            class: String(s.class_name || ""),
            campus: String(s.campus || ""),
            teacher: "",
            birthDate: String(s.birth_date || ""),
            gender: String(s.gender || ""),
            address: String(s.address || ""),
            studentPhone: String(s.student_phone || ""),
          });
          const { data: loc } = await supabase
            .from("students")
            .select(
              "pickup_method,pickup_lat,pickup_lng,pickup_address,dropoff_method,dropoff_lat,dropoff_lng,dropoff_address,default_dropoff_time"
            )
            .eq("id", numericId)
            .maybeSingle();
          if (loc) {
            setPickupCoord({
              lat: loc.pickup_lat ? String(loc.pickup_lat) : "",
              lng: loc.pickup_lng ? String(loc.pickup_lng) : "",
            });
            setDropoffCoord({
              lat: loc.dropoff_lat ? String(loc.dropoff_lat) : "",
              lng: loc.dropoff_lng ? String(loc.dropoff_lng) : "",
            });
            setTransportForm(prev => ({
              ...prev,
              arrivalMethod: (loc.pickup_method as any) || prev.arrivalMethod,
              departureMethod: (loc.dropoff_method as any) || prev.departureMethod,
              pickupPlace: loc.pickup_address || prev.pickupPlace,
              dropoffPlace: loc.dropoff_address || prev.dropoffPlace,
              defaultDepartureTime: loc.default_dropoff_time || prev.defaultDepartureTime,
            }));
          }
        }
      } catch (e) {}
    })();
  }, []);

  const canSubmitTransport = !!transportForm.arrivalMethod && !!transportForm.departureMethod;

  const handleTransportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitTransport) return;
    (async () => {
      try {
        await supabase.from("portal_requests").insert({
          child_id: studentId || null,
          child_name: studentProfile.name.ko || studentProfile.name.en || "학생",
          campus: studentProfile.campus || null,
          type: "bus_change",
          change_type: null,
          note: `등원:${transportForm.arrivalMethod}(${transportForm.pickupPlace || "-"}) / 하원:${transportForm.departureMethod}(${transportForm.dropoffPlace || "-"})`,
          created_at: new Date().toISOString(),
        });
        alert("자녀 등·하원/차량 요청이 저장되었습니다.");
        router.push("/portal/home");
      } catch (e) {}
    })();
  };

  const setPickupCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("브라우저에서 위치 기능을 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPickupCoord({ lat: String(latitude), lng: String(longitude) });
      },
      () => alert("현재 위치를 가져오지 못했습니다. 위치 권한을 확인하세요.")
    );
  };

  const setDropoffCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("브라우저에서 위치 기능을 지원하지 않습니다.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDropoffCoord({ lat: String(latitude), lng: String(longitude) });
      },
      () => alert("현재 위치를 가져오지 못했습니다. 위치 권한을 확인하세요.")
    );
  };

  const openMap = (target: "pickup" | "dropoff") => {
    setMapTarget(target);
    setMapOpen(true);
  };

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    if (mapTarget === "pickup") {
      setPickupCoord({ lat: String(lat), lng: String(lng) });
      setTransportForm(prev => ({
        ...prev,
        pickupPlace: prev.pickupPlace || address,
      }));
    } else {
      setDropoffCoord({ lat: String(lat), lng: String(lng) });
      setTransportForm(prev => ({
        ...prev,
        dropoffPlace: prev.dropoffPlace || address,
      }));
    }
    setMapOpen(false);
  };

  const savePickupDropoff = async () => {
    if (!studentId) return;
    const latP = parseFloat(pickupCoord.lat);
    const lngP = parseFloat(pickupCoord.lng);
    const latD = parseFloat(dropoffCoord.lat);
    const lngD = parseFloat(dropoffCoord.lng);
    if (Number.isNaN(latP) || Number.isNaN(lngP) || Number.isNaN(latD) || Number.isNaN(lngD)) {
      alert("좌표를 올바르게 입력해 주세요.");
      return;
    }
    await supabase
      .from("students")
      .update({
        pickup_lat: latP,
        pickup_lng: lngP,
        dropoff_lat: latD,
        dropoff_lng: lngD,
        updated_at: new Date().toISOString(),
      })
      .eq("id", Number(studentId));
    alert("위치 정보가 저장되었습니다.");
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
                  onChange={(e) => setTransportForm({ ...transportForm, arrivalMethod: e.target.value as "shuttle" | "self" | "academy" })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-frage-blue bg-white"
                >
                  <option value="shuttle">셔틀 버스</option>
                  <option value="self">자가 등원</option>
                  <option value="academy">타학원 등원</option>
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
                  onChange={(e) => setTransportForm({ ...transportForm, departureMethod: e.target.value as "shuttle" | "self" | "academy" })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-frage-blue bg-white"
                >
                  <option value="shuttle">셔틀 버스</option>
                  <option value="self">자가 하원</option>
                  <option value="academy">타학원 하원</option>
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
          <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-sm font-bold text-slate-700">픽업/드롭오프 좌표 설정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500">픽업 좌표</div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                   <input
                     placeholder="위도"
                     value={pickupCoord.lat}
                     onChange={(e) => setPickupCoord({ ...pickupCoord, lat: e.target.value })}
                     className="border border-slate-200 rounded px-2 py-2 text-sm bg-white w-full"
                   />
                   <input
                     placeholder="경도"
                     value={pickupCoord.lng}
                     onChange={(e) => setPickupCoord({ ...pickupCoord, lng: e.target.value })}
                     className="border border-slate-200 rounded px-2 py-2 text-sm bg-white w-full"
                   />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   <button
                     type="button"
                     onClick={setPickupCurrentLocation}
                     className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                   >
                     현재 위치로 설정
                   </button>
                   <button
                     type="button"
                     onClick={() => openMap("pickup")}
                     className="px-3 py-2 rounded-lg border border-frage-blue text-xs font-bold text-frage-blue bg-white"
                   >
                     지도에서 선택
                   </button>
                 </div>
                 {pickupCoord.lat && pickupCoord.lng && (
                   <iframe
                     title="pickup-map"
                     className="w-full h-40 rounded-lg border border-slate-200"
                     src={`https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${pickupCoord.lat},${pickupCoord.lng}`}
                   />
                 )}
               </div>
              <div className="space-y-2">
                 <div className="text-xs font-bold text-slate-500">드롭오프 좌표</div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                   <input
                     placeholder="위도"
                     value={dropoffCoord.lat}
                     onChange={(e) => setDropoffCoord({ ...dropoffCoord, lat: e.target.value })}
                     className="border border-slate-200 rounded px-2 py-2 text-sm bg-white w-full"
                   />
                   <input
                     placeholder="경도"
                     value={dropoffCoord.lng}
                     onChange={(e) => setDropoffCoord({ ...dropoffCoord, lng: e.target.value })}
                     className="border border-slate-200 rounded px-2 py-2 text-sm bg-white w-full"
                   />
                 </div>
                 <div className="flex flex-wrap gap-2">
                   <button
                     type="button"
                     onClick={setDropoffCurrentLocation}
                     className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold bg-white"
                   >
                     현재 위치로 설정
                   </button>
                   <button
                     type="button"
                     onClick={() => openMap("dropoff")}
                     className="px-3 py-2 rounded-lg border border-frage-blue text-xs font-bold text-frage-blue bg-white"
                   >
                     지도에서 선택
                   </button>
                 </div>
                 {dropoffCoord.lat && dropoffCoord.lng && (
                   <iframe
                     title="dropoff-map"
                     className="w-full h-40 rounded-lg border border-slate-200"
                     src={`https://www.openstreetmap.org/export/embed.html?layer=mapnik&marker=${dropoffCoord.lat},${dropoffCoord.lng}`}
                   />
                 )}
               </div>
             </div>
            <div className="flex justify-end">
              <button onClick={savePickupDropoff} className="px-4 py-2 bg-frage-navy text-white rounded-xl font-bold">좌표 저장</button>
            </div>
          </div>
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
      {mapOpen && (
        <ChildMapModal
          target={mapTarget}
          initialLat={
            mapTarget === "pickup"
              ? pickupCoord.lat
                ? parseFloat(pickupCoord.lat)
                : dropoffCoord.lat
                ? parseFloat(dropoffCoord.lat)
                : null
              : dropoffCoord.lat
              ? parseFloat(dropoffCoord.lat)
              : pickupCoord.lat
              ? parseFloat(pickupCoord.lat)
              : null
          }
          initialLng={
            mapTarget === "pickup"
              ? pickupCoord.lng
                ? parseFloat(pickupCoord.lng)
                : dropoffCoord.lng
                ? parseFloat(dropoffCoord.lng)
                : null
              : dropoffCoord.lng
              ? parseFloat(dropoffCoord.lng)
              : pickupCoord.lng
              ? parseFloat(pickupCoord.lng)
              : null
          }
          onSelect={handleMapSelect}
          onClose={() => setMapOpen(false)}
        />
      )}
    </div>
  );
}

type ChildMapModalProps = {
  target: "pickup" | "dropoff";
  initialLat: number | null;
  initialLng: number | null;
  onSelect: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
};

function ChildMapModal({ target, initialLat, initialLng, onSelect, onClose }: ChildMapModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(initialLat);
  const [currentLng, setCurrentLng] = useState<number | null>(initialLng);
  const [currentAddress, setCurrentAddress] = useState<string>("");

  useEffect(() => {
    const ensureScript = () =>
      new Promise<void>((resolve, reject) => {
        if (typeof window === "undefined") {
          reject();
          return;
        }
        if (window.kakao && window.kakao.maps) {
          resolve();
          return;
        }
        if (!KAKAO_MAP_KEY) {
          reject();
          return;
        }
        const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-map="true"]');
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject());
          return;
        }
        const script = document.createElement("script");
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&libraries=services&autoload=false`;
        script.async = true;
        script.defer = true;
        script.dataset.kakaoMap = "true";
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.head.appendChild(script);
      });

    ensureScript()
      .then(() => {
        if (!window.kakao || !window.kakao.maps) {
          return;
        }
        window.kakao.maps.load(() => {
          if (!containerRef.current) return;
          const centerLat = initialLat ?? 35.857;
          const centerLng = initialLng ?? 128.626;
          const center = new window.kakao.maps.LatLng(centerLat, centerLng);
          const options = {
            center,
            level: 3,
          };
          const map = new window.kakao.maps.Map(containerRef.current, options);
          const geocoder = new window.kakao.maps.services.Geocoder();

          const updateCenter = () => {
            const c = map.getCenter();
            const lat = c.getLat();
            const lng = c.getLng();
            setCurrentLat(lat);
            setCurrentLng(lng);
            geocoder.coord2Address(lng, lat, (result: any, status: any) => {
              if (status === window.kakao.maps.services.Status.OK && result[0]?.address) {
                setCurrentAddress(result[0].address.address_name);
              }
            });
          };

          updateCenter();
          window.kakao.maps.event.addListener(map, "center_changed", updateCenter);
          setReady(true);
        });
      })
      .catch(() => {
        setReady(false);
      });
  }, [initialLat, initialLng]);

  const handleConfirm = useCallback(() => {
    if (!currentLat || !currentLng || !currentAddress) return;
    onSelect(currentLat, currentLng, currentAddress);
  }, [currentLat, currentLng, currentAddress, onSelect]);

  const title = target === "pickup" ? "픽업 위치 설정" : "하원 위치 설정";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch justify-center">
      <div className="relative bg-white w-full h-full max-w-md mx-auto flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            닫기
          </button>
        </div>
        <div className="flex-1 relative">
          <div ref={containerRef} className="w-full h-full" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-red-500 bg-red-500/80 shadow-lg -translate-y-4" />
          </div>
        </div>
        <div className="border-t border-slate-200 p-4 space-y-2 bg-white">
          <div className="text-xs text-slate-600 min-h-[32px]">
            {ready ? currentAddress || "지도를 움직여 위치를 선택해 주세요." : "지도를 불러오는 중입니다..."}
          </div>
          <button
            type="button"
            disabled={!ready || !currentLat || !currentLng || !currentAddress}
            onClick={handleConfirm}
            className="w-full px-4 py-3 rounded-xl bg-frage-navy text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이 위치로 설정
          </button>
        </div>
      </div>
    </div>
  );
}

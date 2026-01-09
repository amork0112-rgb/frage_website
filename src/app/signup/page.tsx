"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Check, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    daum: any;
  }
}

export default function SignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    passportEnglishName: "",
    englishFirstName: "",
    childBirthDate: "",
    studentName: "",
    gender: "",
    parentName: "",
    phone: "",
    id: "",
    password: "",
    address: "",
    addressDetail: "",
    privacyAgreed: false,
    campus: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleAddressSearch = () => {
    if (!window.daum?.Postcode) {
      alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: function(data: any) {
        // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분.

        // 각 주소의 노출 규칙에 따라 주소를 조합한다.
        // 내려오는 변수가 값이 없는 경우엔 공백('')값을 가지므로, 이를 참고하여 분기 한다.
        let addr = ''; // 주소 변수
        let extraAddr = ''; // 참고항목 변수

        //사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다.
        if (data.userSelectedType === 'R') { // 사용자가 도로명 주소를 선택했을 경우
            addr = data.roadAddress;
        } else { // 사용자가 지번 주소를 선택했을 경우(J)
            addr = data.jibunAddress;
        }

        // 사용자가 선택한 주소가 도로명 타입일때 참고항목을 조합한다.
        if(data.userSelectedType === 'R'){
            // 법정동명이 있을 경우 추가한다. (법정리는 제외)
            // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다.
            if(data.bname !== '' && /[동|로|가]$/g.test(data.bname)){
                extraAddr += data.bname;
            }
            // 건물명이 있고, 공동주택일 경우 추가한다.
            if(data.buildingName !== '' && data.apartment === 'Y'){
                extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
            }
            // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다.
            if(extraAddr !== ''){
                extraAddr = ' (' + extraAddr + ')';
            }
        }

        // 주소 정보를 해당 필드에 넣는다.
        setFormData(prev => ({
          ...prev,
          address: addr + extraAddr,
          addressDetail: "" // 상세주소 초기화
        }));
        
        // 상세주소 포커싱 (선택적)
        document.getElementById("addressDetail")?.focus();
      }
    }).open();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.privacyAgreed) {
      alert("개인정보 처리방침에 동의해 주세요.");
      return;
    }

    // Field validations
    const passportOk = /^[A-Z][A-Z\s-]{0,49}$/.test(formData.passportEnglishName.trim());
    if (!passportOk) {
      alert("여권 영문명은 영문 대문자/공백/하이픈만 허용되며 최대 50자입니다.");
      return;
    }
    if (!formData.passportEnglishName.trim()) {
      alert("여권 영문명을 입력해 주세요.");
      return;
    }

    const firstOk = /^[A-Za-z][A-Za-z\s-]{0,29}$/.test(formData.englishFirstName.trim());
    if (!firstOk) {
      alert("영어 이름은 영문자/공백/하이픈만 허용되며 최대 30자입니다.");
      return;
    }
    if (!formData.englishFirstName.trim()) {
      alert("영어 이름을 입력해 주세요.");
      return;
    }

    const dob = new Date(formData.childBirthDate);
    const today = new Date();
    if (!formData.childBirthDate || Number.isNaN(dob.getTime()) || dob >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      alert("자녀 생년월일은 YYYY-MM-DD 형식이며, 반드시 과거 날짜여야 합니다.");
      return;
    }

    const koreanNameOk = /^[가-힣\\s]+$/.test(formData.studentName.trim());
    if (!koreanNameOk) {
      alert("한국 이름은 한글과 공백만 입력 가능합니다.");
      return;
    }
    if (formData.gender !== "M" && formData.gender !== "F") {
      alert("자녀 성별을 선택해 주세요.");
      return;
    }
    if (!formData.studentName.trim()) {
      alert("한국 이름을 입력해 주세요.");
      return;
    }

    const email = formData.id.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      alert("이메일 형식이 올바르지 않습니다.");
      return;
    }
    const pwOk = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,30}$/.test(formData.password.trim());
    if (!pwOk) {
      alert("비밀번호는 영문+숫자 조합 6~30자여야 합니다.");
      return;
    }

    if (!formData.campus) {
      alert("캠퍼스를 선택해 주세요.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    (async () => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: formData.password.trim(),
        });
        if (error) {
          const msg = error.message?.toLowerCase() || "";
          if (msg.includes("already") && msg.includes("registered")) {
            setErrorMessage("이미 가입된 이메일입니다. 다른 이메일로 가입하거나 로그인해 주세요.");
            alert("이미 가입된 이메일입니다.");
          } else if (msg.includes("password")) {
            setErrorMessage("비밀번호 정책 오류: 영문+숫자 6자 이상으로 설정해 주세요.");
            alert("비밀번호 정책 오류입니다.");
          } else {
            setErrorMessage(`인증 오류: ${error.message}`);
            alert(error.message);
          }
          setLoading(false);
          return;
        }
        const userId = data.user?.id;
        if (!userId) {
          setErrorMessage("인증 서버에서 사용자 정보를 받지 못했습니다. 잠시 후 다시 시도해 주세요.");
          alert("회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
          setLoading(false);
          return;
        }
        const now = new Date().toISOString();
        const { data: parentRow, error: dbError } = await supabase
          .from("parents")
          .insert({
            auth_user_id: userId,
            name: formData.parentName.trim(),
            phone: formData.phone.trim(),
            campus: formData.campus,
            created_at: now,
          })
          .select("id")
          .single();
        if (dbError || !parentRow?.id) {
          setErrorMessage(`회원 정보 저장 오류: ${dbError?.message || "보호자 정보 생성 실패"}`);
          alert("회원 정보 저장 중 오류가 발생했습니다.");
          setLoading(false);
          return;
        }

        const { error: draftErr } = await supabase
          .from("new_students")
          .insert({
            student_name: formData.studentName.trim(),
            gender: formData.gender,
            parent_name: formData.parentName.trim() || null,
            phone: formData.phone.trim(),
            campus: formData.campus || "전체",
            status: "draft",
            memo: null,
            created_by: userId,
            parent_id: parentRow.id,
          });
        if (draftErr) {
          console.error(draftErr);
          alert("신규 학생 임시 등록(draft) 생성 중 오류가 발생했습니다. 관리자에게 문의해 주세요.");
        }
        alert("회원가입이 완료되었습니다!");
        router.push("/portal/home");
      } catch (e: any) {
        const m = typeof e?.message === "string" ? e.message : "알 수 없는 오류가 발생했습니다.";
        setErrorMessage(`처리 오류: ${m}`);
        alert(m);
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-frage-cream">
      <Script 
        src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" 
        strategy="lazyOnload"
      />
      <Header />
      
      <main className="flex-grow pt-32 pb-20">
        <section className="container mx-auto px-6 max-w-xl">
          <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl border border-gray-100">
            <div className="text-center mb-10">
              <h1 className="font-serif text-3xl md:text-4xl text-frage-navy font-bold mb-4">
                회원가입
              </h1>
              <p className="text-frage-gray">
                필수 정보를 입력해 주세요.
              </p>
            </div>
            {errorMessage && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="id" className="block text-sm font-bold text-frage-navy mb-2">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="id"
                    name="id"
                    required
                    maxLength={100}
                    placeholder="you@example.com"
                    value={formData.id}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-bold text-frage-navy mb-2">
                    비밀번호 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    required
                    maxLength={30}
                    placeholder="영문+숫자 6~30자"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                  />
                </div>
              </div>

              {/* Campus Selection */}
              <div>
                <label htmlFor="campus" className="block text-sm font-bold text-frage-navy mb-2">
                  캠퍼스 선택 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    id="campus"
                    name="campus"
                    required
                    value={formData.campus}
                    onChange={(e) => handleChange(e as any)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                  >
                    <option value="">캠퍼스를 선택해주세요</option>
                    <option value="International">International</option>
                    <option value="Andover">Andover</option>
                    <option value="Platz">Platz</option>
                    <option value="Atheneum">Atheneum</option>
                  </select>
                  <p className="text-xs text-frage-gray">
                    캠퍼스를 모르시나요?{" "}
                    <Link href="/campuses" target="_blank" className="text-frage-blue font-bold underline hover:text-frage-navy transition-colors">
                      캠퍼스 안내 페이지로 이동하기
                    </Link>
                  </p>
                </div>
              </div>

              {/* Student Name */}
              <div>
                <label htmlFor="studentName" className="block text-sm font-bold text-frage-navy mb-2">
                  자녀 한국이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="studentName"
                  name="studentName"
                  required
                  value={formData.studentName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
              </div>

              {/* Passport English Name */}
              <div>
                <label htmlFor="passportEnglishName" className="block text-sm font-bold text-frage-navy mb-2">
                  자녀 영문명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="passportEnglishName"
                  name="passportEnglishName"
                  required
                  maxLength={50}
                  placeholder="MINSEO KIM"
                  value={formData.passportEnglishName}
                  onChange={(e) => setFormData(prev => ({ ...prev, passportEnglishName: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
                <p className="text-xs text-slate-500 mt-1">영문 대문자/공백/하이픈만 허용, 최대 50자</p>
              </div>

              {/* English First Name */}
              <div>
                <label htmlFor="englishFirstName" className="block text-sm font-bold text-frage-navy mb-2">
                  자녀 영어이름 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-slate-500">• 영어이름을 못정했다면 영어이름 추천가이드를 확인해보세요!</span>
                </label>
                <input
                  type="text"
                  id="englishFirstName"
                  name="englishFirstName"
                  required
                  maxLength={30}
                  placeholder="Minseo"
                  value={formData.englishFirstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
                <p className="text-xs text-slate-500 mt-1">영문자/공백/하이픈 허용, 최대 30자</p>
                <p className="text-xs mt-1">
                  <Link href="https://blog.naver.com/frage_2030/223271899974" target="_blank" className="text-xs text-frage-blue underline hover:text-frage-navy transition-colors">
                    영어 이름 추천 가이드 보기
                  </Link>
                </p>
              </div>

              {/* Child Birth Date */}
              <div>
                <label htmlFor="childBirthDate" className="block text-sm font-bold text-frage-navy mb-2">
                  자녀 생년월일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="childBirthDate"
                  name="childBirthDate"
                  required
                  value={formData.childBirthDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
                <p className="text-xs text-slate-500 mt-1">형식: YYYY-MM-DD, 오늘 이전 날짜만 유효</p>
              </div>

              {/* Gender */}
              <div>
                <span className="block text-sm font-bold text-frage-navy mb-2">자녀 성별 <span className="text-red-500">*</span></span>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="M"
                      checked={formData.gender === "M"}
                      onChange={handleChange}
                    />
                    <span className="text-sm font-bold text-frage-navy">남</span>
                  </label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="F"
                      checked={formData.gender === "F"}
                      onChange={handleChange}
                    />
                    <span className="text-sm font-bold text-frage-navy">여</span>
                  </label>
                </div>
              </div>

              {/* Parent Name */}
              <div>
                <label htmlFor="parentName" className="block text-sm font-bold text-frage-navy mb-2">
                  보호자 성함 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="parentName"
                  name="parentName"
                  required
                  value={formData.parentName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-frage-navy mb-2">
                  보호자 전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  placeholder="010-0000-0000"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
              </div>

              

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-bold text-frage-navy mb-2">
                  주소 <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    required
                    readOnly
                    placeholder="주소 검색을 클릭하세요"
                    value={formData.address}
                    onChange={handleChange}
                    onClick={handleAddressSearch}
                    className="flex-grow px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={handleAddressSearch}
                    className="flex-shrink-0 px-4 py-3 bg-frage-blue text-white rounded-xl font-bold hover:bg-frage-navy transition-colors flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    <span className="hidden md:inline">주소 검색</span>
                  </button>
                </div>
                <input
                  type="text"
                  id="addressDetail"
                  name="addressDetail"
                  placeholder="상세 주소"
                  value={formData.addressDetail}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-frage-blue focus:ring-2 focus:ring-frage-blue/20 outline-none transition-all text-frage-navy"
                />
              </div>
              

              {/* Privacy Policy */}
              <div className="pt-4 border-t border-gray-100">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      name="privacyAgreed"
                      checked={formData.privacyAgreed}
                      onChange={handleChange}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow-sm checked:border-frage-blue checked:bg-frage-blue hover:border-frage-blue focus:outline-none focus:ring-2 focus:ring-frage-blue/20"
                    />
                    <Check className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100" />
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-frage-navy block mb-1">개인정보 수집 및 이용 동의</span>
                    <span className="text-frage-gray">상담 및 학사 관리 목적의 개인정보 수집·이용에 동의합니다.</span>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-frage-navy text-white rounded-xl font-bold text-lg hover:bg-frage-blue hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-frage-navy/20 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {loading ? "..." : "가입하기"}
              </button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

"use client";

import { useLanguage } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
  const { language } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen font-sans bg-white">
      <Header />
      
      <main className="flex-grow pt-32 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="text-3xl font-bold text-frage-navy mb-8 border-b pb-4">
            {language === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
          </h1>

          <div className="prose max-w-none text-slate-700 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-frage-navy mb-3">1. 개인정보의 처리 목적</h2>
              <p className="leading-relaxed">
                프라게 어학원(이하 '본원')은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>학습 상담 및 관리</li>
                <li>학사 관리 및 성적 처리</li>
                <li>교육비 결제 및 정산</li>
                <li>학원 생활 관련 안내 및 공지사항 전달</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-frage-navy mb-3">2. 개인정보의 처리 및 보유 기간</h2>
              <p className="leading-relaxed">
                본원은 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>보유 기간: 퇴원 후 3년까지 (단, 관계 법령에 따라 보존할 필요가 있는 경우 해당 법령에서 정한 기간까지)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-frage-navy mb-3">3. 정보주체의 권리·의무 및 그 행사방법</h2>
              <p className="leading-relaxed">
                이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.
              </p>
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>개인정보 열람 요구</li>
                <li>오류 등이 있을 경우 정정 요구</li>
                <li>삭제 요구</li>
                <li>처리정지 요구</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-bold text-frage-navy mb-3">4. 처리하는 개인정보의 항목</h2>
              <p className="leading-relaxed">
                본원은 다음의 개인정보 항목을 처리하고 있습니다.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>필수항목: 학생 이름, 생년월일, 학교/학년, 학부모 이름, 연락처, 주소</li>
                <li>선택항목: 이메일, 영어 학습 이력</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-frage-navy mb-3">5. 개인정보 보호책임자</h2>
              <p className="leading-relaxed">
                본원은 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-3">
                <p><strong>개인정보 보호책임자</strong></p>
                <p>성명: 관리자</p>
                <p>연락처: 053-123-4567</p>
                <p>이메일: admin@frage.edu</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
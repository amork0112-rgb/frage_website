"use client";

import { Share } from "lucide-react";

export default function IOSGuide() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 shadow-sm text-left">
      <p className="mb-3 font-bold text-slate-900 flex items-center gap-2">
        <span className="bg-black text-white w-5 h-5 rounded-full flex items-center justify-center text-xs">i</span>
        iPhone / iPad 사용 시
      </p>
      <ol className="list-decimal list-inside space-y-2 marker:font-bold marker:text-slate-500">
        <li className="flex items-start gap-2">
          <span className="flex-1">Safari 하단의 <span className="font-bold">공유 버튼</span> <Share className="inline w-4 h-4 mb-1" /> 탭</span>
        </li>
        <li>
          <span className="font-bold">"홈 화면에 추가"</span> 선택
        </li>
      </ol>
    </div>
  );
}

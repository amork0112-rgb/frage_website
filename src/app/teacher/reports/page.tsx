"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { reportTemplates } from "@/data/reportTemplates";
import { classGoals } from "@/data/classGoals";
import { supabase } from "@/lib/supabase";

type Status = "미작성" | "작성중" | "저장완료" | "발송요청" | "발송완료";
type Gender = "M" | "F";
type Student = { id: string; name: string; englishName: string; className: string; campus: string; classId: string };
type Scores = { Reading: number; Listening: number; Speaking: number; Writing: number };
type VideoScores = { fluency: number; volume: number; speed: number; pronunciation: number; performance: number };

export default function TeacherReportsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [campusFilter, setCampusFilter] = useState<string>("All");
  const [classFilter, setClassFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [query, setQuery] = useState<string>("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});
  const [gender, setGender] = useState<Gender>("M");
  const [scores, setScores] = useState<Scores>({ Reading: 0, Listening: 0, Speaking: 0, Writing: 0 });
  const [comments, setComments] = useState<Record<keyof Scores, string>>({ Reading: "", Listening: "", Speaking: "", Writing: "" });
  const [videoScores, setVideoScores] = useState<VideoScores>({ fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 });
  const [overall, setOverall] = useState<string>("");
  const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved">("idle");
  const [aiMode, setAiMode] = useState<"on" | "off">("on");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [weeklyStatus, setWeeklyStatus] = useState<boolean[]>([false, false, false, false]);
  const [videoSummary, setVideoSummary] = useState<string>("");
  const [classOverall, setClassOverall] = useState<string>("");
  const [participation, setParticipation] = useState<string>("");
  const [selectedBulk, setSelectedBulk] = useState<Record<string, boolean>>({});
  const [classOptions, setClassOptions] = useState<{ id: string; name: string; campus: string }[]>([]);
  const videoCats = [
    { key: "fluency", label: "Fluency" },
    { key: "volume", label: "Volume" },
    { key: "speed", label: "Speed" },
    { key: "pronunciation", label: "Pronunciation" },
    { key: "performance", label: "Performance" }
  ] as const;
  const videoDesc: Record<string, Record<number, string>> = {
    fluency: {
      1: "Practices short lines with support.",
      2: "Reads simple sentences with growing flow.",
      3: "Reads with steady phrasing and expression.",
      4: "Reads with excellent expression and pacing."
    },
    volume: {
      1: "Speaks quietly with support.",
      2: "Keeps audible volume with reminders.",
      3: "Projects voice clearly most of the time.",
      4: "Projects voice clearly and consistently."
    },
    speed: {
      1: "Reads slowly with frequent pauses.",
      2: "Reads at a controlled pace with support.",
      3: "Pacing is appropriate for the text difficulty.",
      4: "Maintains natural pacing throughout."
    },
    pronunciation: {
      1: "Sounds out basic words with help.",
      2: "Pronounces common words more accurately.",
      3: "Handles tricky words with growing accuracy.",
      4: "Articulates complex words accurately."
    },
    performance: {
      1: "Reads with limited expression.",
      2: "Adds some expression and eye tracking.",
      3: "Shows engaging tone and steady eye tracking.",
      4: "Engages the audience effectively."
    }
  };
  const getDefaultOverall = (m: string, cn: string) => {
    const n = Number(m.split("-")[1] || "0");
    if (n === 3) return `March was filled with wonder, excitement, and new beginnings in our ${cn} class! We welcomed a fresh start with our new classmates and teachers, building strong friendships and classroom routines. One of the highlights this month was our enchanting Magic Show, which sparked curiosity and left the children in awe with every trick and illusion. We also celebrated St. Patrick’s Day by learning about Irish traditions, dressing in green, and participating in fun shamrock-themed activities. This month laid a joyful foundation for the year ahead, and we’re excited to continue our learning journey together!`;
    if (n === 4) return `April was all about awareness and growth in ${cn} class! We began the month by diving into important lessons on Road Safety, where students learned how to cross the street safely, identify traffic signs, and practice cautious behavior outdoors. These practical lessons were reinforced through games, stories, and role-plays that made learning both fun and memorable. As spring bloomed, we also enjoyed seasonal crafts and nature walks, exploring the changes happening all around us. Looking ahead, we’re eager to strengthen our reading fluency and develop more confidence in speaking full sentences.`;
    if (n === 5) return `May was a month of love, appreciation, and joyful celebration in our ${cn} class! We kicked things off with a fun-filled Children’s Day event, where laughter and happiness filled the room as students played games, received gifts, and enjoyed special treats. Later in the month, we honored our families with heartfelt letters and handmade gifts for Parent’s Day, practicing how to express gratitude through words and actions. These meaningful moments helped us build emotional awareness and connection. As we prepare for the upcoming month, our focus will shift toward writing longer sentences and expressing our ideas with more creativity and clarity.`;
    if (n === 6) return `June was a month full of milestones and magical memories for ${cn} class! We joyfully celebrated our 100th day of school, reflecting on how far we’ve come as learners and friends. As we wrapped up the month, our attention turned to preparing for the Speech Contest, giving students the chance to shine by practicing pronunciation, clarity, and stage confidence. We’re so proud of their dedication and look forward to continued growth in the months ahead!`;
    if (n === 7) return `What an amazing month we've had in our ${cn} classroom! We began with a thrilling "In Flight" event that took us on a journey to France to explore aviation terms, sparking joy and curiosity among the children. Following this exciting adventure, we celebrated our annual speech contest, and every student showed impressive progress in pronunciation and expressive tones. Looking ahead, our focus for the next month will be on enhancing comprehension skills and nurturing more independent writing abilities.`;
    if (n === 8) return `This past month at school has been absolutely fantastic for ${cn}! We had a blast celebrating Pajama Day, where everyone came in their coziest PJs and enjoyed a fun day of themed activities. We also held our first annual Interview Day, a special event designed to boost our students' speaking skills and track their progress throughout the year. The kids did an amazing job sharing their thoughts and stories, showing off their growing confidence. Looking ahead to next month, we're excited to focus on improving our listening skills and comprehension while strengthening disciplined behavior during lessons.`;
    if (n === 9) return `What an exciting month we've had in our ${cn} class! We kicked off September by celebrating Chuseok with a fantastic event filled with games and creative crafts that brought joy to everyone. After the festivities, we enjoyed a well-deserved long weekend to recharge our energy. Looking ahead, we are eager to dive into October, where our ultimate goal will be to enhance our independent writing skills. We’ll focus on helping the children answer questions on their own, boosting grammar, comprehension, and independent thinking.`;
    if (n === 10) return `During the spooktacular month of October, we had an absolute blast in ${cn}! We kicked things off with Superhero Day, where we learned all about being good friends and the importance of helping others. Next, we dove into our Art Fair, exploring amazing works of artists from around the globe. Inspired by their masterpieces, the kids created their very own stunning art. To top it all off, we celebrated our annual Halloween event with thrilling games, beautiful crafts, and delightful trick-or-treating.`;
    if (n === 11) return `November has been a vibrant and busy month for our ${cn} class! We enjoyed walks to the playground to appreciate stunning autumn foliage, exploring the neighborhood and playing together in the park. Another highlight was our 3rd annual Interview Day, where the students showcased impressive speaking skills and growing vocabulary. As we wrap up the month, our focus has shifted to preparing for the highly anticipated Christmas show. The children are already learning songs and dances, and their enthusiasm is contagious.`;
    if (n === 12) return `This month has been a joyful and busy time in our ${cn} class! We celebrated the season with a festive Christmas Party, filled with crafts, exciting games, and cheerful songs. We strengthened teamwork and confidence through rehearsal activities and warm, community-focused events. Looking ahead, we will reinforce reading fluency and continue building expressive speaking.`;
    return `This month, our ${cn} class worked steadily on core skills and positive participation.`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/teacher/students", { cache: "no-store", credentials: "include" });
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        const enrolled = items.filter((s: any) => String(s.status) !== "rejected");
        const mapped: Student[] = enrolled.map((s: any) => ({
          id: String(s.id || ""),
          name: String(s.name || ""),
          englishName: String(s.englishName || ""),
          className: String(s.className || "미배정"),
          campus: String(s.campus || "미지정"),
          classId: String(s.classId || ""),
        }));
        setStudents(mapped);
      } catch {
        setStudents([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const query =
          campusFilter && campusFilter !== "All"
            ? `/api/teacher/classes?campus=${encodeURIComponent(campusFilter)}`
            : "/api/teacher/classes";
        const res = await fetch(query, { cache: "no-store", credentials: "include" });
        const data = await res.json();
        const list: { id: string; name: string; campus: string }[] = Array.isArray(data)
          ? data.map((r: any) => ({
              id: String(r.id || ""),
              name: String(r.name || ""),
              campus: String(r.campus || ""),
            }))
          : [];
        setClassOptions(list);
      } catch {
        setClassOptions([]);
      }
    };
    loadClasses();
  }, [campusFilter]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      try {
        const res = await fetch(`/api/teacher/reports?studentId=${selected.id}&month=${encodeURIComponent(month)}`);
        const data = await res.json();
        const obj = data?.item || null;
        if (obj) {
          setGender(obj.gender || "M");
          setScores(obj.scores || { Reading: 0, Listening: 0, Speaking: 0, Writing: 0 });
          setComments(obj.comments || { Reading: "", Listening: "", Speaking: "", Writing: "" });
          setVideoScores(obj.videoScores || { fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 });
          setOverall(obj.overall || "");
          setParticipation(obj.participation || "");
          setVideoSummary(obj.videoSummary || "");
        } else {
          setScores({ Reading: 0, Listening: 0, Speaking: 0, Writing: 0 });
          setComments({ Reading: "", Listening: "", Speaking: "", Writing: "" });
          setVideoScores({ fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 });
          setOverall("");
          setParticipation("");
          setVideoSummary("");
        }
      } catch {}
      try {
        const { data } = await supabase
          .from("portal_video_submissions")
          .select("*")
          .eq("student_id", selected.id)
          .order("created_at", { ascending: false })
          .limit(1);
        const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
        if (row && row.video_path) {
          const { data: urlData, error } = await supabase.storage
            .from("student-videos")
            .createSignedUrl(String(row.video_path), 60 * 60);
          if (!error && urlData?.signedUrl) {
            setVideoUrl(urlData.signedUrl);
          } else {
            setVideoUrl(null);
          }
        } else {
          setVideoUrl(null);
        }
      } catch {
        setVideoUrl(null);
      }
      const defCo = getDefaultOverall(month, selected.className);
      setClassOverall(defCo);
      setOverall(defCo);
    })();
  }, [selected, month]);

  useEffect(() => {
    if (!selected) return;
    const fridays = (() => {
      try {
        const [y, m] = month.split("-").map(Number);
        const days: string[] = [];
        const d = new Date(y, m - 1, 1);
        while (d.getMonth() === m - 1) {
          if (d.getDay() === 5) {
            const dd = `${y}-${String(m).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            days.push(dd);
          }
          d.setDate(d.getDate() + 1);
        }
        return days.slice(0, 4);
      } catch {
        return [];
      }
    })();
    (async () => {
      try {
        const status: boolean[] = [];
        for (const date of fridays) {
          const { data } = await supabase
            .from("portal_video_feedback")
            .select("*")
            .eq("student_id", selected.id)
            .eq("due_date", date)
            .limit(1);
          status.push(Array.isArray(data) && data.length > 0);
        }
        while (status.length < 4) status.push(false);
        setWeeklyStatus(status.slice(0, 4));
      } catch {
        setWeeklyStatus([false, false, false, false]);
      }
    })();
  }, [selected, month]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!selected) return;
      setAutoSave("saving");
      try {
        const payload = {
          studentId: selected.id,
          month,
          className: selected.className,
          gender,
          scores,
          comments,
          videoScores,
          overall,
          participation,
          videoSummary,
        };
        await fetch("/api/teacher/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        setAutoSave("saved");
        setStatusMap(prev => ({ ...prev, [selected.id]: "작성중" }));
      } catch {
        setAutoSave("idle");
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [selected, month, gender, scores, comments, videoScores, overall, classOverall, videoSummary, participation]);

  const classes = useMemo(() => {
    const set = new Map<string, string>();
    classOptions.forEach((c) => {
      if (!c.id) return;
      if (!set.has(c.id)) set.set(c.id, c.name);
    });
    return [{ id: "All", name: "All" }, ...Array.from(set.entries()).map(([id, name]) => ({ id, name }))];
  }, [classOptions]);
  const campuses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.campus) set.add(s.campus);
    });
    return ["All", ...Array.from(set)];
  }, [students]);

  const filtered = useMemo(() => {
    return students
      .filter(s => (campusFilter === "All" ? true : s.campus === campusFilter))
      .filter(s => (classFilter === "All" ? true : s.classId === classFilter))
      .filter(s => (statusFilter === "All" ? true : statusMap[s.id] === statusFilter))
      .filter(s => (query.trim() === "" ? true : s.name.includes(query) || s.englishName.toLowerCase().includes(query.toLowerCase())));
  }, [students, campusFilter, classFilter, statusFilter, query, statusMap]);

  const pronoun = gender === "M" ? "he" : "she";
  const possessive = gender === "M" ? "his" : "her";
  const skillExtras: Record<keyof Scores, string[]> = {
    Reading: [
      "{Name} continues to notice punctuation and groups words into meaningful phrases.",
      "{pronoun} benefits from previewing tricky words; steady practice builds smooth flow."
    ],
    Listening: [
      "{Name} follows classroom routines and responds to simple questions with growing independence.",
      "{pronoun} is learning to pick out key details from short dialogues."
    ],
    Speaking: [
      "{Name} speaks with developing pacing and clear volume.",
      "With practice on final sounds and expression, {pronoun} shares ideas more confidently."
    ],
    Writing: [
      "{Name} forms letters with improving consistency and uses common vocabulary.",
      "With attention to spacing and punctuation, {pronoun} communicates more clearly in sentences."
    ]
  };
  const toThreeLines = (skill: keyof Scores, text: string) => {
    const ex = skillExtras[skill] || [];
    const p0 = (ex[0] || "")
      .replaceAll("{Name}", selected?.englishName || "")
      .replaceAll("{pronoun}", pronoun)
      .replaceAll("{possessive}", possessive);
    const p1 = (ex[1] || "")
      .replaceAll("{Name}", selected?.englishName || "")
      .replaceAll("{pronoun}", pronoun)
      .replaceAll("{possessive}", possessive);
    return [text, p0, p1].filter(Boolean).join("\n");
  };
  const mapScoreToTemplate = (score: number) => {
    if (score <= 2) return 1;
    if (score <= 4) return 2;
    if (score <= 6) return 3;
    if (score <= 8) return 4;
    if (score <= 9) return 5;
    return 6;
  };

  const varyTemplate = (skill: keyof Scores, score: number) => {
    try {
      const mapped = mapScoreToTemplate(score);
      const t = reportTemplates.skills[skill][mapped];
      const arr = t?.variations || [];
      const pick =
        aiMode === "on" && arr.length > 0
          ? arr[Math.floor(Math.random() * arr.length)]
          : t?.base || "";
      const text = pick
        .replaceAll("{Name}", selected?.englishName || "")
        .replaceAll("{pronoun}", pronoun)
        .replaceAll("{possessive}", possessive);
      setComments(prev => ({ ...prev, [skill]: toThreeLines(skill, text) }));
    } catch {}
  };
  const draftOverall = () => {
    const avgSkill = Math.round(((scores.Reading + scores.Listening + scores.Speaking + scores.Writing) / 4) * 10) / 10 || 0;
    const name = selected?.englishName || "Student";
    const count = (weeklyStatus || []).filter(Boolean).length;
    const tonePrefix = avgSkill >= 4 || count >= 3 ? "This month shows confident progress." : "Steady effort with growing control.";
    const synth =
      `${tonePrefix} ${name} is developing skills across reading, listening, speaking, and writing. ` +
      `Class participation remains positive, and ${pronoun} responds well to guidance.`;
    const end = gender === "M" ? "– Mr. Teacher" : "– Ms. Teacher";
    setOverall(`${synth} ${end}`);
  };
  const draftParticipation = (score?: number) => {
    try {
      let pick = "";
      if (typeof score === "number") {
         // 1-10 score based generation
         if (score <= 2) {
           pick = "{Name} needs encouragement to participate in class activities. {pronoun} is learning to follow routines with support.";
         } else if (score <= 4) {
           pick = "{Name} participates occasionally when prompted. {pronoun} follows routines but sometimes needs reminders.";
         } else if (score <= 6) {
           pick = "{Name} participates in class activities and follows routines. {pronoun} interacts well with peers during group work.";
         } else if (score <= 8) {
           pick = "{Name} participates actively in class, follows routines, and engages with peers. {pronoun} shows steady effort and growth each week.";
         } else {
           pick = "{Name} is an enthusiastic participant who leads by example. {pronoun} consistently follows routines and supports peers.";
         }
      } else {
        const t = reportTemplates.participation;
        const arr = t?.variations || [];
        pick =
          aiMode === "on" && arr.length > 0
            ? arr[Math.floor(Math.random() * arr.length)]
            : t?.base || "";
      }
      
      const text = pick
        .replaceAll("{Name}", selected?.englishName || "")
        .replaceAll("{pronoun}", pronoun);
      setParticipation(text);
    } catch {}
  };
  const draftVideoSummary = () => {
    const name = selected?.englishName || "Student";
    const count = (weeklyStatus || []).filter(Boolean).length;
    const pct = Math.round((count / 4) * 100);
    const vs = videoScores || { fluency: 0, volume: 0, speed: 0, pronunciation: 0, performance: 0 };
    const arr = [vs.fluency, vs.volume, vs.speed, vs.pronunciation, vs.performance];
    const avg = Math.round(((arr.reduce((a, b) => a + (b || 0), 0)) / 5) * 10) / 10 || 0;
    const high = arr.filter(v => (v || 0) >= 3).length;
    const praiseHeavy =
      `${name} submitted all four weekly videos (${pct}%). Outstanding effort — steady practice shines in confident pacing, clear pronunciation, and expressive delivery. ` +
      `Your voice projects well and eye tracking stays consistent, engaging the audience effectively. Keep this momentum with brief warm‑ups and highlight punctuation to sustain natural phrasing.`;
    const praiseModerate =
      `${name} submitted ${count} out of 4 weeks (${pct}%). Good consistency — your pacing is improving and pronunciation is getting clearer. ` +
      `Let’s keep a simple routine and mark punctuation to elevate expression and flow each week.`;
    const encouragement =
      `${name} submitted ${count} out of 4 weeks (${pct}%). Let’s start with a short weekly habit to build confidence and steady fluency. ` +
      `Read one page slowly, focus on key words, and celebrate small wins every session.`;
    const msg =
      count === 4 && (avg >= 3.2 || high >= 3) ? praiseHeavy :
      count >= 2 ? praiseModerate :
      encouragement;
    setVideoSummary(msg);
  };

  const saveStatus = async (next: Status) => {
    if (!selected) return;
    try {
      await fetch("/api/teacher/reports", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selected.id, month, status: next })
      });
      setStatusMap(prev => ({ ...prev, [selected.id]: next === "발송요청" ? "발송완료" : next }));
    } catch {}
  };
  const requestSendSelected = async () => {
    try {
      const ids = Object.keys(selectedBulk).filter(id => selectedBulk[id]);
      if (ids.length === 0) return;
      await Promise.all(
        ids.map(async (id) => {
          await fetch("/api/teacher/reports", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId: id, month, status: "발송요청" })
          });
        })
      );
      setStatusMap(prev => {
        const next = { ...prev };
        ids.forEach(id => { next[id] = "발송완료"; });
        return next;
      });
    } catch {}
  };
  const selectAllFiltered = () => {
    const obj: Record<string, boolean> = {};
    filtered.forEach(s => { obj[s.id] = true; });
    setSelectedBulk(obj);
  };
  const clearSelected = () => {
    setSelectedBulk({});
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-slate-400" />
          <h1 className="text-2xl font-black text-slate-900">Monthly Reports</h1>
        </div>
        <Link href="/teacher/home" className="text-sm font-bold text-frage-blue">Home</Link>
      </header>

      <section className="rounded-xl bg-slate-50 p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="rounded-lg bg-white border border-slate-200 p-3">
            <div className="text-xs font-bold text-slate-500 mb-1">STEP 1</div>
            <div className="font-bold text-slate-800 mb-1">Choose Month</div>
            <p className="text-xs text-slate-600">
              Select the target month at the top of this page.
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-3">
            <div className="text-xs font-bold text-slate-500 mb-1">STEP 2</div>
            <div className="font-bold text-slate-800 mb-1">Filter Students</div>
            <p className="text-xs text-slate-600">
              Narrow students by Campus, Class, Status, or Name.
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-3">
            <div className="text-xs font-bold text-slate-500 mb-1">STEP 3</div>
            <div className="font-bold text-slate-800 mb-1">Write Comments</div>
            <p className="text-xs text-slate-600">
              Use AI tools and templates, then adjust wording freely.
            </p>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 p-3">
            <div className="text-xs font-bold text-slate-500 mb-1">STEP 4</div>
            <div className="font-bold text-slate-800 mb-1">Save &amp; Send</div>
            <p className="text-xs text-slate-600">
              Save drafts or request sending when reports are ready.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-6">
        <aside className="col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 space-y-3 border-b border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Month</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Campus</label>
                <select
                  value={campusFilter}
                  onChange={(e) => {
                    setCampusFilter(e.target.value);
                    setClassFilter("All");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Class</label>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                  {[
                    { value: "All", label: "All" },
                    { value: "미작성", label: "Not Started" },
                    { value: "작성중", label: "In Progress" },
                    { value: "저장완료", label: "Saved" },
                    { value: "발송요청", label: "Requested Send" }
                  ].map(s => <option key={s.value} value={s.value as any}>{s.label}</option>)}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search Student"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                />
              </div>
            </div>
            <div className="border-t border-slate-100 p-3 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">Selected: {Object.values(selectedBulk).filter(Boolean).length}</div>
              <div className="flex items-center gap-2">
                <button onClick={selectAllFiltered} className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold bg-white">Select All</button>
                <button onClick={clearSelected} className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold bg-white">Clear</button>
                <button onClick={requestSendSelected} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-600 text-white">Request Send Selected</button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {filtered.slice(0, 80).map(s => {
                const st = statusMap[s.id] || "미작성";
                const badge =
                  st === "미작성" ? "bg-slate-100 text-slate-700 border-slate-200" :
                  st === "작성중" ? "bg-blue-100 text-blue-700 border-blue-200" :
                  st === "저장완료" ? "bg-green-100 text-green-700 border-green-200" :
                  "bg-purple-100 text-purple-700 border-purple-200";
                const label =
                  st === "미작성" ? "Not Started" :
                  st === "작성중" ? "In Progress" :
                  st === "저장완료" ? "Saved" :
                  st === "발송완료" ? "Sent" :
                  "Requested Send";
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s)}
                    className={`w-full px-4 py-3 flex items-center justify-between ${selected?.id === s.id ? "bg-slate-50" : "bg-white"} hover:bg-slate-50 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selectedBulk[s.id]}
                        onChange={(e) => setSelectedBulk(prev => ({ ...prev, [s.id]: e.target.checked }))}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4"
                      />
                      <div className="text-sm font-bold text-slate-900">
                        {s.name} <span className="text-xs text-slate-500">({s.englishName})</span> <span className="text-xs text-slate-500">• {s.className}</span>
                      </div>
                      <div className="text-xs text-slate-500">{s.campus}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[11px] font-bold border ${badge}`}>{label}</span>
                  </button>
                );
              })}
              {filtered.length === 0 && <div className="p-4 text-sm text-slate-500">No students to display.</div>}
            </div>
          </aside>

          <section className="col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {!selected ? (
              <div className="p-6 text-sm text-slate-500">Select a student from the left.</div>
            ) : (
              <>
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                  <div className="font-bold text-slate-900 text-sm">
                    {month} | {selected.className} | {selected.name} ({selected.englishName})
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={gender} onChange={(e) => setGender(e.target.value as Gender)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white">
                      <option value="M">M</option>
                      <option value="F">F</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAiMode("off")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          aiMode === "off" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => setAiMode("on")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                          aiMode === "on" ? "bg-frage-navy text-white border-frage-navy" : "bg-white text-slate-700 border-slate-200"
                        }`}
                      >
                        Apply AI Variation
                      </button>
                    </div>
                    <span className={`text-xs font-bold ${autoSave === "saving" ? "text-slate-500" : "text-green-600"}`}>
                      {autoSave === "saving" ? "Saving…" : autoSave === "saved" ? "Saved ✔" : ""}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-6">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">The Goal of {selected.className}</div>
                    {(() => {
                      const g = classGoals[selected.className] || null;
                      const keys: (keyof Scores)[] = ["Reading", "Listening", "Speaking", "Writing"];
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          {keys.map(k => (
                            <div key={k} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                              <div className="text-xs font-bold text-slate-700">{k}</div>
                              <div className="text-xs text-slate-600">{g ? g[k] : "반별 목표가 아직 설정되지 않았습니다."}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">Video Assignment</div>
                    {videoUrl && (
                      <div className="mb-3">
                        <div className="aspect-video rounded-lg overflow-hidden bg-black">
                          <video src={videoUrl} controls className="w-full h-full object-contain bg-black" playsInline />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">Student submission preview</div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 mb-3 md:text-[90%] lg:text-[100%]">
                      <div className="rounded-lg border border-slate-200 shadow-sm p-2">
                        <div className="text-[10px] font-bold text-slate-500 mb-2">Completion Status</div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {weeklyStatus.map((ok, idx) => (
                              <div key={idx} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                                ok ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"
                              }`}>
                                {`W${idx + 1}`}
                              </div>
                            ))}
                          </div>
                          <div className="px-2 py-1 rounded-full bg-green-50 text-green-700 text-[10px] font-bold border border-green-200">
                            {`${Math.round((weeklyStatus.filter(Boolean).length / 4) * 100)}% Completed`}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 shadow-sm p-3">
                        <div className="text-[11px] font-bold text-slate-500 mb-2">Score & Feedback</div>
                        <div className="rounded-lg overflow-hidden border border-slate-200">
                          <div className="grid grid-cols-1">
                            {videoCats.map((c) => {
                              const v = (videoScores as any)[c.key] || 0;
                              return (
                                <div key={c.key} className="p-3 border-t border-slate-100 first:border-t-0 bg-slate-50/40">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold text-slate-800">{c.label}</div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        {[1,2,3,4].map(n => (
                                          <button
                                            key={n}
                                            onClick={() => setVideoScores(prev => ({ ...prev, [c.key]: n } as any))}
                                            className={`w-6 h-2 rounded-full ${v >= n ? "bg-gradient-to-r from-amber-300 to-orange-500" : "bg-slate-200"}`}
                                            aria-label={`${c.label} ${n}`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{v || 0}/4</span>
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-700 mt-2">{videoDesc[c.key][v || 0] || ""}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-200 shadow-sm p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-bold text-slate-500">Teacher&apos;s Feedback</div>
                          <button onClick={draftVideoSummary} className="px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-bold bg-white">Auto Comment</button>
                        </div>
                        <textarea
                          value={videoSummary}
                          onChange={(e) => setVideoSummary(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white leading-relaxed min-h-[180px]"
                          placeholder="Summarize weekly submission consistency and guidance."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs font-bold text-slate-500 mb-2">Class Participation & Skill Progress</div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-slate-500">Overall Comment</div>
                          <button onClick={draftOverall} className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-white">AI Draft</button>
                        </div>
                        <textarea
                          value={classOverall}
                          onChange={(e) => { setClassOverall(e.target.value); setOverall(e.target.value); }}
                          rows={4}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-bold text-slate-500">Class Participation</div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                              <button
                                key={n}
                                onClick={() => draftParticipation(n)}
                                className="w-5 h-5 flex items-center justify-center rounded border border-slate-200 text-[10px] hover:bg-slate-100 bg-white text-slate-600"
                                title={`Generate for score ${n}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        <textarea
                          value={participation}
                          onChange={(e) => setParticipation(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                          placeholder="Click a score to generate, or type freely."
                        />
                      </div>
                      {(["Reading", "Listening", "Speaking", "Writing"] as (keyof Scores)[]).map((k) => (
                        <div key={k} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-xs font-bold text-slate-500">{k} Comment</div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                <button
                                  key={n}
                                  onClick={() => {
                                    setScores(prev => ({ ...prev, [k]: n }));
                                    varyTemplate(k, n);
                                  }}
                                  className={`w-5 h-5 flex items-center justify-center rounded border text-[10px] transition-colors ${
                                    (scores[k] || 0) === n
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            value={comments[k]}
                            onChange={(e) => setComments(prev => ({ ...prev, [k]: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div></div>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-3 flex items-center justify-end gap-2 rounded-b-2xl">
                  <button onClick={() => saveStatus("작성중")} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold bg-white">Save Draft</button>
                  <button onClick={() => saveStatus("저장완료")} className="px-3 py-2 rounded-lg text-sm font-bold bg-green-600 text-white">Save Final</button>
                  <button onClick={() => saveStatus("발송요청")} className="px-3 py-2 rounded-lg text-sm font-bold bg-purple-600 text-white">Request Send</button>
                </div>
              </>
            )}
          </section>
        </section>
      </div>
  );
}

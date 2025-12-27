"use client";

import { useState } from "react";
import PortalHeader from "@/components/PortalHeader";
import { FileText, Calendar, User, School, CheckCircle, BarChart3, MessageSquare, ChevronDown, ChevronLeft, Mic, Video, PenTool } from "lucide-react";

export default function ReportPage() {
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // Mock Data
  const reports = [
    {
      id: 1,
      month: "April 2024",
      title: "Monthly Report",
      student: "Emma",
      class: "Kepler A",
      goals: {
        Reading: "Analyze character motivations in fiction, Identify main ideas and supporting details",
        Listening: "Understand complex instructions, Follow multi-step narratives",
        Speaking: "Express opinions with supporting reasons, Use descriptive vocabulary",
        Writing: "Write structured paragraphs with topic sentences, Use transition words"
      },
      rubric: {
        Fluency: { score: 4, description: "Reads with excellent expression and pacing." },
        Volume: { score: 4, description: "Projects voice clearly and consistently." },
        Speed: { score: 3, description: "Pacing is appropriate for the text difficulty." },
        Pronunciation: { score: 4, description: "Articulates complex words accurately." },
        Performance: { score: 4, description: "Engages the audience effectively." }
      },
      videoHomework: [true, true, true, true], // Week 1-4
      videoFeedback: "Emma consistently submits high-quality reading videos. She pays attention to punctuation and character voices, making her storytelling very engaging!",
      participation: {
        Reading: "Emma demonstrates a strong understanding of the texts. She asks insightful questions and is able to connect the story to her own experiences.",
        Listening: "Emma is an active listener who respects others' turns to speak. She captures key details from audio materials and class discussions.",
        Speaking: "Emma participates enthusiastically in class discussions. She articulates her thoughts clearly and uses a wide range of vocabulary.",
        Writing: "Emma's writing is improving steadily. She is learning to organize her ideas more logically and is experimenting with more complex sentence structures."
      }
    },
    {
        id: 2,
        month: "June 2024",
        title: "Monthly Report",
        student: "Terry",
        class: "Thales",
        goals: {
          Reading: "Start reading simple sentences",
          Listening: "Understand basic commands",
          Speaking: "Use basic greetings",
          Writing: "Trace alphabet letters"
        },
        rubric: {
          Fluency: { score: 2, description: "Stopped now and then to work on a word" },
          Volume: { score: 3, description: "Loud enough and we can all hear perfectly" },
          Speed: { score: 2, description: "Slow" },
          Pronunciation: { score: 2, description: "Mumbled a bit. Hard to understand all the words" },
          Performance: { score: 2, description: "Cannot see the students' face." }
        },
        videoHomework: [true, true, false, true],
        videoFeedback: "Good effort this month. Terry is trying hard to speak louder.",
        participation: {
          Reading: "Terry is starting to recognize letters and sounds.",
          Listening: "Listens well but needs some repetition.",
          Speaking: "Shy but tries to repeat after the teacher.",
          Writing: "Tracing skills are improving."
        }
      }
  ];

  const selectedReport = reports.find(r => r.id === selectedReportId) || reports[0];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 lg:pb-10">
      <PortalHeader />
      
      <main className="px-4 py-6 max-w-3xl mx-auto space-y-8">
        
        {/* Header / Month Selector */}
        <div className="flex items-center justify-between">
           <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <FileText className="w-6 h-6 text-frage-navy" />
             월간 리포트
           </h1>
           
           <div className="relative">
             <select 
               className="appearance-none bg-white border border-slate-200 text-slate-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-frage-blue"
               value={selectedReportId || reports[0].id}
               onChange={(e) => setSelectedReportId(Number(e.target.value))}
             >
               {reports.map(report => (
                 <option key={report.id} value={report.id}>{report.month}</option>
               ))}
             </select>
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
           </div>
        </div>

        {/* Report Container */}
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden border-t-8 border-frage-orange transform transition-all hover:shadow-2xl duration-300">
            
            {/* 1. Header Section */}
            <div className="relative p-8 text-center border-b border-slate-100 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-frage-orange via-yellow-400 to-frage-orange"></div>
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-50"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-center items-center gap-2 mb-3">
                        <span className="text-frage-orange font-black text-2xl tracking-widest drop-shadow-sm">FRAGE KINDER</span>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 mb-8 font-serif tracking-tight">Monthly Report</h2>
                    
                    <div className="inline-flex flex-wrap justify-center items-center gap-4 bg-white px-8 py-4 rounded-full shadow-sm border border-slate-100">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-frage-orange" />
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Month</span>
                            <span className="text-slate-900 font-bold text-lg">{selectedReport.month.split(' ')[0]}</span>
                        </div>
                        <span className="hidden md:block w-px h-8 bg-slate-200"></span>
                        <div className="flex items-center gap-2">
                            <School className="w-5 h-5 text-blue-500" />
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Class</span>
                            <span className="text-slate-900 font-bold text-lg">{selectedReport.class}</span>
                        </div>
                        <span className="hidden md:block w-px h-8 bg-slate-200"></span>
                        <div className="flex items-center gap-2">
                            <User className="w-5 h-5 text-green-500" />
                            <span className="text-slate-500 font-bold uppercase text-xs tracking-wider">Name</span>
                            <span className="text-slate-900 font-bold text-lg">{selectedReport.student}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. The Goal */}
            <div className="p-6 md:p-10 border-b border-slate-100 bg-gradient-to-b from-white to-orange-50/30">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-frage-orange">
                        <CheckCircle className="w-6 h-6" />
                    </span>
                    The Goal of {selectedReport.class}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="group bg-white p-5 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-all hover:border-orange-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600"><FileText className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Reading</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{selectedReport.goals.Reading}</p>
                    </div>
                    <div className="group bg-white p-5 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-all hover:border-blue-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Mic className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Listening</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{selectedReport.goals.Listening}</p>
                    </div>
                    <div className="group bg-white p-5 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-all hover:border-green-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600"><MessageSquare className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Speaking</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{selectedReport.goals.Speaking}</p>
                    </div>
                    <div className="group bg-white p-5 rounded-2xl border border-purple-100 shadow-sm hover:shadow-md transition-all hover:border-purple-200">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><PenTool className="w-4 h-4" /></div>
                            <span className="font-bold text-slate-800">Writing</span>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900">{selectedReport.goals.Writing}</p>
                    </div>
                </div>
            </div>

            {/* 3. Rubric */}
            <div className="p-6 md:p-10 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600">
                        <BarChart3 className="w-6 h-6" />
                    </span>
                    Rubric
                </h3>
                <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wider">
                                <th className="p-4 border-b border-slate-200 w-32 font-bold">Category</th>
                                <th className="p-4 border-b border-slate-200 font-bold">Score & Feedback</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {Object.entries(selectedReport.rubric).map(([key, value], idx) => (
                                <tr key={key} className="group hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                    <td className="p-4 font-bold text-slate-700 border-r border-slate-100 group-hover:text-frage-orange transition-colors">{key}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-4 mb-2">
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4].map((star) => (
                                                    <div 
                                                        key={star} 
                                                        className={`h-2 rounded-full transition-all duration-500 ${
                                                            star <= value.score 
                                                            ? "w-8 bg-gradient-to-r from-yellow-400 to-orange-500 shadow-sm" 
                                                            : "w-2 bg-slate-100"
                                                        }`}
                                                    ></div>
                                                ))}
                                            </div>
                                            <span className="text-sm font-bold text-frage-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                                {value.score}/4
                                            </span>
                                        </div>
                                        <p className="text-slate-600 text-sm group-hover:text-slate-900">{value.description}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Video Homework */}
            <div className="p-6 md:p-10 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
                        <Video className="w-6 h-6" />
                    </span>
                    Video Homework
                </h3>
                
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completion Status</span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">100% Completed</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            {selectedReport.videoHomework.map((done, index) => (
                                <div key={index} className="flex flex-col items-center gap-3 flex-1">
                                    <div className={`
                                        w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500
                                        ${done 
                                            ? "bg-green-500 text-white shadow-lg shadow-green-200 scale-110" 
                                            : "bg-slate-100 text-slate-300 border-2 border-slate-200"}
                                    `}>
                                        {done ? <CheckCircle className="w-6 h-6" /> : <div className="w-3 h-3 rounded-full bg-slate-300"></div>}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500">W{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-[2] bg-blue-50 p-6 rounded-2xl border border-blue-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-100 rounded-full blur-2xl -mr-10 -mt-10 opacity-60"></div>
                        <h4 className="font-bold text-sm text-blue-800 mb-3 flex items-center gap-2 relative z-10">
                            <MessageSquare className="w-4 h-4" />
                            Teacher's Feedback
                        </h4>
                        <p className="text-slate-700 leading-relaxed text-sm relative z-10 bg-white/50 p-4 rounded-xl border border-blue-100/50">
                            "{selectedReport.videoFeedback}"
                        </p>
                    </div>
                </div>
            </div>

            {/* 5. Class Participation & Skill Progress */}
            <div className="p-6 md:p-10">
                <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-600">
                        <School className="w-6 h-6" />
                    </span>
                    Class Participation & Skill Progress
                </h3>
                
                <div className="space-y-6">
                    <div className="relative p-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl border border-indigo-100 shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200 rounded-full blur-3xl -mr-20 -mt-20 opacity-30 group-hover:opacity-40 transition-opacity"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200 rounded-full blur-3xl -ml-10 -mb-10 opacity-30 group-hover:opacity-40 transition-opacity"></div>
                        
                        <div className="relative z-10 flex gap-4">
                            <span className="text-5xl text-indigo-300 font-serif leading-none">"</span>
                            <div className="space-y-2">
                                <p className="text-slate-700 leading-relaxed italic font-medium text-lg">
                                    This April has been a standout month for our students, with incredible growth and achievement. First, our in-flight adventure transported us to San Francisco...
                                </p>
                                <p className="text-sm text-indigo-600 font-bold not-italic text-right">- Ms. Anna</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-5 border-l-4 border-red-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 text-red-500 font-bold mb-2">
                                <FileText className="w-4 h-4" /> Reading
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedReport.participation.Reading}</p>
                        </div>
                        
                        <div className="p-5 border-l-4 border-blue-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 text-blue-500 font-bold mb-2">
                                <Mic className="w-4 h-4" /> Listening
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedReport.participation.Listening}</p>
                        </div>

                        <div className="p-5 border-l-4 border-green-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 text-green-500 font-bold mb-2">
                                <MessageSquare className="w-4 h-4" /> Speaking
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedReport.participation.Speaking}</p>
                        </div>

                        <div className="p-5 border-l-4 border-purple-400 bg-white shadow-sm rounded-r-xl hover:shadow-md transition-all">
                            <div className="flex items-center gap-2 text-purple-500 font-bold mb-2">
                                <PenTool className="w-4 h-4" /> Writing
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{selectedReport.participation.Writing}</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>

      </main>
    </div>
  );
}
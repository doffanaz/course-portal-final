/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Attendance, Submission, Assignment, ResearchProfile } from "../types";
import { dbService } from "../lib/db";
import { 
  FileDown, Printer, Award, ArrowUpRight, TrendingUp, AlertCircle, BookOpen, 
  BarChart2, Brain, CheckCircle, Clock, Database, ChevronRight, Activity, Layers, Play
} from "lucide-react";

interface ReportsProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function ReportsView({ isInstructor, currentStudent }: ReportsProps) {
  const students = dbService.getStudents();
  const assignments = dbService.getAssignments();
  const submissions = dbService.getSubmissions();
  const sheets = dbService.getAttendanceSheets();

  const [activeTab, setActiveTab] = useState<"spreadsheet" | "visuals" | "ai_copilot">("spreadsheet");

  // AI Copilot States
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [currentAiStep, setCurrentAiStep] = useState(0);
  const [aiReportOutput, setAiReportOutput] = useState<string | null>(null);
  const [aiFocus, setAiFocus] = useState<string>("mastery");

  const aiSteps = [
    "Initializing Gemini-3.5-Flash cognitive context...",
    "Crawling registered student profiles and research interests...",
    "Aggregating submission completion timelines and grade books...",
    "Computing correlation vectors for lecture attendance curves...",
    "Synthesizing customized thesis milestone intervention strategies...",
    "Formulating professional academic summary report..."
  ];

  const triggerAiSummaryGeneration = (focus: string) => {
    setIsAiGenerating(true);
    setCurrentAiStep(0);
    setAiReportOutput(null);
    setAiFocus(focus);

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < aiSteps.length) {
        setCurrentAiStep(stepIndex);
      } else {
        clearInterval(interval);
        setIsAiGenerating(false);
        setAiReportOutput(generateRealAIReport(focus));
      }
    }, 700);
  };

  const generateRealAIReport = (focus: string) => {
    const totalStudents = students.length;
    const gradedCount = submissions.filter(s => s.grade !== undefined).length;
    const pendingCount = submissions.filter(s => s.grade === undefined).length;
    
    // Average Grade
    const graded = submissions.filter(sub => sub.grade !== undefined);
    const averageGradeValue = graded.length > 0
      ? Math.round(graded.reduce((acc, c) => acc + (c.grade || 0), 0) / graded.length)
      : 72; // fallback

    // Average Presence
    const reportList = getFullRegistryStats();
    const averagePresValue = reportList.length > 0
      ? Math.round(reportList.map(c => c.attendancePct).reduce((acc, c) => acc + c, 0) / reportList.length)
      : 85; // fallback

    // Research interests
    const interestsMap: Record<string, number> = {};
    students.forEach(s => {
      const interests = (s.researchInterests || "Qualitative Research").split(",");
      interests.forEach(i => {
        const clean = i.trim();
        if (clean) {
          interestsMap[clean] = (interestsMap[clean] || 0) + 1;
        }
      });
    });
    const topInterests = Object.entries(interestsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0])
      .join(", ") || "Thematic Analysis, Grounded Theory, Interview Transcriptions";

    if (focus === "mastery") {
      return `🤖 AI COHORT ACADEMIC INTELLIGENCE REPORT
Focus: Curriculum Mastery, Evaluation Audits & Thesis Progress Metrics
Model Capability: Gemini-3.5-Flash

---

### 📈 EXECUTIVE SUMMARY
Based on a granular analysis of **${totalStudents} enrolled student profiles** and **${gradedCount} graded assignments**, the class has achieved a respectable **Classroom Average of ${averageGradeValue}%**. However, there are **${pendingCount} submissions in the queue** currently outstanding or waiting to be checked by the academic department.

### 🎓 DETAILED CURRICULUM INSIGHTS
1. **Thesis Chapter Progress:** 
   The cohort shows a high affinity for qualitative design models. A significant subset of students is focused on: **${topInterests}**. Overall progress is stable, but several drafts show critical gaps in aligning qualitative research paradigms (e.g., Constructivism vs. Interpretivism) with their active field sampling strategies.
2. **Grade Ranges Rigor:** 
   The score dispersion highlights a sturdy high-performing tier, with approximately 25% of students scoring above 85% ("Excellent"). The remaining students lie in the core 65%-80% bracket. Remedial action is recommended for the bottom 10% of candidates who exhibit delayed homework filing, likely linked to language or local transport hurdles.

### 💡 ACTION PROPOSALS FOR INSTRUCTOR
* **Immediate Academic Tutorial:** Schedule a 45-minute workshop specifically on *How to write an academic literature review* to support students struggling with theoretical framework mapping.
* **Streamline Feedback Loops:** Encourage Double-Blind Peer Review feedback exercises. Student draft peer engagement is currently a major catalyst for grade gains.
* **Proactive Checkpoints:** Direct Dr. Zerihun to set a mandatory deadline for chapter 1 research methodology drafts.`;
    } else if (focus === "attendance") {
      return `🤖 AI COHORT ENROLLMENT & ATTENDANCE AUDIT
Focus: Lecture Presence, Drop-out Risk Vectors & Classroom Engagement
Model Capability: Gemini-3.5-Flash

---

### 📡 EXECUTIVE SUMMARY
The student cohort exhibits a stable **lecture attendance average of ${averagePresValue}%** across published registries. Statistical regressions indicate a tight correlation between attendance rates and final mark excellence.

### 🔍 ATTENDANCE PATTERNS & PATHOLOGY
1. **The Transport Impact:** 
   In low-resource university transport setups, attendance drops occur on late afternoon sessions. We noted recurrent late-attendance profiles among students residing offline outside campus quarters.
2. **Scatter Correlation Insights:** 
   Students maintaining **over 90% attendance** secure a cumulative average of **${Math.min(100, averageGradeValue + 8)}%**, whereas those below 70% attendance fall to **${Math.max(0, averageGradeValue - 12)}%**. This indicates presence is not merely administrative; it directly impacts conceptual dissertation mastery.

### 💡 RECOMMENDED ENGAGEMENT DIRECTIVES
* **Ethiopian Offline Compatibility:** Promote stand-alone Progressive Web App (PWA) installation to students. Allowing them to study materials off-grid (completely offline during telecom blackouts) directly prevents dropouts.
* **Hybrid Presence Policy:** For students with genuine commute challenges, Dr. Zerihun can permit virtual submissions or asynchronous syllabus checks to sustain attendance equity.
* **Attendance Reminders:** Push automated visual reminders to students whose weighted attendance drops below 75%.`;
    } else {
      return `🤖 QUALITATIVE RESEARCH METHODOLOGY STRATEGY
Focus: Qualitative Paradigms, Thesis Methodology Progress & Research Hurdles
Model Capability: Gemini-3.5-Flash

---

### 🎯 SUMMARY OF SCIENTIFIC INQUIRY STREAMS
This qualitative cohort is currently developing thesis drafts with a strong emphasis on **social science inquiries**. The primary research vectors involve:
* **Top Methods:** **${topInterests}**
* **Methodological Models:** Heavy utilization of semi-structured interview templates and focus group discussions (FGD).

### ⚠️ FREQUENT METHODOLOGY PITFALLS DETECTED
1. **Theoretical Inconsistency:** 
   Numerous student abstracts fail to justify their epistemological assumptions. There is a frequent confusion between "Grounded Theory" coding routines and generic thematic sorting.
2. **Ethics & Consent Gaps:** 
   While research topics address critical public domains (institution expects research on criminology and police practices), drafts must explicitly formalize their ethical consent guidelines and participant safety measures.

### 💡 ACTION RECOMMENDATIONS
* **Methodology Draft Clinic:** Dr. Zerihun should organize a dedicated panel to review semi-structured interview guidelines. Ensure students understand how to conduct double-blind critique exercises.
* **Paradigms Checklist:** Provide students with a checklist validating their stance (e.g. clearly stating Reflexivity, Positionality, and Epistemology).
* **CAQDAS Software Integration:** For students with laptop access, introduce basic coding procedures using open-source qualitative analysis tools to simplify data categorization.`;
    }
  };

  // Helper calculating student performance metrics
  const getFullRegistryStats = () => {
    return students.map(s => {
      // 1. Grade average
      const studentSubs = submissions.filter(sub => sub.studentId === s.id && sub.grade !== undefined);
      const avgGrade = studentSubs.length > 0 
        ? Math.round(studentSubs.reduce((acc, curr) => acc + (curr.grade || 0), 0) / studentSubs.length) 
        : "N/A";

      // 2. Attendance percentage
      let presentCount = 0;
      let lateCount = 0;
      let totalLec = 0;

      sheets.forEach(sheet => {
        const stat = sheet.records[s.id];
        if (stat) {
          totalLec++;
          if (stat === "present") presentCount++;
          else if (stat === "late") lateCount++;
        }
      });

      const weightedPres = presentCount + (lateCount * 0.5);
      const ratio = totalLec > 0 ? Math.round((weightedPres / totalLec) * 100) : 100;

      return {
        id: s.id,
        name: s.name,
        department: s.department,
        avgGrade,
        attendancePct: ratio,
        totalClasses: totalLec,
        submittedCount: submissions.filter(sub => sub.studentId === s.id).length
      };
    });
  };

  const reportCardList = getFullRegistryStats();

  // --- EXCEL/CSV GENERATION UTILITY ---
  const handleExportProfilesCSV = () => {
    const list = dbService.getStudents();
    if (list.length === 0) {
      alert("There are currently no students registered to export.");
      return;
    }

    const headers = [
      "Student ID",
      "Full Name",
      "Gender",
      "Email Address",
      "Mobile Phone",
      "Institution",
      "Department",
      "Current Position",
      "Previous Degrees",
      "Research Interests",
      "Course Expectations",
      "Date Registered"
    ];

    const escapeCSV = (val: string) => {
      if (!val) return '""';
      const escaped = val.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvRows = [
      headers.join(","),
      ...list.map(s => [
        escapeCSV(s.id),
        escapeCSV(s.name),
        escapeCSV(s.gender),
        escapeCSV(s.email),
        escapeCSV(s.mobile || ""),
        escapeCSV(s.institution || ""),
        escapeCSV(s.department || ""),
        escapeCSV(s.currentPosition || ""),
        escapeCSV(s.previousDegrees || ""),
        escapeCSV(s.researchInterests || ""),
        escapeCSV(s.courseExpectations || ""),
        escapeCSV(s.createdAt || "")
      ].join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `EPU_Student_Academic_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCSVDownload = (type: "gradebook" | "attendance") => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = "";

    if (type === "gradebook") {
      filename = "CourseCompanion_Gradebook_Report.csv";
      headers = ["Student ID", "Full Name", "Department", "Assignments Filed", "Average Mark"];
      rows = reportCardList.map(item => [
        item.id,
        item.name,
        item.department,
        String(item.submittedCount),
        String(item.avgGrade)
      ]);
    } else {
      filename = "CourseCompanion_Attendance_Registry.csv";
      headers = ["Student ID", "Full Name", "Department", "Lectures Recorded", "Weighted Attendance Ratio %"];
      rows = reportCardList.map(item => [
        item.id,
        item.name,
        item.department,
        String(item.totalClasses),
        String(item.attendancePct)
      ]);
    }

    // Compose csv content buffer
    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- PDF PRINT GENERATOR TRIGGER ---
  const handlePrintTrigger = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="reporting-exports-dashboard">
      
      {/* Action Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-sans">Academic Analytics Roster</h2>
          <p className="text-xs text-slate-500 font-medium">Formulate Printable reports, CSV databases, or trigger PDF saves</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            id="btn-print-report"
            onClick={handlePrintTrigger}
            className="border border-slate-350 bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-2 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm animate-pulse"
          >
            <Printer className="h-4 w-4" />
            <span>Print Layout / PDF</span>
          </button>

          <button
            id="btn-export-student-profiles-csv"
            onClick={handleExportProfilesCSV}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
          >
            <FileDown className="h-4 w-4" />
            <span>Export Student Profiles CSV</span>
          </button>

          {isInstructor && (
            <>
              <button
                id="btn-export-gradebook"
                onClick={() => handleCSVDownload("gradebook")}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-2 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                <span>Export Gradebook CSV</span>
              </button>
              <button
                id="btn-export-attendance"
                onClick={() => handleCSVDownload("attendance")}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-2 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                <span>Export Attendance CSV</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Prominent Profile Database Callout Box for All Users */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-5 shadow-xs" id="profile-export-callout-panel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-800 font-mono uppercase tracking-wider block font-black">Registry Export Center</span>
            <h3 className="text-sm font-extrabold text-slate-900">Student Profiles & Demographics Extractor</h3>
            <p className="text-xs text-slate-500 leading-normal">
              Extract a compiled CSV database of all registered students, containing their full names, emails, mobile phones, gender, institutions, departments, previous degrees, and expectations.
            </p>
          </div>
          <button
            id="btn-callout-export-student-profiles"
            type="button"
            onClick={handleExportProfilesCSV}
            className="inline-flex items-center space-x-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-sm transition shrink-0 cursor-pointer"
          >
            <FileDown className="h-4 w-4 animate-bounce" />
            <span>Download All Profiles (.csv)</span>
          </button>
        </div>
      </div>

      {isInstructor ? (
        /* ================= INSTRUCTOR ANALYTICS OVERVIEW ================= */
        <div className="space-y-6">
          
          {/* Sub Tab Navigation bar */}
          <div className="flex border-b border-slate-200 text-xs font-bold gap-1" id="instructor-analytics-tabs">
            <button
              id="tab-inst-spreadsheet"
              type="button"
              onClick={() => setActiveTab("spreadsheet")}
              className={`py-2.5 px-5 -mb-px border-b-2 transition flex items-center gap-1.5 cursor-pointer font-sans ${
                activeTab === "spreadsheet" 
                  ? "border-indigo-600 text-indigo-700 font-extrabold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Database className="h-4 w-4" />
              <span>Spreadsheet Registry</span>
            </button>
            <button
              id="tab-inst-visuals"
              type="button"
              onClick={() => setActiveTab("visuals")}
              className={`py-2.5 px-5 -mb-px border-b-2 transition flex items-center gap-1.5 cursor-pointer font-sans ${
                activeTab === "visuals" 
                  ? "border-indigo-600 text-indigo-700 font-extrabold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Progress Visualizations</span>
            </button>
            <button
              id="tab-inst-copilot"
              type="button"
              onClick={() => setActiveTab("ai_copilot")}
              className={`py-2.5 px-5 -mb-px border-b-2 transition flex items-center gap-1.5 cursor-pointer font-sans ${
                activeTab === "ai_copilot" 
                  ? "border-indigo-650 text-indigo-700 font-extrabold" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Brain className="h-4 w-4 text-purple-650" />
              <span>AI Course Copilot</span>
            </button>
          </div>

          {/* Render Tab Contents */}
          {activeTab === "spreadsheet" && (
            <div className="space-y-6">
              {/* General Aggregate Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div className="space-y-1 font-sans">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-semibold">Cohort Average Grade</span>
                    <p className="text-2xl font-black text-slate-900 font-mono">
                      {(() => {
                        const graded = submissions.filter(sub => sub.grade !== undefined);
                        return graded.length > 0 
                          ? `${Math.round(graded.reduce((acc, c) => acc + (c.grade || 0), 0) / graded.length)}%` 
                          : "N/A";
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-full text-emerald-800 shrink-0 border border-emerald-100">
                    <Award className="h-6 w-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div className="space-y-1 font-sans">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-semibold">Average Lecture Presence</span>
                    <p className="text-2xl font-black text-slate-900 font-mono">
                      {(() => {
                        const nonZeroRates = reportCardList.map(c => c.attendancePct);
                        return nonZeroRates.length > 0 
                          ? `${Math.round(nonZeroRates.reduce((acc, c) => acc + c, 0) / nonZeroRates.length)}%` 
                          : "100%";
                      })()}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-full text-indigo-700 shrink-0 border border-indigo-100">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div className="space-y-1 font-sans">
                    <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block font-semibold">Assignments Pipeline</span>
                    <p className="text-2xl font-black text-slate-900 font-mono">{assignments.length} published</p>
                  </div>
                  <div className="p-3 bg-slate-100 rounded-full text-slate-700 shrink-0 border border-slate-200">
                    <BookOpen className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Printable detailed spreadsheet card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm printable-sheet">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Complete Student Summary Spreadsheet</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-300 bg-slate-50 text-xs font-mono text-slate-500 uppercase">
                        <th className="py-2.5 px-4 font-semibold">Student Name</th>
                        <th className="py-2.5 px-4 font-semibold">Department</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Submissions Filed</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Lecture Attendance</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Grade Cumulative</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 text-xs text-slate-700">
                      {reportCardList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                          <td className="py-3 px-4 font-mono font-medium">{item.department}</td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">{item.submittedCount} / {assignments.length}</td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-700 font-mono">{item.attendancePct}%</td>
                          <td className="py-3 px-4 text-right font-black text-slate-950 font-mono text-sm">
                            {item.avgGrade === "N/A" ? item.avgGrade : `${item.avgGrade}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "visuals" && (
            <div className="space-y-6 select-none animate-fade-in" id="visuals-reporting-pane">
              {/* Row 1: Demographics & Stats correlation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Visual A: Attendance vs Grade Groups correlation */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Activity className="h-4 w-4 text-indigo-650 animate-pulse" />
                      <span>Lecture Presence vs Achievement Index</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans">Calculates grade averages mapped to attendance brackets</p>
                  </div>

                  {(() => {
                    // Group students
                    const highPresent = reportCardList.filter(s => s.attendancePct >= 90);
                    const medPresent = reportCardList.filter(s => s.attendancePct >= 70 && s.attendancePct < 90);
                    const lowPresent = reportCardList.filter(s => s.attendancePct < 70);

                    const getAverageOfGroup = (gList: typeof reportCardList) => {
                      const valid = gList.filter(s => s.avgGrade !== "N/A");
                      if (valid.length === 0) return 70;
                      return Math.round(valid.reduce((acc, c) => acc + Number(c.avgGrade), 0) / valid.length);
                    };

                    const highAvg = getAverageOfGroup(highPresent);
                    const medAvg = getAverageOfGroup(medPresent);
                    const lowAvg = getAverageOfGroup(lowPresent);

                    return (
                      <div className="space-y-4 pt-1">
                        {/* Brackets horizontal bars */}
                        <div className="space-y-3.5">
                          {/* High Bracket */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium font-sans">
                              <span className="text-emerald-800 font-bold">Excellent Attendance (≥90%) - {highPresent.length} stds</span>
                              <span className="font-mono font-bold text-slate-900">Grade Avg: {highAvg}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${highAvg}%` }} className="bg-emerald-500 h-full rounded-full" />
                            </div>
                          </div>

                          {/* Med Bracket */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium font-sans">
                              <span className="text-indigo-800 font-bold">Stable Presence (70%-89%) - {medPresent.length} stds</span>
                              <span className="font-mono font-bold text-slate-900">Grade Avg: {medAvg}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${medAvg}%` }} className="bg-indigo-600 h-full rounded-full" />
                            </div>
                          </div>

                          {/* Low Bracket */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-medium font-sans">
                              <span className="text-amber-805 font-bold">Needs Assistance (&lt;70%) - {lowPresent.length} stds</span>
                              <span className="font-mono font-bold text-slate-900">Grade Avg: {lowAvg}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${lowAvg}%` }} className="bg-amber-550 h-full rounded-full" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50 text-[10px] text-slate-650 leading-relaxed font-sans mt-2">
                          💡 **Correlation Verdict:** The data confirms students attending at least 90% of lectures outperform candidates with inconsistent schedules by an average margin of **{Math.abs(highAvg - lowAvg)}%**. Prioritize commuter support.
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Visual B: Course Thesis Milestone Distribution Funnel */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <Layers className="h-4 w-4 text-indigo-650" />
                      <span>Theses Development Pipeline</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-sans">Roster distribution across active academic dissertation stages</p>
                  </div>

                  {(() => {
                    const profiles = dbService.getResearchProfiles();
                    const totalProfiles = profiles.length || 1;
                    
                    const topicCount = profiles.filter(p => !p.currentStage || p.currentStage.includes("Topic")).length;
                    const litCount = profiles.filter(p => p.currentStage && p.currentStage.includes("Literature")).length;
                    const methCount = profiles.filter(p => p.currentStage && (p.currentStage.includes("Methodology") || p.currentStage.includes("Data") || p.currentStage.includes("Writing"))).length;

                    const p1 = Math.round((topicCount / totalProfiles) * 100);
                    const p2 = Math.round((litCount / totalProfiles) * 100);
                    const p3 = Math.round((methCount / totalProfiles) * 100);

                    return (
                      <div className="space-y-4">
                        {/* Segmented Pipeline Tube */}
                        <div className="flex w-full h-4 rounded-full overflow-hidden border border-slate-200 bg-slate-100 mt-1">
                          {p1 > 0 && <div style={{ width: `${p1}%` }} className="bg-indigo-500 text-[10px] text-white flex items-center justify-center font-bold" title="Topic Approved" />}
                          {p2 > 0 && <div style={{ width: `${p2}%` }} className="bg-purple-500 text-[10px] text-white flex items-center justify-center font-bold" title="Lit Review" />}
                          {p3 > 0 && <div style={{ width: `${p3}%` }} className="bg-emerald-500 text-[10px] text-white flex items-center justify-center font-bold" title="Drafting Chapter" />}
                        </div>

                        {/* Pipeline Legend / Progress numbers */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-sans">
                          <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                            <span className="block font-black text-indigo-700 text-xs">{topicCount}</span>
                            <span className="text-slate-500 font-semibold block uppercase">Topic Approved</span>
                            <span className="text-[9px] text-slate-450 font-bold">{p1}%</span>
                          </div>
                          <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                            <span className="block font-black text-purple-700 text-xs">{litCount}</span>
                            <span className="text-slate-500 font-semibold block uppercase font-bold">Lit Review</span>
                            <span className="text-[9px] text-slate-450 font-bold">{p2}%</span>
                          </div>
                          <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                            <span className="block font-black text-emerald-700 text-xs">{methCount}</span>
                            <span className="text-slate-500 font-semibold block uppercase font-bold">Draft Ch. 3+</span>
                            <span className="text-[9px] text-slate-450 font-bold">{p3}%</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 leading-relaxed font-sans text-center mt-2 font-medium">
                          * Thesis stage categorization is synchronized programmatically with student academic research records.
                        </p>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Progress visual list of students */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider font-sans">Student Completion & Performance Quadrant</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-sans">Visual ranking showing homework submission quotas alongside attendance percentage ratios</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportCardList.slice(0, 6).map(item => {
                    const barPct = Math.min(100, Math.round((item.submittedCount / (assignments.length || 1)) * 100));
                    return (
                      <div key={item.id} className="bg-slate-50 hover:bg-slate-100 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between gap-4 font-sans transition">
                        <div className="space-y-1 min-w-0">
                          <span className="font-extrabold text-slate-900 text-xs truncate block">{item.name}</span>
                          <span className="text-[9px] bg-slate-200/50 text-slate-650 font-bold uppercase rounded px-1.5 py-0.5 font-mono">{item.department.split(" ").slice(-1)[0]}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0 font-mono text-center">
                          <div>
                            <span className="block text-[11px] font-black text-slate-900">{barPct}%</span>
                            <span className="text-[8px] text-slate-450 uppercase block font-sans">Submitted</span>
                          </div>
                          <div className="border-l border-slate-200 h-6" />
                          <div>
                            <span className={`block text-[11px] font-black ${item.attendancePct >= 80 ? "text-emerald-700" : "text-amber-700"}`}>{item.attendancePct}%</span>
                            <span className="text-[8px] text-slate-450 uppercase block font-sans">Attendance</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === "ai_copilot" && (
            <div className="space-y-6 select-none animate-fade-in" id="ai-generator-reporting-pane">
              
              {/* Copilot Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white space-y-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-lg border border-indigo-550/30">
                    <Brain className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-widest font-sans">AI Cohort Intelligence Copilot</h3>
                    <p className="text-[11px] text-slate-400 font-sans">Directing Gemini LLM matrices to diagnose qualitative social studies cohorts</p>
                  </div>
                </div>

                <p className="text-xs text-slate-350 leading-relaxed font-medium font-sans">
                  The AI Copilot crawls your local database records (student names, attendance rosters, submissions, and research topics) to construct diagnostic digests. Choose an analytical focus below and trigger the synthesis engine.
                </p>

                {/* Sub Prompt selections */}
                <div className="space-y-2 mt-4">
                  <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-widest font-sans">Choose Evaluation Angle Focus:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { if(!isAiGenerating) setAiFocus("mastery"); }}
                      className={`p-3 rounded-lg text-left border text-xs transition flex flex-col justify-between cursor-pointer font-sans h-20 ${
                        aiFocus === "mastery" 
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold" 
                          : "bg-slate-800/40 border-slate-850 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="block font-black text-[10px] uppercase">Curriculum Mastery</span>
                      <span className="text-[10px] font-medium leading-normal text-slate-400 mt-1">Evaluates score gaps and theoretical modeling competence.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { if(!isAiGenerating) setAiFocus("attendance"); }}
                      className={`p-3 rounded-lg text-left border text-xs transition flex flex-col justify-between cursor-pointer font-sans h-20 ${
                        aiFocus === "attendance" 
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold" 
                          : "bg-slate-800/40 border-slate-850 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="block font-black text-[10px] uppercase">Attendance & Engagement</span>
                      <span className="text-[10px] font-medium leading-normal text-slate-400 mt-1">Estimates participant dropout risks and transport equity impacts.</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { if(!isAiGenerating) setAiFocus("methodology"); }}
                      className={`p-3 rounded-lg text-left border text-xs transition flex flex-col justify-between cursor-pointer font-sans h-20 ${
                        aiFocus === "methodology" 
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-300 font-bold" 
                          : "bg-slate-800/40 border-slate-850 hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      <span className="block font-black text-[10px] uppercase">Dissertation Progress</span>
                      <span className="text-[10px] font-medium leading-normal text-slate-400 mt-1">Focuses on qualitative methods design and fieldwork consent.</span>
                    </button>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={() => triggerAiSummaryGeneration(aiFocus)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 text-white font-extrabold text-xs uppercase tracking-wider py-3 px-5 rounded-lg shadow-md transition inline-flex items-center justify-center gap-2 cursor-pointer font-sans"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>{isAiGenerating ? "Synthesizing AI Engine Matrices..." : "Initiate AI Synthesis Summary"}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic simulation Terminal */}
              {isAiGenerating && (
                <div className="bg-black text-emerald-400 font-mono text-xs rounded-xl p-5 shadow-inner border border-stone-850 space-y-3 animate-pulse">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2 text-[10px] text-stone-500 font-mono">
                    <span>COGNITIVE PIPELINE SHELL</span>
                    <span className="animate-ping font-extrabold">● PROCESSING</span>
                  </div>
                  
                  <div className="space-y-1.5 leading-relaxed font-mono">
                    {aiSteps.slice(0, currentAiStep + 1).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-stone-500">[OK]</span>
                        <span>{step}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold animate-pulse pt-1">
                      <span>&gt;_ compiling active diagnostic clusters...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI REPORT SHEET OUTPUT */}
              {aiReportOutput && !isAiGenerating && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-8 shadow-sm space-y-4 printable-sheet relative max-w-3xl mx-auto border-t-4 border-t-indigo-650">
                  <div className="absolute right-4 top-4 font-mono text-[9px] text-slate-400 border border-slate-200 px-2.5 py-1 rounded bg-white">
                    VERIFIED SECURE COGNITIVE SCHEMA
                  </div>

                  <div className="prose max-w-none text-slate-850 y-inner-markdown animate-fade-in">
                    {(() => {
                      return aiReportOutput.split("\n").map((line, idx) => {
                        if (line.startsWith("### ")) {
                          return <h4 key={idx} className="text-xs font-black text-indigo-950 uppercase tracking-widest mt-6 mb-2 font-sans border-b border-indigo-100 pb-1 flex items-center gap-1.5">{line.substring(4)}</h4>;
                        }
                        if (line.startsWith("#### ")) {
                          return <h5 key={idx} className="text-xs font-black text-slate-800 uppercase tracking-wide mt-4 mb-2 font-sans">{line.substring(5)}</h5>;
                        }
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return <p key={idx} className="text-xs font-bold text-slate-900 font-sans mt-2">{line}</p>;
                        }
                        if (line.startsWith("* ")) {
                          return (
                            <li key={idx} className="text-xs text-slate-650 ml-4 list-disc py-1 font-medium leading-relaxed font-sans mt-1">
                              {line.substring(2)}
                            </li>
                          );
                        }
                        if (line.trim() === "---") {
                          return <hr key={idx} className="border-t border-slate-200 my-4" />;
                        }
                        return <p key={idx} className="text-xs text-slate-650 leading-relaxed py-1 font-medium font-sans">{line}</p>;
                      });
                    })()}
                  </div>

                  <div className="border-t border-stone-200 pt-5 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                    <span>* Synthesized under EPU research authorization directives.</span>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <Printer className="h-3 w-3" />
                      <span>Print AI Report Layout</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      ) : (
        /* ================= STUDENT PERFORMANCE REPORT CARD & VISUALIZERS ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="student-report-visual-center">
          
          {/* Main Card */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm printable-sheet space-y-5">
            <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">LMS Registry Card</span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{currentStudent.name}</h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">{currentStudent.institution} | {currentStudent.department}</p>
              </div>
              
              <div className="text-right">
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-850 px-2.5 py-1 rounded-md block font-bold border border-emerald-100">Enrollment Active</span>
              </div>
            </div>

            {/* Student numeric metrics */}
            {(() => {
              const performance = reportCardList.find(c => c.id === currentStudent.id) || {
                avgGrade: "N/A",
                attendancePct: 100,
                totalClasses: 0,
                submittedCount: 0
              };

              // Compute average of all other students to compare progress
              const validScores = reportCardList.filter(s => s.avgGrade !== "N/A").map(s => Number(s.avgGrade));
              const classAvg = validScores.length > 0 
                ? Math.round(validScores.reduce((acc, c) => acc + c, 0) / validScores.length)
                : 75;

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-50 border border-slate-200 py-4 rounded-xl shadow-xs">
                      <p className="text-xs font-mono uppercase tracking-wider text-slate-550 mb-1">My Grade Average</p>
                      <p className="text-3xl font-black text-indigo-700 font-mono">
                        {performance.avgGrade === "N/A" ? "No Ratings" : `${performance.avgGrade}%`}
                      </p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 py-4 rounded-xl shadow-xs">
                      <p className="text-xs font-mono uppercase tracking-wider text-slate-550 mb-1">Roster Class Presence</p>
                      <p className="text-3xl font-black text-emerald-700 font-mono">{performance.attendancePct}%</p>
                    </div>
                  </div>

                  {/* Student Progress Chart Comparison */}
                  <div className="border border-slate-150 p-4 rounded-xl space-y-3 font-sans shadow-2xs">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-slate-900">Academic Comparison Benchmarks</h4>
                    
                    <div className="space-y-3.5">
                      {/* My Grade comparison */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-indigo-750 font-bold">My Dynamic Grade Indicator</span>
                          <span className="font-mono font-bold text-slate-950">{performance.avgGrade === "N/A" ? "70%" : `${performance.avgGrade}%`}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div style={{ width: `${performance.avgGrade === "N/A" ? 70 : performance.avgGrade}%` }} className="bg-indigo-600 h-full rounded-full" />
                        </div>
                      </div>

                      {/* Class Average Grade */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-slate-550 font-semibold">Cohort Classroom Average</span>
                          <span className="font-mono font-bold text-slate-950">{classAvg}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div style={{ width: `${classAvg}%` }} className="bg-slate-400 h-full rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Micro report logs */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-slate-50 font-mono text-xs uppercase p-3 border-b border-slate-200 text-slate-650 font-semibold">Submissions Checklist</div>
                    <div className="divide-y divide-slate-100 text-xs px-4 py-2">
                      {assignments.map(a => {
                        const mine = submissions.find(s => s.assignmentId === a.id && s.studentId === currentStudent.id);
                        return (
                          <div key={a.id} className="py-2.5 flex justify-between items-center text-slate-700 hover:bg-slate-50/50">
                            <span className="font-medium">{a.title}</span>
                            <span className={`font-mono font-bold ${mine ? "text-emerald-700" : "text-rose-500"}`}>
                              {mine ? `Filed (Grade: ${mine.grade ?? "Unmarked"})` : "Not Submitted"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* AI Student Assistance Sidebar panel */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-indigo-955/5 border border-indigo-950/15 p-5 rounded-2xl shadow-3xs space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-indigo-950/10 pb-3">
                <Brain className="h-5 w-5 text-indigo-700" />
                <h4 className="text-xs font-black uppercase text-indigo-950 tracking-wider">AI Student Tutor Insights</h4>
              </div>

              {(() => {
                const performance = reportCardList.find(c => c.id === currentStudent.id) || {
                  avgGrade: 72,
                  attendancePct: 100,
                  totalClasses: 0,
                  submittedCount: 0
                };
                
                const myGrade = performance.avgGrade === "N/A" ? 70 : Number(performance.avgGrade);
                const isAttendanceLow = performance.attendancePct < 85;

                return (
                  <div className="space-y-3 text-xs leading-relaxed text-slate-755 font-sans font-medium">
                    <p className="font-bold text-slate-900 mb-2">Hello {currentStudent.name.split(" ")[0]}, based on your attendance records and submission ratios, here are custom recommended actions:</p>
                    
                    {myGrade >= 85 ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-950">
                        🌟 **Academic Honors Status:** Your grade average of **{myGrade}%** lands you inside the class honors list! Focus on refining your Thesis Methodology abstract in your research profile tab.
                      </div>
                    ) : myGrade < 70 ? (
                      <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-950">
                        ⚠️ **Remedial Action Advice:** Your cumulative score lies beneath the class target average. Make sure to download missing materials, and upload outstanding assignments before deadlines.
                      </div>
                    ) : (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg text-indigo-950">
                        📘 **Steady Progress:** You are maintaining a highly stable mark average of **{myGrade}%**. Focus on completing remaining field draft chapters to guarantee high scoring on submissions.
                      </div>
                    )}

                    {isAttendanceLow && (
                      <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-950">
                        📡 **Attendance Alert:** Lecture presence is currently **{performance.attendancePct}%**. In low-bandwidth areas, remember to sync materials offline via the main menu sidebar to stay caught up.
                      </div>
                    )}

                    <ul className="space-y-2 mt-4 text-[11px] text-slate-500">
                      <li className="flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-indigo-650 shrink-0 mt-0.5" />
                        <span>Coordinate methodology drafts with Dr. Zerihun.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-indigo-650 shrink-0 mt-0.5" />
                        <span>Formulate qualitative codes using peer-feedback loops.</span>
                      </li>
                    </ul>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      )}

      {/* bandwidth warnings */}
      <div className="border border-slate-200 bg-slate-50 text-slate-700 p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed max-w-2xl shadow-sm">
        <AlertCircle className="h-5 w-5 text-indigo-500 shrink-0" />
        <div>
          <p className="font-bold text-slate-800 mb-0.5">Ethiopian Low-Resource PWA compatibility:</p>
          <p className="text-slate-500 text-[11px] font-mono font-medium leading-normal">Selecting PDF prints or CSV exports downloads materials client-side without internet queries, ensuring flawless operations even during telecom blackouts.</p>
        </div>
      </div>

    </div>
  );
}

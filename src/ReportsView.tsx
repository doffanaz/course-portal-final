/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Student, Attendance, Submission, Assignment } from "../types";
import { dbService } from "../lib/db";
import { FileDown, Printer, Award, ArrowUpRight, TrendingUp, AlertCircle, BookOpen } from "lucide-react";

interface ReportsProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function ReportsView({ isInstructor, currentStudent }: ReportsProps) {
  const students = dbService.getStudents();
  const assignments = dbService.getAssignments();
  const submissions = dbService.getSubmissions();
  const sheets = dbService.getAttendanceSheets();

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
            className="border border-slate-350 bg-white text-slate-900 hover:bg-slate-100 px-3.5 py-2 rounded-md font-semibold text-xs flex items-center space-x-1.5 transition shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Print Layout / PDF</span>
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

      {isInstructor ? (
        /* ================= INSTRUCTOR ANALYTICS OVERVIEW ================= */
        <div className="space-y-6">
          
          {/* General Aggregate Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
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
              <div className="space-y-1">
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
              <div className="space-y-1">
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
      ) : (
        /* ================= STUDENT PERFORMANCE REPORT CARD ================= */
        <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl shadow-sm printable-sheet space-y-5">
          <div className="border-b border-slate-200 pb-4 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 font-bold tracking-wider">LMS Registry Card</span>
              <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{currentStudent.name}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{currentStudent.institution} | {currentStudent.department}</p>
            </div>
            
            <div className="text-right">
              <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md block font-bold border border-emerald-100">Enrollment Active</span>
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

            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                  <div className="bg-slate-50 border border-slate-200 py-4 rounded-xl shadow-xs">
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-550 mb-1">My Grade Average</p>
                    <p className="text-3xl font-black text-slate-900 font-mono">
                      {performance.avgGrade === "N/A" ? "No Ratings" : `${performance.avgGrade}%`}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 py-4 rounded-xl shadow-xs">
                    <p className="text-xs font-mono uppercase tracking-wider text-slate-550 mb-1">Roster Class Presence</p>
                    <p className="text-3xl font-black text-slate-900 font-mono">{performance.attendancePct}%</p>
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

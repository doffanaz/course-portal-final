/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Attendance } from "../types";
import { dbService } from "../lib/db";
import { Check, X, Clock, Calendar, Save, Award, Info } from "lucide-react";

interface AttendanceProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function AttendanceView({ isInstructor, currentStudent }: AttendanceProps) {
  const students = dbService.getStudents();
  const sheets = dbService.getAttendanceSheets();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [currentRecords, setCurrentRecords] = useState<Record<string, "present" | "absent" | "late">>({});
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Synchronize initial records for selectedDate
  React.useEffect(() => {
    const existingSheet = sheets.find(s => s.date === selectedDate);
    if (existingSheet) {
      setCurrentRecords({ ...existingSheet.records });
    } else {
      // Default all to Present for easy initial recording
      const defaults: Record<string, "present" | "absent" | "late"> = {};
      students.forEach(s => {
        defaults[s.id] = "present";
      });
      setCurrentRecords(defaults);
    }
  }, [selectedDate, sheets, students]);

  const setStatus = (studentId: string, status: "present" | "absent" | "late") => {
    setCurrentRecords(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveSheet = () => {
    const sheetId = selectedDate;
    const newSheet: Attendance = {
      id: sheetId,
      date: selectedDate,
      records: currentRecords,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    dbService.saveAttendanceSheet(newSheet);
    setSaveToast(`Attendance roster cached for ${selectedDate}`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Calculations for analytics
  const getStudentStats = (studentId: string) => {
    let present = 0;
    let absent = 0;
    let late = 0;
    
    sheets.forEach(sheet => {
      const status = sheet.records[studentId];
      if (status === "present") present++;
      else if (status === "absent") absent++;
      else if (status === "late") late++;
    });

    const totalClasses = present + absent + late;
    // Late counts as 0.5 present for attendance ratio calculation
    const presentWeight = present + (late * 0.5);
    const percentage = totalClasses > 0 ? Math.round((presentWeight / totalClasses) * 100) : 100;

    return { present, absent, late, totalClasses, percentage };
  };

  return (
    <div className="space-y-6" id="attendance-tracking-view">
      
      {/* Sync / Save alerts */}
      {saveToast && (
        <div className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm flex items-center shadow-md">
          <span>{saveToast}</span>
        </div>
      )}

      {isInstructor ? (
        /* ================= INSTRUCTOR VIEW ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Attendance Editor Grid */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Attendance Log Editor</h2>
                <p className="text-xs text-slate-500 font-medium">Record daily lectures presence or absence metrics</p>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <input
                  id="attendance-date-selector"
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="text-xs font-mono border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase font-mono bg-slate-50">
                    <th className="py-3 px-4 font-semibold">Student Name / Dept</th>
                    <th className="py-3 px-4 font-semibold text-center w-24">Present (P)</th>
                    <th className="py-3 px-4 font-semibold text-center w-24">Late (L)</th>
                    <th className="py-3 px-4 font-semibold text-center w-24">Absent (A)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map(s => {
                    const status = currentRecords[s.id] || "present";
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{s.department}</p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`btn-p-${s.id}`}
                            onClick={() => setStatus(s.id, "present")}
                            className={`p-1.5 rounded-full transition ${status === "present" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                          >
                            <Check className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`btn-l-${s.id}`}
                            onClick={() => setStatus(s.id, "late")}
                            className={`p-1.5 rounded-full transition ${status === "late" ? "bg-amber-100 text-amber-805" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                          >
                            <Clock className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`btn-a-${s.id}`}
                            onClick={() => setStatus(s.id, "absent")}
                            className={`p-1.5 rounded-full transition ${status === "absent" ? "bg-rose-105 text-rose-800" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                          >
                            <X className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-5 border-t border-slate-100 mt-5">
              <button
                id="btn-save-attendance"
                onClick={handleSaveSheet}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md font-medium text-xs flex items-center space-x-2 transition shadow-sm font-semibold"
              >
                <Save className="h-4 w-4" />
                <span>Save Daily Registry</span>
              </button>
            </div>
          </div>

          {/* Aggregate Attendance Stats card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4">
                <Award className="h-5 w-5 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Roster Cumulative</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 font-medium">Cumulative metrics processed for all active course sessions</p>

              <div className="space-y-3.5">
                {students.map(s => {
                  const { percentage, present, late, totalClasses } = getStudentStats(s.id);
                  return (
                    <div key={s.id} className="bg-white border border-slate-250 p-3 rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-1.5">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{s.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Present: {present} | Late: {late} | Classes: {totalClasses}</p>
                        </div>
                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${percentage >= 85 ? "bg-emerald-50 text-emerald-800" : percentage >= 75 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-800"}`}>
                          {percentage}%
                        </span>
                      </div>
                      
                      {/* Percent slider bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full rounded-full ${percentage >= 85 ? "bg-emerald-600" : percentage >= 75 ? "bg-amber-500" : "bg-rose-500"}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed shadow-sm">
              <Info className="h-5 w-5 text-indigo-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 mb-0.5">Ethiopia Network Optimization Rule:</p>
                <p className="text-slate-500 text-[11px] font-medium leading-normal">Rosters are cached completely within LocalStorage outboxes. Changes will push seamlessly to cloud instances once network services become active.</p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* ================= STUDENT PERSONAL VIEW ================= */
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-2">My Lecture Attendance Ledger</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Review your attendance ratios registered by administrative lectures</p>

            {/* General metrics dashboard */}
            {(() => {
              const { present, absent, late, totalClasses, percentage } = getStudentStats(currentStudent.id);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center shadow-xs">
                      <p className="text-2xl font-black font-mono text-slate-900">{percentage}%</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">Weighted Attendance</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center shadow-xs">
                      <p className="text-2xl font-black font-mono text-emerald-800">{present}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">Present Log</p>
                    </div>
                    <div className="bg-amber-55 border border-amber-100 rounded-xl p-4 text-center shadow-xs">
                      <p className="text-2xl font-black font-mono text-amber-805">{late}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">Late Roster</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-center shadow-xs">
                      <p className="text-2xl font-black font-mono text-rose-800">{absent}</p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mt-1">Absent Log</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 font-mono text-xs font-bold uppercase text-slate-650">
                      Roster Timeline
                    </div>
                    <div className="divide-y divide-slate-100 font-mono text-xs">
                      {sheets.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400">No formal logs filed by instructor yet.</div>
                      ) : (
                        [...sheets].reverse().map(sheet => {
                          const status = sheet.records[currentStudent.id] || "absent";
                          return (
                            <div key={sheet.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50/50">
                              <span className="font-semibold text-slate-800">{sheet.date}</span>
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${status === "present" ? "bg-emerald-100 text-emerald-800" : status === "late" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>
                                {status}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}

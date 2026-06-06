/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Attendance } from "../types";
import { dbService } from "../lib/db";
import { 
  Check, X, Clock, Calendar, Save, Award, Info, QrCode, ScanLine, 
  Camera, Download, ExternalLink, CalendarDays, CheckCircle2, AlertCircle 
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

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

  // New QR & Passcode states
  const [isQrPanelOpen, setIsQrPanelOpen] = useState(false);
  const [studentScanActive, setStudentScanActive] = useState(false);
  const [manualPasscode, setManualPasscode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [html5QrCodeInstance, setHtml5QrCodeInstance] = useState<Html5Qrcode | null>(null);

  // Helper: Get deterministic 4-digit passcode for any date
  const getPasscodeForDate = (dateStr: string) => {
    const seed = dateStr.replace(/-/g, "");
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const numericCode = Math.abs(hash % 9000) + 1000;
    return String(numericCode);
  };

  // Helper: Export ICS calendar files
  const handleDownloadICS = (title: string, desc: string, dateStr: string) => {
    const cleanDate = dateStr.replace(/-/g, "");
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DodaZ//NONSGML Course Companion Portal//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `DTSTART;VALUE=DATE:${cleanDate}`,
      `DTEND;VALUE=DATE:${cleanDate}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc.replace(/\n/g, "\\n")}`,
      "STATUS:CONFIRMED",
      "SEQUENCE:0",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, "_")}_${dateStr}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSaveToast(`Calendar event exported successfully (${dateStr})`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const getGoogleCalendarUrl = (title: string, desc: string, dateStr: string) => {
    const cleanDate = dateStr.replace(/-/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${cleanDate}/${cleanDate}&details=${encodeURIComponent(desc)}&sf=true&output=xml`;
  };

  const handleExportAssignmentsCalendar = () => {
    const list = dbService.getAssignments();
    if (list.length === 0) {
      alert("No assignments registered yet to sync onto calendar.");
      return;
    }
    
    const events: string[] = [];
    list.forEach(a => {
      const cleanDate = a.dueDate.replace(/-/g, "");
      events.push(
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `DTEND;VALUE=DATE:${cleanDate}`,
        `SUMMARY:[Due Date] ${a.title}`,
        `DESCRIPTION:${a.description.replace(/\n/g, "\\n")} - Course Assignment Deadline`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DodaZ//NONSGML Course Companion Portal//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assignment_deadlines_${new Date().toISOString().split("T")[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSaveToast("Assignment deadlines exported to your calendar!");
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleExportLecturesCalendar = () => {
    const sheetsList = dbService.getAttendanceSheets();
    if (sheetsList.length === 0) {
      handleDownloadICS(
        "Academic Course Lecture Session",
        `Attendance tracking verification code: ${getPasscodeForDate(selectedDate)}`,
        selectedDate
      );
      return;
    }

    const events: string[] = [];
    sheetsList.forEach(sheet => {
      const cleanDate = sheet.date.replace(/-/g, "");
      const code = getPasscodeForDate(sheet.date);
      events.push(
        "BEGIN:VEVENT",
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `DTEND;VALUE=DATE:${cleanDate}`,
        `SUMMARY:Academic Course Lecture - EPU`,
        `DESCRIPTION:Daily course session lectures logging. Access passcode: ${code}`,
        "STATUS:CONFIRMED",
        "END:VEVENT"
      );
    });

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//DodaZ//NONSGML Course Companion Portal//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR"
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `course_lectures_${new Date().toISOString().split("T")[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setSaveToast("Full course lecture schedule exported!");
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Student checking in logic
  const handleStudentCheckIn = (dateStr: string, passcodeStr: string) => {
    const expectedPasscode = getPasscodeForDate(dateStr);
    if (passcodeStr.trim() !== expectedPasscode) {
      setScanError("Invalid Verification Passcode. Please check the screen code or verify with your instructor.");
      return false;
    }

    const sheetsList = dbService.getAttendanceSheets();
    const existingSheet = sheetsList.find(s => s.date === dateStr);
    
    const records = existingSheet ? { ...existingSheet.records } : {};
    if (!existingSheet) {
      students.forEach(s => {
        records[s.id] = "absent"; 
      });
    }
    
    records[currentStudent.id] = "present";

    const updatedSheet: Attendance = {
      id: dateStr,
      date: dateStr,
      records,
      createdAt: existingSheet?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    dbService.saveAttendanceSheet(updatedSheet);
    
    setScanSuccessMsg(`Checked in successful! Marked present for ${dateStr}`);
    setScanError(null);
    setManualPasscode("");
    
    setSaveToast(`Check-In Confirmed on ${dateStr}!`);
    setTimeout(() => {
      setSaveToast(null);
      setScanSuccessMsg(null);
    }, 4000);
    return true;
  };

  // Scanner controls
  const startScanner = () => {
    setStudentScanActive(true);
    setScanError(null);
    
    setTimeout(() => {
      try {
        const instance = new Html5Qrcode("reader");
        setHtml5QrCodeInstance(instance);
        instance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 }
          },
          (decodedText) => {
            const parts = decodedText.split(":");
            if (parts[0] === "DODAZ-CHECKIN" && parts.length >= 3) {
              const scannedDate = parts[1];
              const scannedPasscode = parts[2];
              
              const isCheckedIn = handleStudentCheckIn(scannedDate, scannedPasscode);
              if (isCheckedIn) {
                instance.stop().then(() => {
                  setStudentScanActive(false);
                  setHtml5QrCodeInstance(null);
                }).catch(err => console.warn(err));
              }
            } else {
              setScanError("Scanned QR is not an official DodaZ Attendance ticket.");
            }
          },
          (errorMessage) => {
            // quiet processing error
          }
        ).catch(err => {
          console.error(err);
          setScanError("Camera access denied or device media in use. Use the manual 4-digit Passcode underneath.");
          setStudentScanActive(false);
        });
      } catch (e) {
        console.error(e);
        setScanError("Failed to initialize webcam streaming. Try manual passcode check-in.");
        setStudentScanActive(false);
      }
    }, 450);
  };

  const stopScanner = () => {
    if (html5QrCodeInstance) {
      html5QrCodeInstance.stop().then(() => {
        setHtml5QrCodeInstance(null);
        setStudentScanActive(false);
      }).catch(err => {
        console.warn(err);
        setStudentScanActive(false);
      });
    } else {
      setStudentScanActive(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (html5QrCodeInstance) {
        html5QrCodeInstance.stop().catch(err => console.warn(err));
      }
    };
  }, [html5QrCodeInstance]);

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
                <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <input
                  id="attendance-date-selector"
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
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
                            className={`p-1.5 rounded-full transition ${status === "late" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                          >
                            <Clock className="h-4 w-4 mx-auto" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            id={`btn-a-${s.id}`}
                            onClick={() => setStatus(s.id, "absent")}
                            className={`p-1.5 rounded-full transition ${status === "absent" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
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

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-5 border-t border-slate-100 mt-5 gap-3">
              <button
                id="btn-instructor-qr-toggle"
                type="button"
                onClick={() => setIsQrPanelOpen(!isQrPanelOpen)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 px-4 py-2.5 rounded-md font-bold text-xs flex items-center space-x-2 transition border border-indigo-200 self-start cursor-pointer shadow-3xs"
              >
                <QrCode className="h-4 w-4" />
                <span>{isQrPanelOpen ? "Hide QR Dashboard" : "Broadcast Session QR Code"}</span>
              </button>

              <button
                id="btn-save-attendance"
                onClick={handleSaveSheet}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md font-medium text-xs flex items-center space-x-2 transition shadow-sm font-semibold self-end"
              >
                <Save className="h-4 w-4" />
                <span>Save Daily Registry</span>
              </button>
            </div>

            {isQrPanelOpen && (
              <div className="mt-6 border-2 border-indigo-200 bg-indigo-50/40 rounded-xl p-5 space-y-4 animate-fade-in text-slate-700" id="instructor-lecture-qr-panel">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5 text-indigo-700" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Active Session QR Check-In Ticket</h4>
                      <p className="text-[10px] text-slate-500 font-mono">Date: {selectedDate}</p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Live Broadcast</span>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* QR Image Frame */}
                  <div className="bg-white p-3 rounded-xl border border-indigo-150 shadow-sm shrink-0 flex flex-col items-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`DODAZ-CHECKIN:${selectedDate}:${getPasscodeForDate(selectedDate)}`)}`} 
                      alt="Student Check in QR Code" 
                      className="w-40 h-40 object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[9px] text-slate-450 font-mono mt-1.5 uppercase">Class Check-In Token</span>
                  </div>

                  {/* Passcode and descriptions */}
                  <div className="space-y-4 flex-1 w-full">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600 font-sans italic">Display this QR code on your display projector or screen so students can quickly check in.</p>
                      <div className="pt-2 flex flex-col gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-sans">Manual Passcode Fallback:</span>
                          <span className="bg-white border border-indigo-200 text-indigo-700 font-black font-mono px-3 py-1 rounded text-sm tracking-widest leading-none select-all shadow-3xs">
                            {getPasscodeForDate(selectedDate)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Instructor Calendar Integration */}
                    <div className="border-t border-indigo-100 pt-3">
                      <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5 font-sans">
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Lecture Synchronization Panel</span>
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href={getGoogleCalendarUrl(`Lecture Session`, `Students QR Checkin Attendance Passcode: ${getPasscodeForDate(selectedDate)}`, selectedDate)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/50 rounded font-bold text-[10px] shadow-3xs transition cursor-pointer font-sans"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Google Calendar</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDownloadICS(`Course Lecture - ${selectedDate}`, `Academic Course Lecture Session. Passcode is ${getPasscodeForDate(selectedDate)} representing tracking validation verification checks.`, selectedDate)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded font-bold text-[10px] shadow-3xs transition cursor-pointer font-sans"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download iCal (.ics)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

            {/* Live daily check-in console */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm" id="student-checkin-widget">
              <div className="flex items-center space-x-2 border-b border-slate-200 pb-2.5 text-slate-700">
                <QrCode className="h-5 w-5 text-indigo-600 font-bold animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Live Lecture Session Check-In Console</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Verify your attendance for today's active schedule</p>
                </div>
              </div>

              {scanSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs flex items-start space-x-2 animate-fade-in font-medium mb-3">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="font-extrabold">{scanSuccessMsg}</p>
                    <p className="text-[10px] text-emerald-700/80 mt-0.5 font-sans">Your status has been updated locally and is ready to push online.</p>
                  </div>
                </div>
              )}

              {scanError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-xs flex items-start space-x-2 animate-fade-in font-medium mb-3">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-extrabold">Check-In Alert Required</p>
                    <p className="text-[10px] text-rose-700/85 mt-0.5 font-sans">{scanError}</p>
                  </div>
                </div>
              )}

              {/* Check if already present today */}
              {(() => {
                const todayStr = new Date().toISOString().split("T")[0];
                const existingSheet = sheets.find(s => s.date === todayStr);
                const todayStatus = existingSheet?.records[currentStudent.id];
                
                if (todayStatus === "present" || todayStatus === "late") {
                  return (
                    <div className="bg-emerald-50/70 border border-emerald-150 rounded-lg p-4 text-center space-y-2 animate-fade-in">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700 shadow-3xs">
                        <Check className="h-5 w-5 stroke-[3]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Registered with Lectures Today</p>
                        <p className="text-[10px] text-emerald-700 font-mono tracking-wide mt-0.5 font-bold uppercase">Status: {todayStatus} ({todayStr})</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                    {/* Method A: Camera Scanner Toggle */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-3xs flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-1.5 font-sans">
                          <Camera className="h-4 w-4 text-indigo-500 font-bold" />
                          <span>Method A: Camera Scanner</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">Point your webcam or phone camera at the instructor's screen QR.</p>
                      </div>

                      {studentScanActive ? (
                        <div className="space-y-2.5">
                          <div className="relative border border-indigo-200 rounded-lg overflow-hidden bg-slate-900 aspect-square max-w-[220px] mx-auto shadow-sm">
                            <div id="reader" className="w-full h-full"></div>
                            {/* Scanning overlay frame */}
                            <div className="absolute inset-0 border border-dashed border-emerald-400/40 p-4 flex items-center justify-center pointer-events-none">
                              <ScanLine className="h-full w-full text-emerald-400 animate-pulse" />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={stopScanner}
                            className="w-full text-center bg-rose-100 hover:bg-rose-200 text-rose-700 hover:text-rose-800 font-bold px-3 py-2 rounded-md text-[10px] uppercase cursor-pointer transition"
                          >
                            Disable Camera Stream
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={startScanner}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2.5 rounded-md text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition-colors"
                        >
                          <ScanLine className="h-3.5 w-3.5" />
                          <span>Activate QR Scanner</span>
                        </button>
                      )}
                    </div>

                    {/* Method B: Manual Passcode Code */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3 shadow-3xs flex flex-col justify-between">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center space-x-1.5 font-sans">
                          <Clock className="h-4 w-4 text-amber-500 font-bold" />
                          <span>Method B: 4-Digit Passcode</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 font-medium">Enter the 4-digit code displayed below the active QR ticket.</p>
                      </div>

                      <div className="space-y-2.5">
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="e.g. 5283"
                          value={manualPasscode}
                          onChange={e => setManualPasscode(e.target.value.replace(/\D/g, ""))}
                          className="w-full text-center tracking-widest text-lg font-black font-mono border border-slate-200 dark:border-slate-800 focus:border-indigo-600 dark:focus:border-indigo-400 rounded-md p-2 uppercase bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={manualPasscode.length < 4}
                          onClick={() => handleStudentCheckIn(todayStr, manualPasscode)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold px-3 py-2.5 rounded-md text-[11px] uppercase tracking-wider flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Submit Passcode</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Calendar Event Sync Action list */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 space-y-3.5 text-slate-700" id="student-calendar-sync-card">
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                <CalendarDays className="h-5 w-5 text-indigo-600 font-bold animate-pulse" />
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest font-sans">Calendar Synchronization</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Sync course dates and homework deadlines with your calendar devices</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleExportLecturesCalendar}
                  className="inline-flex items-center justify-between border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/20 p-3 rounded-lg text-left transition cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Export Lecture Schedules</p>
                    <p className="text-[10px] text-slate-500 font-sans">Generates iCal invite containing all attendance class dates</p>
                  </div>
                  <Download className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />
                </button>

                <button
                  type="button"
                  onClick={handleExportAssignmentsCalendar}
                  className="inline-flex items-center justify-between border border-slate-200 hover:border-indigo-200 bg-slate-50 hover:bg-indigo-50/20 p-3 rounded-lg text-left transition cursor-pointer"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-800">Export Assignment Deadlines</p>
                    <p className="text-[10px] text-slate-500 font-sans font-medium">Sync due homework milestones directly to your device calendar</p>
                  </div>
                  <Download className="h-4 w-4 text-indigo-600 shrink-0 ml-2" />
                </button>
              </div>
            </div>

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
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center shadow-xs">
                      <p className="text-2xl font-black font-mono text-amber-800">{late}</p>
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

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student } from "./types";
import { dbService } from "./lib/db";
import { 
  User, BookOpen, Calendar, FileText, Mail, BarChart2, Book, Award, 
  Wifi, WifiOff, RefreshCw, Layers, Sun, Moon, AlertTriangle, Info 
} from "lucide-react";

// Import modular layouts
import StudentProfileView from "./components/StudentProfileView";
import AttendanceView from "./components/AttendanceView";
import AssignmentsView from "./components/AssignmentsView";
import MaterialsView from "./components/MaterialsView";
import MessagingView from "./components/MessagingView";
import SurveysView from "./components/SurveysView";
import ReflectionsView from "./components/ReflectionsView";
import ReportsView from "./components/ReportsView";
import ManualView from "./components/ManualView";

import LoginView from "./components/LoginView";
import { LogOut } from "lucide-react";

const UNIVERSITIES = [
  { id: "EPU", acronym: "EPU", name: "Ethiopian Police University" },
  { id: "EPSU", acronym: "EPSU", name: "Ethiopian Public Service University" },
  { id: "AAU", acronym: "AAU", name: "Addis Ababa University" },
  { id: "EGST", acronym: "EGST", name: "EGST (Ethiopian Graduate School of Theology)" },
  { id: "ILU", acronym: "ILU", name: "ILU (International Leadership University)" },
  { id: "GITL", acronym: "GITL", name: "GITL (Global Institute of Transformational Leadership)" }
];

export default function App() {
  // Real login session gating
  const [session, setSession] = useState<{
    role: "instructor" | "student";
    email: string;
    studentId?: string;
    name: string;
  } | null>(() => {
    const cached = localStorage.getItem("cc_user_session");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Sync Status
  const [online, setOnline] = useState(dbService.isOnline());
  const [outboxCount, setOutboxCount] = useState(dbService.getOutboxCount());
  const [isSyncing, setIsSyncing] = useState(false);

  // Dynamic branding
  const [activeUniId, setActiveUniId] = useState<string>(() => {
    return localStorage.getItem("active_university_id") || "EPU";
  });

  // Auth Mocks simulation (Instructor vs Student)
  const [activeRole, setActiveRole] = useState<"instructor" | "student">("instructor");
  const [students, setStudents] = useState<Student[]>(dbService.getStudents());
  
  // Set default active student profile
  const [selectedStudentId, setSelectedStudentId] = useState<string>("stud_3");
  const [activeTab, setActiveTab] = useState<
    "profile" | "attendance" | "assignments" | "materials" | "messaging" | "surveys" | "reflections" | "reports" | "manual"
  >("profile");

  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("cc_dark_mode") === "true";
  });

  // --- Collapsible Notes Sidebar State ---
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(() => {
    return localStorage.getItem("cc_notes_sidebar_open") === "true";
  });

  const [activeNoteType, setActiveNoteType] = useState<"general" | "student" | "personal">("general");
  const [noteContent, setNoteContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "">("");

  // Track root class list for dark mode support
  useEffect(() => {
    localStorage.setItem("cc_dark_mode", String(darkMode));
    const root = document.getElementById("app-root");
    if (root) {
      if (darkMode) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [darkMode]);

  // Track active note open state save trigger
  useEffect(() => {
    localStorage.setItem("cc_notes_sidebar_open", String(isNotesOpen));
  }, [isNotesOpen]);

  // Load active note content based on note category
  useEffect(() => {
    if (!session) return;
    const list = dbService.getWorkspaceNotes();
    const noteId = activeNoteType === "student" 
      ? `note_st_${selectedStudentId}`
      : activeNoteType === "personal"
        ? `note_pers_${session.role}_${session.studentId || "instructor"}`
        : `note_general_syllabus`;
    
    const found = list.find(n => n.id === noteId);
    setNoteContent(found ? found.content : "");
  }, [activeNoteType, selectedStudentId, session]);

  const handleNoteChange = (content: string) => {
    if (!session) return;
    setNoteContent(content);
    setSaveStatus("Saving...");
    
    const noteId = activeNoteType === "student" 
      ? `note_st_${selectedStudentId}`
      : activeNoteType === "personal"
        ? `note_pers_${session.role}_${session.studentId || "instructor"}`
        : `note_general_syllabus`;

    const noteItem = {
      id: noteId,
      role: session.role,
      studentId: activeNoteType === "student" ? selectedStudentId : undefined,
      content: content,
      updatedAt: new Date().toISOString()
    };
    
    dbService.saveWorkspaceNote(noteItem);
    
    setTimeout(() => {
      setSaveStatus("Saved");
    }, 400);
  };

  // Keep student context locked to logged-in user if state tells us so
  useEffect(() => {
    if (session) {
      if (session.role === "student" && session.studentId) {
        setActiveRole("student");
        setSelectedStudentId(session.studentId);
      } else {
        setActiveRole("instructor");
      }
    }
  }, [session, students]);

  // Keep students array and sync indicator updated
  useEffect(() => {
    const unsubscribe = dbService.registerStatusListener(() => {
      setOnline(dbService.isOnline());
      setOutboxCount(dbService.getOutboxCount());
      const list = dbService.getStudents();
      setStudents(list);
    });
    
    // Pull fresh data from cloud database server if online
    dbService.pullAllDataFromServer();
    
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await dbService.syncOutbox();
      await dbService.pullAllDataFromServer();
    } catch (e) {
      console.error("Manual sync failed: ", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const DEFAULT_FALLBACK_STUDENT: Student = {
    id: "no_student_placeholder",
    name: "No Students Registered",
    gender: "Other",
    email: "none@domain.com",
    mobile: "",
    institution: "Ethiopian Police University",
    department: "Crime Prevention and Criminology",
    currentPosition: "Pending Registration",
    previousDegrees: "None",
    researchInterests: "None",
    courseExpectations: "NoneSpecified",
    createdAt: new Date().toISOString()
  };

  const currentStudent = students.find(s => s.id === selectedStudentId) || students[0] || DEFAULT_FALLBACK_STUDENT;

  // --- Compile upcoming due assignments reminders ---
  const activeAssignments = dbService.getAssignments();
  const pendingSoon = activeAssignments.filter(a => {
    const dueTime = new Date(a.dueDate).getTime();
    const nowTime = Date.now();
    const diff = dueTime - nowTime;
    return diff > 0 && diff <= 5 * 24 * 60 * 60 * 1000; // due within 5 days
  });

  const handleProfileUpdated = (updatedStudent: Student) => {
    // Sync memory records
    setStudents(dbService.getStudents());
  };

  // Nav menu item details
  const navigationItems = [
    { id: "profile", label: "Registry & Thesis", icon: User },
    { id: "attendance", label: "Attendance Sheet", icon: Calendar },
    { id: "assignments", label: "Assignments & Grades", icon: FileText },
    { id: "materials", label: "Materials Repository", icon: Book },
    { id: "messaging", label: "Direct Messengers", icon: Mail },
    { id: "surveys", label: "Questionnaire Surveys", icon: BarChart2 },
    { id: "reflections", label: "Reflections Journal", icon: BookOpen },
    { id: "reports", label: "Reports & Exports", icon: Award },
    { id: "manual", label: "User Manual & FAQ", icon: Layers }
  ] as const;

  const activeUniversity = UNIVERSITIES.find(u => u.id === activeUniId) || UNIVERSITIES[0];

  if (!session) {
    return (
      <LoginView 
        onLoginSuccess={(newSession) => setSession(newSession)}
        activeUniversity={activeUniversity}
        universities={UNIVERSITIES}
        onUniversityChange={(uniId) => {
          setActiveUniId(uniId);
          localStorage.setItem("active_university_id", uniId);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"} flex flex-col font-sans transition-colors duration-200`} id="app-root">

      {/* Top Banner Alert exactly matching user's screenshot */}
      <div className="bg-[#055a64] text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-md no-print" id="banner-pwa-tab-redirect">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <span className="bg-teal-900/30 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap select-none font-sans">
            PWA SANDBOX MODE
          </span>
          <div className="text-slate-100 text-[11px] md:text-xs leading-relaxed font-semibold text-center sm:text-left">
            <p>
              Browser security rules disable automatic app installation lists inside nested preview frames. For desktop or smartphone native installation, launch <span className="text-[#a7f3d0] font-extrabold">DodaZ- Course Companion Portal</span> directly in a standard, clean external tab!
            </p>
            <p className="text-[10px] text-teal-200/85 mt-1 font-normal leading-normal">
              💡 <span className="underline font-bold text-white">Advisory Alert</span>: If Google prompts a 403 Forbidden or 404 page in your browser tab, make sure your browser is logged into your developer account <strong className="text-white">zerihunfakana@gmail.com</strong>, or simply click the top-right <strong className="text-white">"Share" button</strong> in Google AI Studio to deploy a public open-access link!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center">
          <button
            id="btn-copy-sandbox-url"
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app";
              navigator.clipboard.writeText(url);
              alert(`Copied Public Portal Link: ${url}\nYou can paste this in any standard browser or send it to students!`);
            }}
            className="bg-teal-950/45 hover:bg-teal-900/60 border border-teal-500/30 text-teal-200 px-3 py-2 rounded-md font-extrabold text-[10px] uppercase tracking-wider cursor-pointer transition whitespace-nowrap"
            title="Copy Public Portal Link"
          >
            Copy Link
          </button>
          <a 
            id="btn-open-new-tab"
            href={typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app"}
            target="_blank" 
            rel="noopener noreferrer" 
            className="bg-emerald-400 hover:bg-emerald-300 text-slate-950 px-4 py-2 rounded-md font-extrabold text-[10px] sm:text-xs tracking-wider uppercase transition shadow-md whitespace-nowrap flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Open App in new tab</span>
            <span className="text-[11px] font-bold">↗</span>
          </a>
        </div>
      </div>
      
      {/* Top Banner Administration & Sync outbox indicators */}
      <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 no-print shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-650 rounded flex items-center justify-center font-black text-white shadow-sm shrink-0">
            ZD
          </div>
          <div>
            <h1 className="text-md font-extrabold tracking-tight text-slate-900 dark:text-white uppercase flex items-center space-x-2">
              <span>DodaZ- Portal</span>
              <select
                id="university-header-selector"
                value={activeUniId}
                onChange={e => {
                  const val = e.target.value;
                  setActiveUniId(val);
                  localStorage.setItem("active_university_id", val);
                }}
                className="text-[9px] bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 font-mono tracking-wider font-bold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-slate-700 outline-none cursor-pointer"
              >
                {UNIVERSITIES.map(u => (
                  <option key={u.id} value={u.id}>{u.acronym} PWA</option>
                ))}
              </select>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold tracking-wide">
              Selected Campus: <span className="text-slate-750 dark:text-slate-200">{activeUniversity.name}</span>
            </p>
          </div>
        </div>

        {/* Sync panel indicators & manual controls */}
        <div className="flex items-center space-x-4">
          
          {/* Theme & Workspace Toggles */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-3 mr-1">
            <button
              id="btn-toggle-dark-mode"
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              id="btn-toggle-notes-sidebar"
              type="button"
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className={`p-2 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs font-bold ${isNotesOpen ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
              title="Toggle Workspace Notes Sidebar"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Notes</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            {online ? (
              <span className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-bold">
                <Wifi className="h-3.5 w-3.5 animate-pulse text-emerald-650" />
                <span>ONLINE CLOUD</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-bold">
                <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                <span>OFFLINE CACHE</span>
              </span>
            )}

            {outboxCount > 0 && (
              <button
                id="btn-sync-outbox"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-sans font-extrabold px-2.5 py-1 rounded-md transition shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>Sync ({outboxCount} changes)</span>
              </button>
            )}
          </div>

          {/* ACTOR CONTEXT SWITCHER TRIGGER */}
          {session.role === "instructor" ? (
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md flex items-center space-x-3 text-xs shadow-3xs">
              <span className="text-slate-500 font-semibold">Workspace Focus:</span>
              
              <select
                id="role-switcher-dropdown"
                value={activeRole}
                onChange={e => {
                  const role = e.target.value as "instructor" | "student";
                  setActiveRole(role);
                  setActiveTab("profile");
                }}
                className="bg-white border border-slate-200 text-slate-800 font-bold text-xs rounded-md px-2.5 py-1 focus:outline-none cursor-pointer shadow-3xs"
              >
                <option value="instructor">🎓 Dr. Zerihun (Instructor)</option>
                <option value="student">👤 Student Perspective</option>
              </select>

              {/* Show student profile switcher to the instructor, or student switcher focus */}
              <div className="flex items-center space-x-1.5 border-l border-slate-200 pl-3">
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Supervised Student:</span>
                <select
                  id="student-focus-switcher"
                  value={selectedStudentId}
                  onChange={e => {
                    setSelectedStudentId(e.target.value);
                  }}
                  className="bg-white border border-slate-200 text-slate-800 font-extrabold text-[11px] rounded-md px-2 py-1 focus:outline-none cursor-pointer shadow-3xs"
                >
                  {students.length > 0 ? (
                    students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))
                  ) : (
                    <option value="no_student_placeholder">No Live Researchers</option>
                  )}
                </select>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-mono font-black uppercase tracking-wider px-3.5 py-2 rounded-lg flex items-center space-x-1.5 shadow-3xs select-none">
              <span className="inline-block w-2 bg-indigo-500 rounded-full h-2 animate-pulse"></span>
              <span>Student Member Portal</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Navigation panel */}
        <aside className="lg:col-span-3 space-y-4 no-print" id="navigation-sidebar">
          
          {/* Active User Card */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-400 shrink-0">
                {activeRole === "student" && currentStudent.profilePicture ? (
                  <img src={currentStudent.profilePicture} alt={currentStudent.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-950 text-indigo-400 font-black text-sm uppercase">
                    {activeRole === "instructor" ? "ZD" : currentStudent.name[0]}
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block font-bold">Active Account</span>
                <p className="text-sm font-bold font-sans truncate">
                  {activeRole === "instructor" ? "Dr. Zerihun Doda" : currentStudent.name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {activeRole === "instructor" ? "zerihun.doda@epsu.edu.et" : currentStudent.email}
                </p>
              </div>
            </div>
          </div>

          {/* Renders lateral buttons */}
          <nav className="bg-slate-900 border border-slate-805 rounded-xl p-2.5 space-y-1">
            <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-slate-500 font-black">Management</div>
            {navigationItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  id={`btn-nav-tab-${item.id}`}
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold tracking-wide uppercase rounded-md transition-all duration-150 ${
                    isActive 
                      ? "bg-indigo-650 text-white border-l-4 border-indigo-400" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <IconComp className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-indigo-300" : ""}`} />
                  <span>{item.label}</span>
                  {item.id === "assignments" && pendingSoon.length > 0 && (
                    <span className="ml-auto bg-amber-500 text-slate-950 font-sans font-black text-[9px] px-1.5 py-0.5 rounded-full shrink-0 select-none animate-pulse">
                      {pendingSoon.length} SOON
                    </span>
                  )}
                </button>
              );
            })}

            {/* LOG OUT BUTTON IN BAR */}
            <button
              id="btn-nav-sign-out"
              onClick={() => {
                localStorage.removeItem("cc_user_session");
                setSession(null);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold tracking-wide uppercase text-rose-450 hover:bg-slate-800 hover:text-rose-400 rounded-md transition-all duration-150 border-t border-slate-800/80 pt-3"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0 text-rose-500" />
              <span>Log out Class Portal</span>
            </button>

            {/* Online status indicator in footer */}
            <div className="pt-4 border-t border-slate-800 px-4 mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"}`}></div>
              <span className="text-[10px] text-slate-500 font-bold font-mono">
                {online ? "CONNECTED CLOUD" : "OFFLINE CACHE MODE"}
              </span>
            </div>
          </nav>

          {/* Designer attribution card info */}
          <div className="bg-gradient-to-br from-indigo-50/70 to-slate-100 border border-indigo-150 rounded-xl p-4 text-[11px] leading-relaxed text-slate-650 shadow-3xs flex flex-col gap-1.5">
            <span className="font-bold text-indigo-950 uppercase tracking-widest text-[9px] block">Institutional Design</span>
            <p className="font-semibold text-slate-700">
              Designed by <strong className="text-indigo-900">Dr. Zerihun Doda</strong>, Ethiopian Public Service University, Addis Ababa, Ethiopia.
            </p>
          </div>

          {/* Quick instructions panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-xs leading-relaxed text-slate-600 shadow-sm">
            <p className="font-extrabold text-slate-800 uppercase mb-1.5 block tracking-wider text-[10px]">Simulation Toolkit</p>
            <p className="text-slate-500 font-medium leading-normal">
              By shifting the <strong>"Workspace Focus"</strong>, the application instantly pivots between the instructor's assessment dashboard and a student's personal view.
            </p>
          </div>
        </aside>

        {/* View Component Wrapper */}
        <main className={`${isNotesOpen ? "lg:col-span-6" : "lg:col-span-9"} space-y-6 transition-all duration-155`}>
          
          {/* Dynamic Assignment Reminders Alert banner */}
          {pendingSoon.length > 0 && (
            <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 text-amber-900 dark:text-amber-250 p-4 rounded-xl flex items-start gap-3 shadow-3xs animate-fade-in" id="workspace-alerts-banner">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs">
                <p className="font-bold uppercase tracking-wider text-amber-950 dark:text-amber-300 font-sans">⏰ Assignment Reminders Alert ({pendingSoon.length} Pending Soon)</p>
                <div className="mt-1.5 space-y-1 font-medium font-sans">
                  {pendingSoon.map(a => {
                    const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={a.id} className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-950/20 text-[11px]">
                        <span>
                          <strong>{a.title}</strong> is due in <span className="text-amber-700 dark:text-amber-300 font-extrabold">{daysLeft} days</span> (limit: {new Date(a.dueDate).toLocaleDateString()})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("assignments");
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-2 py-1 rounded text-[10px] uppercase tracking-wide cursor-pointer transition shadow-3xs"
                        >
                          Open Roster
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 min-h-[500px] shadow-sm relative print-clean text-slate-850 dark:text-slate-100">
            
            {activeTab === "profile" && (
              <StudentProfileView 
                currentStudent={currentStudent} 
                onProfileUpdated={handleProfileUpdated}
                isInstructor={activeRole === "instructor"}
                selectedStudentId={activeRole === "instructor" ? selectedStudentId : undefined}
                setSelectedStudentId={setSelectedStudentId}
              />
            )}

            {activeTab === "attendance" && (
              <AttendanceView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "assignments" && (
              <AssignmentsView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "materials" && (
              <MaterialsView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "messaging" && (
              <MessagingView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "surveys" && (
              <SurveysView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "reflections" && (
              <ReflectionsView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "reports" && (
              <ReportsView 
                isInstructor={activeRole === "instructor"}
                currentStudent={currentStudent}
              />
            )}

            {activeTab === "manual" && (
              <ManualView />
            )}

          </div>
        </main>

        {/* Collapsible Notes Side Drawer */}
        {isNotesOpen && (
          <aside className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 shadow-sm h-fit no-print animate-fade-in text-slate-700 dark:text-slate-350" id="workspace-notes-drawer">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-sans">Workspace Notebook</h3>
              </div>
              <button 
                onClick={() => setIsNotesOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-xs"
              >
                ✕ Close
              </button>
            </div>

            {/* Selection profile tabs for notes */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg text-[10px] font-sans">
              <button
                type="button"
                onClick={() => setActiveNoteType("general")}
                className={`flex-1 text-center py-1.5 rounded-md font-bold transition ${activeNoteType === "general" ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-3xs" : "text-slate-500 hover:text-slate-400"}`}
              >
                Syllabus
              </button>
              <button
                type="button"
                onClick={() => setActiveNoteType("personal")}
                className={`flex-1 text-center py-1.5 rounded-md font-bold transition ${activeNoteType === "personal" ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-3xs" : "text-slate-500 hover:text-slate-400"}`}
              >
                Scratchpad
              </button>
              <button
                type="button"
                onClick={() => setActiveNoteType("student")}
                className={`flex-1 text-center py-1.5 rounded-md font-bold transition ${activeNoteType === "student" ? "bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-3xs" : "text-slate-500 hover:text-slate-400"}`}
              >
                {session.role === "instructor" ? "Student Log" : "Draft Notes"}
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-[10px] text-slate-450 font-mono">
                <span className="truncate max-w-[150px]">
                  {activeNoteType === "general" && "📋 Syllabus Checklist"}
                  {activeNoteType === "personal" && `✍️ Private Journal`}
                  {activeNoteType === "student" && (session.role === "instructor" ? `🎓 Log: ${currentStudent.name}` : `🔍 Thesis Draft Notes`)}
                </span>
                {saveStatus && (
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide font-sans shrink-0 ${saveStatus === "Saved" ? "text-emerald-650 bg-emerald-50 dark:bg-emerald-950/40" : "text-amber-600 bg-amber-50 dark:bg-amber-950/40"}`}>
                    {saveStatus}
                  </span>
                )}
              </div>

              <textarea
                value={noteContent}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder={
                  activeNoteType === "general" 
                    ? "Enter global details, exam dates, syllabus notes here..." 
                    : activeNoteType === "personal" 
                      ? "Jot down scratch ideas or reminders for yourself here..." 
                      : session.role === "instructor" 
                        ? `Private evaluation notes regarding ${currentStudent.name}...` 
                        : "Private thesis checklist & resources notepad..."
                }
                rows={12}
                className="w-full text-xs font-mono p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650 text-slate-800 dark:text-slate-100 resize-none shadow-3xs"
              />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-sans text-center">
                ✨ Offline autosave enabled. Data is preserved in the browser sandbox cache.
              </p>
            </div>
          </aside>
        )}

      </div>

      {/* Humble Footer */}
      <footer className="bg-slate-900 border-t border-slate-850 px-6 py-6 mt-auto text-center text-xs text-slate-400 font-sans no-print space-y-1.5">
        <p className="font-semibold text-slate-300">Designed by Dr. Zerihun Doda, Ethiopian Public Service University, Addis Ababa, Ethiopia.</p>
        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">DodaZ- Course Companion Portal • PWA Classroom Suite • {activeUniversity.name} Edition</p>
      </footer>

    </div>
  );
}

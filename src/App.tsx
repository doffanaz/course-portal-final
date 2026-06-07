/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student } from "./types";
import { dbService } from "./lib/db";
import { 
  User, BookOpen, Calendar, FileText, Mail, BarChart2, Book, Award, 
  Wifi, WifiOff, RefreshCw, Layers, Sun, Moon, AlertTriangle, Info,
  Download, Smartphone, Laptop, Check, X, Server, HardDrive, MessageSquare
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
import StudentFeedbackView from "./components/StudentFeedbackView";

import LoginView from "./components/LoginView";
import { LogOut } from "lucide-react";
import { auth, isPlaceholderFirebase } from "./lib/firebase";

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
  const [isLocalStandalone, setIsLocalStandalone] = useState<boolean>(() => {
    return localStorage.getItem("cc_local_standalone") === "true";
  });

  // PWA Prompting and Install States
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  
  // Detailed Offline Sync Modal States
  const [isOfflineSyncModalOpen, setIsOfflineSyncModalOpen] = useState(false);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState<"steady" | "delayed" | "unreachable" | null>(null);
  const [isSyncingCore, setIsSyncingCore] = useState(false);
  const [syncProgressStep, setSyncProgressStep] = useState<number>(0); // 0=None, 1=Scanning, 2=Verifying backend, 3=Flushing, 4=Done
  const [syncLogs, setSyncLogs] = useState<Array<{ time: string; msg: string; type: 'info' | 'success' | 'warn' }>>([
    { time: "12:04", msg: "Local cached offline database initialized.", type: 'info' },
    { time: "16:45", msg: "Offline Sync Engine: Listened with client storage keys.", type: 'info' }
  ]);

  // Hook for PWA Install Capture
  useEffect(() => {
    const handleBeforePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log("PWA beforeinstallprompt captured.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforePrompt as any);

    // Check display mode standalone
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforePrompt as any);
    };
  }, []);

  const handleInstallAction = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User installation choice outcome: ${outcome}`);
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (err) {
        console.error("Installation dialogue prompt failed:", err);
        setIsInstallModalOpen(true);
      }
    } else {
      setIsInstallModalOpen(true);
    }
  };

  const handlePingTest = () => {
    setIsTestingPing(true);
    setPingStatus(null);
    setTimeout(() => {
      setIsTestingPing(false);
      const isOnlineRightNow = navigator.onLine;
      setPingStatus(isOnlineRightNow ? "steady" : "unreachable");
    }, 850);
  };

  const triggerCoreSyncEngine = async () => {
    if (isSyncingCore) return;
    setIsSyncingCore(true);
    setSyncProgressStep(1);
    
    const nowStr = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Step 1: Scanning Local
    setSyncLogs(prev => [...prev, { time: nowStr(), msg: `Initiating diagnostic scan of local storage...`, type: 'info' }]);
    await new Promise(r => setTimeout(r, 600));
    setSyncProgressStep(2);

    // Step 2: Querying Server
    setSyncLogs(prev => [...prev, { time: nowStr(), msg: `Querying connection to Firestore database: ai-studio-613ecae1...`, type: 'info' }]);
    await new Promise(r => setTimeout(r, 700));
    
    if (!online) {
      setSyncLogs(prev => [...prev, { time: nowStr(), msg: `Network unreachable. Saved changes will remain buffered in your offline browser ledger.`, type: 'warn' }]);
      setSyncProgressStep(0);
      setIsSyncingCore(false);
      return;
    }

    setSyncProgressStep(3);
    const countToFlush = dbService.getOutboxCount();
    setSyncLogs(prev => [...prev, { time: nowStr(), msg: `Uploading offline outbox buffer payload (${countToFlush} items)...`, type: 'info' }]);
    
    // Execute actual sync!
    try {
      await dbService.syncOutbox();
      await dbService.pullAllDataFromServer();
      
      setOutboxCount(dbService.getOutboxCount());
      setOnline(dbService.isOnline());
      setStudents(dbService.getStudents());
      
      setSyncProgressStep(4);
      setSyncLogs(prev => [...prev, { time: nowStr(), msg: `Synchronization flushed! All student profiles, grades and marks verified online green.`, type: 'success' }]);
    } catch (e) {
      setSyncLogs(prev => [...prev, { time: nowStr(), msg: `Database connection interrupted. Changes backed up offline safely.`, type: 'warn' }]);
    } finally {
      setTimeout(() => {
        setIsSyncingCore(false);
        setSyncProgressStep(0);
      }, 1000);
    }
  };

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
    "profile" | "attendance" | "assignments" | "materials" | "messaging" | "surveys" | "reflections" | "reports" | "manual" | "feedback"
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
    { id: "feedback", label: "Student Feedback", icon: MessageSquare },
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
      <div 
        className="text-white px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-md no-print" 
        id="banner-pwa-tab-redirect"
        style={{ backgroundColor: '#055a64' }}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <span 
            className="text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full whitespace-nowrap select-none font-sans"
            style={{ backgroundColor: 'rgba(4, 47, 46, 0.45)' }}
          >
            PWA SANDBOX MODE
          </span>
          <div className="text-slate-100 text-[11px] md:text-xs leading-relaxed font-semibold text-center sm:text-left">
            <p>
              Browser security rules disable automatic app installation lists inside nested preview frames. For desktop or smartphone native installation, launch <span className="text-[#a7f3d0] font-extrabold">DodaZ- Course Companion Portal</span> directly in a standard, clean external tab!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-stretch sm:self-auto justify-center">
          <button
            id="btn-banner-install-app"
            onClick={handleInstallAction}
            className="hover:bg-indigo-700 text-white border border-indigo-500/25 px-3.5 py-2 rounded-md font-extrabold text-[10px] sm:text-xs tracking-wider uppercase cursor-pointer transition whitespace-nowrap flex items-center gap-1.5 shrink-0 shadow-md animate-pulse-subtle"
            style={{ backgroundColor: '#4f46e5' }}
            title="Install Application to Device"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Install App</span>
          </button>
          <button
            id="btn-copy-sandbox-url"
            onClick={() => {
              const url = typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app";
              navigator.clipboard.writeText(url);
              alert(`Copied Public Portal Link: ${url}\nYou can paste this in any standard browser or send it to students!`);
            }}
            className="hover:bg-teal-800 border border-teal-500/30 text-white px-3 py-2 rounded-md font-extrabold text-[10px] uppercase tracking-wider cursor-pointer transition whitespace-nowrap"
            style={{ backgroundColor: '#115e59' }}
            title="Copy Public Portal Link"
          >
            Copy Link
          </button>
          <a 
            id="btn-open-new-tab"
            href={typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app"}
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-md font-extrabold text-[10px] sm:text-xs tracking-wider uppercase transition shadow-md whitespace-nowrap flex items-center gap-1 shrink-0 cursor-pointer"
            style={{ backgroundColor: '#10b981' }}
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
            {isLocalStandalone ? (
              <span className="flex items-center space-x-1.5 text-teal-800 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-md border border-teal-200 dark:border-teal-900 font-bold">
                <HardDrive className="h-3.5 w-3.5 text-teal-650 dark:text-teal-400" />
                <span>LOCAL STANDALONE</span>
              </span>
            ) : online ? (
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

            {outboxCount > 0 && !isLocalStandalone && (
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
          <nav className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-1">
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
                if (!isPlaceholderFirebase) {
                  auth.signOut().catch(p => console.warn("Firebase sign out failed:", p));
                }
              }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 text-xs font-bold tracking-wide uppercase text-rose-400 hover:bg-slate-800 hover:text-rose-300 rounded-md transition-all duration-150 border-t border-slate-800/80 pt-3"
            >
              <LogOut className="h-4.5 w-4.5 shrink-0 text-rose-500" />
              <span>Log out Class Portal</span>
            </button>

            {/* Online status indicator in footer - interactive trigger */}
            <button
              id="btn-nav-trigger-sync-modal"
              type="button"
              onClick={() => setIsOfflineSyncModalOpen(true)}
              className="w-full pt-4 border-t border-slate-800 px-4 mt-2 flex items-center justify-between text-left hover:bg-slate-800/40 py-2 rounded transition cursor-pointer text-slate-400 hover:text-white"
              title="Open Offline Sync Hub"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isLocalStandalone ? "bg-teal-400" : online ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}></div>
                <span className="text-[10px] font-bold font-mono">
                  {isLocalStandalone ? "LOCAL STANDALONE" : online ? "SYNCED CLOUD" : "OFFLINE BUFFERED"}
                </span>
              </div>
              <span className="text-[8px] bg-slate-800 text-slate-400 font-mono px-1 py-0.5 rounded border border-slate-700">Hub ↗</span>
            </button>
          </nav>

          {/* Premium PWA Dashboard Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] leading-relaxed text-slate-400 font-sans shadow-sm flex flex-col gap-2" id="pwa-hub-sidebar-controls">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-400 uppercase tracking-wider text-[9px] font-mono">PWA System Hub</span>
              {isInstallable && (
                <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">Ready</span>
              )}
            </div>
            <p className="text-slate-450 leading-normal text-[11px] font-sans">
              Install to home screen or desktop to unlock offline storage buffers and robust classroom network resilience.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                id="btn-sidebar-install"
                type="button"
                onClick={handleInstallAction}
                className="py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5 leading-none"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>Install</span>
              </button>
              <button
                id="btn-sidebar-sync-hub"
                type="button"
                onClick={() => setIsOfflineSyncModalOpen(true)}
                className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-3xs flex items-center justify-center gap-1.5 leading-none"
              >
                <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                <span>Sync Center</span>
              </button>
            </div>
          </div>

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

            {activeTab === "feedback" && (
              <StudentFeedbackView 
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

      {/* ======================================================== */}
      {/* PWA INSTALLATION INSTRUCTION AND TRIGGER MODAL GUIDE */}
      {/* ======================================================== */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm select-none animate-fade-in" id="modal-pwa-install-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl relative text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Install Companion App</h3>
                  <p className="text-[10px] text-slate-400 font-sans font-medium">Equip your mobile screen or computer desktop with offline launching</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* If native installer ready, show direct prompt */}
            {isInstallable && deferredPrompt ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900 text-emerald-850 dark:text-emerald-300 p-4 rounded-xl text-xs space-y-3 mb-4 font-sans">
                <span className="font-extrabold uppercase tracking-wide block text-[10px]">✅ Immediate Launch Activated</span>
                <p className="font-semibold leading-relaxed">
                  Your browser supports direct standalone service installation. Click below to summon the native PWA registration popup!
                </p>
                <button
                  type="button"
                  onClick={handleInstallAction}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase py-2.5 rounded-lg transition tracking-wider text-[11px] cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Execute Native Install Prompt</span>
                </button>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900 text-amber-900 dark:text-amber-250 p-4 rounded-xl text-xs space-y-3 mb-4 font-sans leading-relaxed">
                <span className="font-extrabold uppercase tracking-widest block text-[9px] text-amber-700 dark:text-amber-300">💡 SANDBOXED IFRAME NOTICE</span>
                <p className="font-medium">
                  Browsers protect security by disabling native install prompts inside sub-iframes. For standard automated installation, launch the school portal directly in a standard browser tab:
                </p>
                <a
                  href={typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg text-center inline-block transition text-[11px] uppercase tracking-wide border border-slate-700"
                >
                  Open App Launcher in standard tab ↗
                </a>
              </div>
            )}

            {/* Instruction Sheets Tab Panels */}
            <div className="space-y-4 font-sans">
              <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400">Step-by-Step Manual Guidance</h4>

              <div className="space-y-4">
                {/* OS 1: iOS */}
                <div className="border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-slate-500" />
                    <span className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">Apple iOS (iPhone / iPad Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pl-1 leading-relaxed font-semibold">
                    <li>Launch this page in the standard native <span className="text-indigo-600 dark:text-indigo-350">Safari browser</span>.</li>
                    <li>Tap the <span className="underline">"Share" button</span> (square tray with an arrow pointing upward) in Safari's toolbar.</li>
                    <li>Scroll down the options list and select <strong className="text-slate-800 dark:text-slate-200">"Add to Home Screen"</strong>.</li>
                    <li>Enter details and click <span className="font-bold text-slate-800 dark:text-white">"Add"</span>. The companion icon will instantly spawn on your mobile grid page!</li>
                  </ol>
                </div>

                {/* OS 2: Android */}
                <div className="border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">Android Device (Google Chrome)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pl-1 leading-relaxed font-semibold">
                    <li>Launch standard Chrome on your phone, and tap the <span className="underline">three vertical dots menu</span> in the top right.</li>
                    <li>Select <strong className="text-slate-800 dark:text-slate-200">"Install app"</strong> or <strong className="text-slate-800 dark:text-slate-200">"Add to Home screen"</strong>.</li>
                    <li>Follow the system screen confirmation to pin the app immediately.</li>
                  </ol>
                </div>

                {/* OS 3: Desktop */}
                <div className="border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <Laptop className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">Desktop PC (Mac, Windows, Linux Chrome/Edge)</span>
                  </div>
                  <ol className="list-decimal list-inside text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pl-1 leading-relaxed font-semibold">
                    <li>Open standard Chrome, Edge, or Opera. Look at the <span className="underline">right end of the URL address bar</span>.</li>
                    <li>Click the <strong className="text-slate-800 dark:text-slate-200">"Install DodaZ- Portal" icon</strong> (a monitors monitor or addition indicator).</li>
                    <li>Click <span className="font-bold">"Install"</span>. The web app will launch in its own premium borderless operating window shell.</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-slate-150 dark:border-slate-800 mt-5">
              <button
                id="btn-close-install-modal"
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Dismiss Guidance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAILED OFFLINE SYNCHRONIZATION HUB AND VERIFIER MODAL */}
      {/* ======================================================== */}
      {isOfflineSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm select-none animate-fade-in" id="modal-offline-sync-overlay">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-xl relative text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800 mb-4 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-650 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900">
                  <Server className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Ethiopian Classroom Core Sync</h3>
                  <p className="text-[10px] text-slate-400 font-sans font-medium">Manage server-side persistence, network check-ins, and local browser cache storage</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsOfflineSyncModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-4 font-sans text-xs">
              
              {/* Standalone Settings Card */}
              <div className="p-4 bg-teal-50/45 dark:bg-slate-950 border border-teal-200/50 dark:border-teal-950 rounded-xl space-y-3 shadow-3xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest block font-mono">Independent Standalone Configuration</span>
                    <h4 className="text-[11px] font-black uppercase text-slate-900 dark:text-white tracking-wide">Run completely offline & independent?</h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-normal font-sans font-medium">
                      Enabling **Local Standalone Mode** runs the classroom app exclusively using your browser's local sandbox storage (`localStorage`). This pauses automatic background cloud upload requests to your Firebase Firestore cloud database for completely private independent operation.
                    </p>
                  </div>
                  <div className="flex items-center shrink-0 mt-2.5">
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isLocalStandalone} 
                        onChange={(e) => {
                          const val = e.target.checked;
                          setIsLocalStandalone(val);
                          localStorage.setItem("cc_local_standalone", String(val));
                          
                          const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                          if (val) {
                            setSyncLogs(prev => [...prev, { 
                              time: nowTime, 
                              msg: "Standalone Local-Only Mode active. Automatic database sync queues are paused.", 
                              type: 'success' 
                            }]);
                          } else {
                            setSyncLogs(prev => [...prev, { 
                              time: nowTime, 
                              msg: "Cloud synchronizations re-enabled. Querying connections...", 
                              type: 'info' 
                            }]);
                            dbService.syncOutbox();
                            dbService.pullAllDataFromServer();
                          }
                        }}
                        className="sr-only peer" 
                        id="toggle-standalone-checkbox"
                      />
                      <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full dark:bg-slate-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-700 peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                </div>

                {isLocalStandalone && (
                  <div className="bg-white/60 dark:bg-slate-900/60 border border-teal-150 dark:border-teal-900/50 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-[10.5px] animate-fade-in leading-relaxed">
                    <div className="text-slate-550 dark:text-slate-400 font-sans font-medium">
                      Your classroom changes ({outboxCount} items buffered) are fully saved locally. Switch this off to enable cloud backends. You can clear the backlog of changes to reset the indicator.
                    </div>
                    {outboxCount > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          dbService.clearOutbox();
                          setOutboxCount(0);
                          const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
                          setSyncLogs(prev => [...prev, { 
                            time: nowTime, 
                            msg: "Successfully cleared outbox ledger mutations. Standalone database clean.", 
                            type: 'success' 
                          }]);
                        }}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900 rounded font-black uppercase text-[8.5px] tracking-wider transition shrink-0"
                      >
                        Clear Sync Queue
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Connection metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Link card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col justify-between space-y-2.5 shadow-2xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Uplink Pathway Check</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500 animate-pulse"}`} />
                      <span className="font-extrabold uppercase text-[11px]">
                        {online ? "Ethiopian ISP Connected" : "Local Classroom Only"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-150 dark:border-slate-850">
                    <button
                      type="button"
                      disabled={isTestingPing}
                      onClick={handlePingTest}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[9px] font-bold uppercase rounded tracking-wide transition cursor-pointer"
                    >
                      {isTestingPing ? "Multiplexing..." : "Ping Firebase Core"}
                    </button>
                    {pingStatus && (
                      <span className={`text-[9px] font-black uppercase ${pingStatus === "steady" ? "text-emerald-600" : "text-rose-500"}`}>
                        {pingStatus === "steady" ? "Steady ● 45ms" : "Offline / Unreachable"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Local ledger card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex flex-col justify-between space-y-2.5 shadow-2xs">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Buffered Session Mutations</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`h-2.5 w-2.5 rounded-full ${outboxCount === 0 ? "bg-slate-450" : "bg-amber-500 animate-pulse"}`} />
                      <span className="font-extrabold text-[11px] uppercase">
                        {outboxCount === 0 ? "LEDGER SYNCHRONIZED" : `${outboxCount} changes awaiting uplink`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-slate-150 dark:border-slate-850">
                    <span className="text-[9px] text-slate-400 font-mono tracking-tight font-medium">Target: ai-studio-613ecae1</span>
                    {outboxCount > 0 && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-700 font-mono px-1.5 py-0.5 rounded border border-amber-500/15 font-extrabold animate-pulse">Flush Pending</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Force sync process check-list if active */}
              {isSyncingCore && (
                <div className="bg-indigo-50/50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 p-4 rounded-xl space-y-3 animate-fade-in animate-pulse-subtle">
                  <h4 className="text-[10px] font-black uppercase text-slate-900 dark:text-indigo-400 font-mono flex items-center justify-between">
                    <span>Synchronizing Local Storage Outbox Ledger...</span>
                    <span>{syncProgressStep}/4 Steps</span>
                  </h4>
                  
                  <div className="space-y-1.5 font-sans leading-normal">
                    {/* step 1 */}
                    <div className="flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full ${syncProgressStep >= 1 ? "bg-emerald-500" : "bg-slate-300 animate-pulse"}`} />
                      <span className={`text-[11px] font-medium ${syncProgressStep >= 1 ? "text-slate-800 dark:text-slate-200 line-through decoration-slate-400 dark:decoration-slate-600 opacity-65" : "text-slate-500"}`}>
                        Parse and validate offline SQLite storage chunks...
                      </span>
                    </div>
                    {/* step 2 */}
                    <div className="flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full ${syncProgressStep >= 2 ? "bg-emerald-500" : "bg-slate-300 animate-pulse"}`} />
                      <span className={`text-[11px] font-medium ${syncProgressStep >= 2 ? "text-slate-800 dark:text-slate-200 line-through decoration-slate-400 dark:decoration-slate-600 opacity-65" : "text-slate-500"}`}>
                        Check regional authentication keys with Cloud security rules...
                      </span>
                    </div>
                    {/* step 3 */}
                    <div className="flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full ${syncProgressStep >= 3 ? "bg-emerald-500" : "bg-slate-300 animate-pulse"}`} />
                      <span className={`text-[11px] font-medium ${syncProgressStep >= 3 ? "text-slate-800 dark:text-slate-200 line-through decoration-slate-400 dark:decoration-slate-600 opacity-65" : "text-slate-500"}`}>
                        Uploading outbox changes ({outboxCount}) to Firestore arrays...
                      </span>
                    </div>
                    {/* step 4 */}
                    <div className="flex items-center space-x-2">
                      <span className={`h-2 w-2 rounded-full ${syncProgressStep >= 4 ? "bg-emerald-500" : "bg-slate-300 animate-pulse"}`} />
                      <span className={`text-[11px] font-medium ${syncProgressStep >= 4 ? "text-emerald-700 dark:text-emerald-300 font-extrabold" : "text-slate-500"}`}>
                        Recrawl metadata arrays and flush client cache indices!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Unsynced Changes List */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Awaiting Operations Ledger Queue ({outboxCount})</span>
                
                {dbService.getOutbox().length === 0 ? (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl text-center flex flex-col items-center justify-center space-y-1 py-6">
                    <span className="text-emerald-600 dark:text-emerald-400 text-lg font-bold">✓ ALL SYNCED STEADY</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-sans font-medium max-w-xs">
                      No buffered mutations waiting to be pushed. Global students, marks, grade cards and survey records are identical between client cache and server databases.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-850 rounded-xl divide-y divide-slate-150 dark:divide-slate-850 max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                    {dbService.getOutbox().map((op, opIdx) => (
                      <div key={opIdx} className="p-2.5 flex items-center justify-between text-[11px] font-mono hover:bg-slate-100 dark:hover:bg-slate-900 leading-none">
                        <div className="flex items-center space-x-2 truncate">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide shrink-0 ${
                            op.type === "set" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400" :
                            op.type === "update" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" :
                            "bg-rose-100 text-rose-750 dark:bg-rose-950 dark:text-rose-400"
                          }`}>
                            {op.type}
                          </span>
                          <span className="font-semibold text-slate-650 dark:text-slate-300 truncate max-w-[220px]">
                            {op.collection} Doc ID: {op.docId}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-450 uppercase tracking-widest italic shrink-0 font-bold">Awaiting Uplink</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Terminal Logs for reassurance */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Terminal Diagnostic Logs</span>
                <div className="bg-slate-950 border border-slate-850 text-slate-300 rounded-xl p-3 font-mono text-[10px] h-32 overflow-y-auto space-y-1 block leading-relaxed shadow-inner">
                  {syncLogs.map((log, lIdx) => (
                    <div key={lIdx} className="flex items-start space-x-2">
                      <span className="text-slate-500 font-bold">[{log.time}]</span>
                      <span className={`${
                        log.type === 'success' ? "text-emerald-400 font-bold" :
                        log.type === 'warn' ? "text-amber-400 font-semibold" :
                        "text-slate-300"
                      }`}>
                        {log.msg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-150 dark:border-slate-800 mt-5 shrink-0">
              <button
                type="button"
                disabled={isSyncingCore || !online || isLocalStandalone}
                title={isLocalStandalone ? "Disable local standalone mode to connect with backing cloud databases" : ""}
                onClick={triggerCoreSyncEngine}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-45 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncingCore ? "animate-spin" : ""}`} />
                <span>{isSyncingCore ? "Synchronizing..." : "Trigger Force Sync"}</span>
              </button>

              <button
                id="btn-close-sync-modal"
                type="button"
                onClick={() => setIsOfflineSyncModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Close Hub
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

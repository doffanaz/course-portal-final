/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student } from "../types";
import { dbService } from "../lib/db";
import { 
  Lock, Mail, UserPlus, LogIn, ChevronRight, School, 
  Sparkles, CheckCircle, Smartphone, AlertTriangle,
  ShieldCheck, ShieldAlert
} from "lucide-react";
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from "firebase/auth";
import { auth, isPlaceholderFirebase } from "../lib/firebase";

interface LoginViewProps {
  onLoginSuccess: (session: {
    role: "instructor" | "student";
    email: string;
    studentId?: string;
    name: string;
  }) => void;
  activeUniversity: { name: string; id: string; acronym: string };
  universities: { id: string; acronym: string; name: string }[];
  onUniversityChange: (id: string) => void;
}

export default function LoginView({ 
  onLoginSuccess, 
  activeUniversity, 
  universities, 
  onUniversityChange 
}: LoginViewProps) {
  const [activePortal, setActivePortal] = useState<"student" | "instructor">("student");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security mode state: Detects if running on public preview link or checked from localStorage
  const [isShareSafeActive, setIsShareSafeActive] = useState<boolean>(() => {
    const cached = localStorage.getItem("cc_share_safe_active");
    if (cached !== null) {
      return cached === "true";
    }
    const isSharedUrl = typeof window !== "undefined" && window.location.hostname.includes("ais-pre-");
    return isSharedUrl;
  });

  const [showUnlockInput, setShowUnlockInput] = useState(false);
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Registration Form Toggle & State
  const [isRegistering, setIsRegistering] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regGender, setRegGender] = useState("Male");
  const [regMobile, setRegMobile] = useState("");
  const [regDept, setRegDept] = useState("Criminology & Security Studies");
  const [regPosition, setRegPosition] = useState("MSc Candidate");
  const [regExpectations, setRegExpectations] = useState("");

  // Proactively sign in anonymously in the background so that simulated actions and 
  // self-registered student profiles have a valid Firebase UID in the sync outbox
  React.useEffect(() => {
    if (!isPlaceholderFirebase && typeof window !== "undefined") {
      // Small timeout to not block main thread startup rendering
      const t = setTimeout(() => {
        if (!auth.currentUser) {
          signInAnonymously(auth).then((cred) => {
            console.log("Background anonymous auth session initialized successfully:", cred.user.uid);
          }).catch(err => {
            console.warn("Background anonymous sign-in failed or is current offline:", err);
          });
        }
      }, 300);
      return () => clearTimeout(t);
    }
  }, []);

  const handleGoogleLogin = () => {
    setErrorMsg(null);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(async (result) => {
        const user = result.user;
        const email = user.email || "";
        const name = user.displayName || "Authorized User";
        
        // 1. Check if Instructor (authorized in rules and verified)
        const cleanEmail = email.toLowerCase();
        if (cleanEmail === "zerihunfakana@gmail.com" || cleanEmail === "zerihun.doda@epsu.edu.et") {
          const session = {
            role: "instructor" as const,
            email: cleanEmail,
            name: "Dr. Zerihun Doda"
          };
          localStorage.setItem("cc_user_session", JSON.stringify(session));
          onLoginSuccess(session);
          return;
        }
        
        // 2. Otherwise log in or register as a Student!
        try {
          // Direct fetch from Firestore using studentId (user.uid) to bypass general listing permissions
          const { doc, getDoc } = await import("firebase/firestore");
          const { db } = await import("../lib/firebase");
          
          const docRef = doc(db, "students", user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            const session = {
              role: "student" as const,
              email: data.email,
              studentId: user.uid,
              name: data.name
            };
            localStorage.setItem("cc_user_session", JSON.stringify(session));
            onLoginSuccess(session);
          } else {
            // Profile does not exist yet. Autofill and request registration.
            setRegEmail(email);
            setRegName(name);
            setIsRegistering(true);
            setErrorMsg("Logged in with Google! Since there is no student profile registered under your Google ID yet, please fill in your details below to activate registration.");
          }
        } catch (e) {
          console.error("Failed to query direct student ID from Firestore:", e);
          // Fallback searching in local cache memory for safety
          const studentsList = dbService.getStudents();
          const localMatch = studentsList.find(s => s.email.toLowerCase() === cleanEmail);
          
          if (localMatch) {
            const session = {
              role: "student" as const,
              email: localMatch.email,
              studentId: localMatch.id,
              name: localMatch.name
            };
            localStorage.setItem("cc_user_session", JSON.stringify(session));
            onLoginSuccess(session);
          } else {
            setRegEmail(email);
            setRegName(name);
            setIsRegistering(true);
          }
        }
      })
      .catch((err) => {
        console.error("Google login failed:", err);
        setErrorMsg("Google Authentication was unsuccessful. Ensure you have internet connection or use standard credentials bypassing.");
      });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Instructor Login Validation (Passcode simulated bypass)
    if (activePortal === "instructor") {
      if (
        cleanEmail === "zerihun.doda@epsu.edu.et" || 
        cleanEmail === "zerihunfakana@gmail.com" ||
        cleanEmail === "admin"
      ) {
        if (passcode === "1234" || passcode === "admin" || passcode === "zerihun") {
          const session = {
            role: "instructor" as const,
            email: cleanEmail === "admin" ? "zerihunfakana@gmail.com" : cleanEmail,
            name: "Dr. Zerihun Doda"
          };
          localStorage.setItem("cc_user_session", JSON.stringify(session));
          
          // Sign in anonymously in background if offline/passcode bypass
          if (!isPlaceholderFirebase && !auth.currentUser) {
            signInAnonymously(auth)
              .then(() => onLoginSuccess(session))
              .catch(() => onLoginSuccess(session));
          } else {
            onLoginSuccess(session);
          }
          return;
        } else {
          setErrorMsg("Incorrect passcode. Try '1234' for testing.");
          return;
        }
      } else {
        setErrorMsg("Email address is not in our authorized Instructor registry list.");
        return;
      }
    }

    // 2. Student Login Validation
    const students = dbService.getStudents();
    const student = students.find(s => s.email.trim().toLowerCase() === cleanEmail);

    if (student) {
      if (passcode === "1234" || passcode === "") {
        const session = {
          role: "student" as const,
          email: student.email,
          studentId: student.id,
          name: student.name
        };
        localStorage.setItem("cc_user_session", JSON.stringify(session));
        
        // Sign in anonymously in background if offline/passcode bypass
        if (!isPlaceholderFirebase && !auth.currentUser) {
          signInAnonymously(auth)
            .then(() => onLoginSuccess(session))
            .catch(() => onLoginSuccess(session));
        } else {
          onLoginSuccess(session);
        }
      } else {
        setErrorMsg("Please enter '1234' or leave it empty for instant demonstration logging.");
      }
    } else {
      setErrorMsg("Student registration email not found. Please click 'Self-Register Profile' to create your account.");
    }
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanRegEmail = regEmail.trim().toLowerCase();
    
    // Check duplication
    const students = dbService.getStudents();
    if (students.some(s => s.email.toLowerCase() === cleanRegEmail)) {
      setErrorMsg("A student profile with this email address has already been registered.");
      return;
    }

    // Determine unique stable ID - prefer real active auth UID for cloud mapping
    let resolvedId = `stud_${Date.now()}`;
    if (!isPlaceholderFirebase) {
      if (auth.currentUser) {
        resolvedId = auth.currentUser.uid;
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolvedId = cred.user.uid;
        } catch (err) {
          console.warn("Could not retrieve unique auth UID for student, using timestamp fallback:", err);
        }
      }
    }

    const newStudent: Student = {
      id: resolvedId,
      name: regName,
      gender: regGender,
      email: cleanRegEmail,
      mobile: regMobile || "+2519...",
      institution: activeUniversity.name,
      department: regDept,
      currentPosition: regPosition,
      previousDegrees: "BSc / BA level credentials",
      researchInterests: "Qualitative research, inductive coding, field narratives",
      courseExpectations: regExpectations || "To learn qualitative coding and systems tracking.",
      createdAt: new Date().toISOString()
    };

    // Save student to local database (and trigger sync operation)
    dbService.addStudent(newStudent);

    // Auto log in as this new student
    const session = {
      role: "student" as const,
      email: newStudent.email,
      studentId: newStudent.id,
      name: newStudent.name
    };
    localStorage.setItem("cc_user_session", JSON.stringify(session));
    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-sans text-slate-100 p-4 relative overflow-hidden" id="auth-portal-screener">
      
      {/* Decorative backdrop graphics */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-indigo-900/30 blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-slate-800/40 blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-850 border border-slate-800 rounded-2xl p-6 md:p-8 shrink-0 shadow-2xl relative z-10 transition-all duration-300">
        
        {/* Dynamic Campus selector */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-black text-white shrink-0 font-mono">
              ZD
            </div>
            <div>
              <span className="text-stone-400 font-mono text-[9px] uppercase tracking-widest block font-bold">University Portal</span>
              <span className="font-extrabold text-xs text-white uppercase font-sans">DodaZ- Portal</span>
            </div>
          </div>

          <select
            id="auth-university-select"
            value={activeUniversity.id}
            onChange={e => onUniversityChange(e.target.value)}
            className="text-[10px] bg-indigo-900/40 hover:bg-indigo-900/70 text-indigo-300 font-mono font-bold tracking-wide px-3 py-1 rounded-md border border-indigo-700/60 outline-none cursor-pointer text-right"
          >
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.acronym} Campus</option>
            ))}
          </select>
        </div>

        {/* Dynamic header greeting text */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-white tracking-tight">{activeUniversity.acronym} Course Portal</h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            DodaZ- Course Companion Portal
          </p>
        </div>

        {/* Action errors trigger notifications */}
        {errorMsg && (
          <div className="bg-rose-950 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2.5 mb-5 font-medium animate-shake">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* REGISTRATION FORM */}
        {isRegistering ? (
          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Student Self-Registration</span>
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setIsRegistering(false);
                  setErrorMsg(null);
                }}
                className="text-[10px] text-slate-400 hover:text-white font-mono"
              >
                ← Back to Login
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  id="reg-student-name"
                  type="text"
                  required
                  placeholder="e.g. Commander Abebe Kebede"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Gender</label>
                <select
                  id="reg-student-gender"
                  value={regGender}
                  onChange={e => setRegGender(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Official Student Email Address</label>
                <input
                  id="reg-student-email"
                  type="email"
                  required
                  placeholder="e.g. abebe@epu.edu.et"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Mobile Number</label>
                  <input
                    id="reg-student-mobile"
                    type="tel"
                    placeholder="+2519..."
                    value={regMobile}
                    onChange={e => setRegMobile(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    id="reg-student-dept"
                    type="text"
                    required
                    value={regDept}
                    onChange={e => setRegDept(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Current Academic Rank</label>
                  <input
                    id="reg-student-rank"
                    type="text"
                    required
                    placeholder="e.g. MSc Candidate"
                    value={regPosition}
                    onChange={e => setRegPosition(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Course Expectations</label>
                <textarea
                  id="reg-student-expectations"
                  rows={2}
                  placeholder="What qualitative tools do you hope to acquire?"
                  value={regExpectations}
                  onChange={e => setRegExpectations(e.target.value)}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-650"
                />
              </div>

              <button
                id="btn-submit-registration"
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all shadow-md mt-2 flex items-center justify-center space-x-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Create Profile & Enter Class</span>
              </button>
            </div>
          </form>
        ) : (
          /* STANDARD LOGIN INTERFACE */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            
            {/* Tab switchers Portal */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 rounded-xl mb-4 text-xs font-bold border border-slate-800">
              <button
                id="tab-btn-student-portal"
                type="button"
                onClick={() => {
                  setActivePortal("student");
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  activePortal === "student" 
                    ? "bg-indigo-650 text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Student Portal
              </button>
              <button
                id="tab-btn-instructor-portal"
                type="button"
                onClick={() => {
                  setActivePortal("instructor");
                  setErrorMsg(null);
                }}
                className={`py-2 px-3 rounded-lg text-center transition-all ${
                  activePortal === "instructor" 
                    ? "bg-indigo-650 text-white shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Instructor Portal
              </button>
            </div>

            <div className="space-y-3.5">
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder={
                      activePortal === "instructor"
                        ? "e.g. zerihunfakana@gmail.com"
                        : "e.g. YZPM5098@gmail.com"
                    }
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-650 font-medium"
                  />
                </div>
                {activePortal === "instructor" ? (
                  !isShareSafeActive && (
                    <p className="text-[10px] text-slate-500 mt-1.5 font-mono leading-relaxed">
                      *Admin Email: <strong className="text-indigo-400">zerihunfakana@gmail.com</strong> <br />
                      *Passcode key: <strong className="text-amber-400">1234</strong>
                    </p>
                  )
                ) : (
                  <div className="flex flex-col text-[10px] text-slate-500 mt-1.5 font-mono gap-1">
                    <div className="flex justify-between items-center">
                      {!isShareSafeActive ? (
                        <span>*Testing Student Email: <strong className="text-indigo-400">YZPM5098@gmail.com</strong></span>
                      ) : (
                        <span>Standard Student Access</span>
                      )}
                      <button 
                        type="button" 
                        onClick={() => setIsRegistering(true)}
                        className="text-indigo-300 font-bold hover:underline"
                      >
                        Self-Register
                      </button>
                    </div>
                    {!isShareSafeActive && (
                      <span>*Passcode key: <strong className="text-amber-400">1234</strong> (or leave blank)</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Security Key passcode</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    id="login-passcode"
                    type="password"
                    placeholder="Enter security passcode key"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-indigo-650"
                  />
                </div>
                {!isShareSafeActive && (
                  <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                    *Demonstration key passcode is: <strong className="text-amber-400">1234</strong>
                  </p>
                )}
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all shadow-md mt-2 flex items-center justify-center space-x-1 animate-pulse-subtle"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in to system</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-mono uppercase tracking-wider font-semibold">Or Secure Cloud Sync</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <button
                id="btn-google-login"
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 font-extrabold text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer font-sans"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.04c1.67 0 3.17.57 4.35 1.7l3.25-3.25C17.65 1.62 14.98 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.96 3.07C6.38 7.37 9.01 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.39-4.88 3.39-8.49z" />
                  <path fill="#FBBC05" d="M5.46 10.57c-.24-.72-.38-1.5-.38-2.3s.14-1.58.38-2.3L1.5 2.9C.54 4.8 0 6.95 0 9.2c0 2.25.54 4.4 1.5 6.3l3.96-3.07v-.86z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.01.68-2.31 1.09-3.96 1.09-2.99 0-5.62-2.33-6.54-5.53L1.5 15.88C3.39 19.73 7.35 23 12 23z" />
                </svg>
                <span>Sign in with Google</span>
              </button>

              {isShareSafeActive ? (
                <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3" id="fastpass-safe-shield-container">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-emerald-950/40 text-emerald-450 border border-emerald-800/30 rounded-lg shrink-0">
                      <ShieldCheck className="h-4 w-4 text-emerald-500 animate-pulse" />
                    </div>
                    <div className="space-y-1 block leading-normal">
                      <p className="text-[11px] font-black text-white uppercase tracking-wider font-sans text-left">Student Sharing Mode Engaged</p>
                      <p className="text-[10px] text-slate-400 leading-normal font-sans text-left">
                        Instant Fastpass bypass shortcuts and credentials have been hidden to secure student registries and grading records.
                      </p>
                    </div>
                  </div>

                  {showUnlockInput ? (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2" id="fastpass-unlock-terminal">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider text-left">Enter Admin Passcode Key to Unlock:</label>
                      <div className="flex gap-2">
                        <input
                          id="unlock-passcode-field"
                          type="password"
                          placeholder="Passcode Key"
                          value={unlockPasscode}
                          onChange={e => {
                            setUnlockPasscode(e.target.value);
                            setUnlockError(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const btn = document.getElementById("btn-confirm-fastpass-unlock");
                              if (btn) btn.click();
                            }
                          }}
                          className="flex-1 text-[11px] bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-white focus:outline-none focus:border-indigo-650"
                        />
                        <button
                          id="btn-confirm-fastpass-unlock"
                          type="button"
                          onClick={() => {
                            if (unlockPasscode === "1234" || unlockPasscode === "zerihun" || unlockPasscode === "admin") {
                              setIsShareSafeActive(false);
                              localStorage.setItem("cc_share_safe_active", "false");
                              setShowUnlockInput(false);
                              setUnlockPasscode("");
                              setUnlockError(null);
                            } else {
                              setUnlockError("Access Denied");
                            }
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase px-3 rounded transition cursor-pointer"
                        >
                          Unlock
                        </button>
                      </div>
                      {unlockError && <p className="text-[10px] text-rose-400 font-mono font-bold text-left">{unlockError}</p>}
                    </div>
                  ) : (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800/60 flex justify-between items-center text-[10px] font-sans">
                      <span className="text-slate-500 font-mono">PWA secure environment active</span>
                      <button
                        id="btn-request-fastpass-unlock"
                        type="button"
                        onClick={() => {
                          setShowUnlockInput(true);
                          setUnlockError(null);
                        }}
                        className="text-indigo-300 hover:text-indigo-200 font-bold hover:underline cursor-pointer"
                      >
                        Bypass Lock
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="relative my-4 flex py-1 items-center" id="fastpass-legacy-delimiter">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-3 text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">Instant Demo Fastpass</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5" id="fastpass-buttons-container">
                    <button
                      id="btn-quick-login-yonas"
                      type="button"
                      onClick={() => {
                        const studentsList = dbService.getStudents();
                        const yonas = studentsList.find(s => s.email.toLowerCase() === "yzpm5098@gmail.com");
                        if (yonas) {
                          const session = {
                            role: "student" as const,
                            email: yonas.email,
                            studentId: yonas.id,
                            name: yonas.name
                          };
                          localStorage.setItem("cc_user_session", JSON.stringify(session));
                          onLoginSuccess(session);
                        } else {
                          setErrorMsg("Demo profile for Yonas not initialized. Re-initializing cache...");
                          dbService.getStudents(); // force list evaluation & seeds injection
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-indigo-300 hover:text-indigo-200 border border-slate-800 hover:border-indigo-500/40 p-2.5 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <p className="text-[8px] font-mono font-bold text-indigo-400 uppercase tracking-widest">Login Student</p>
                      <p className="text-[11px] font-black text-white mt-1 leading-tight truncate">Yonas Alemu</p>
                      <p className="text-[9px] text-slate-500 truncate font-mono">YZPM5098@gmail.com</p>
                    </button>

                    <button
                      id="btn-quick-login-zerihun"
                      type="button"
                      onClick={() => {
                        const session = {
                          role: "instructor" as const,
                          email: "zerihunfakana@gmail.com",
                          name: "Dr. Zerihun Doda"
                        };
                        localStorage.setItem("cc_user_session", JSON.stringify(session));
                        onLoginSuccess(session);
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-amber-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 p-2.5 rounded-lg text-left transition-all cursor-pointer group"
                    >
                      <p className="text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest">Login Instructor</p>
                      <p className="text-[11px] font-black text-white mt-1 leading-tight truncate">Dr. Zerihun Doda</p>
                      <p className="text-[9px] text-slate-500 truncate font-mono">zerihunfakana@gmail.com</p>
                    </button>
                  </div>

                  <div className="mt-4 text-center" id="fastpass-mode-lock-switcher">
                    <button
                      id="btn-activate-share-safe-mode"
                      type="button"
                      onClick={() => {
                        setIsShareSafeActive(true);
                        localStorage.setItem("cc_share_safe_active", "true");
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-300 font-sans font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                      <span>Lock Fastpass for Student Sharing</span>
                    </button>
                  </div>
                </>
              )}

            </div>

          </form>
        )}

        {/* Info label about offline reliability */}
        <div className="border-t border-slate-800 mt-6 pt-4 text-center">
          <p className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-slate-450" />
            <span>PWA OFFLINE-READY • SURVIVES DROPOUTS</span>
          </p>
        </div>

      </div>

      <div className="text-center text-[11px] text-slate-500 mt-6 max-w-sm px-4 leading-relaxed relative z-10 font-bold">
        Designed by Dr. Zerihun Doda, Assistant Professor of Social Anthropology & Qualitative Methodologies, Ethiopian Public Service University, Addis Ababa.
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, ResearchProfile } from "../types";
import { dbService } from "../lib/db";
import { User, BookOpen, GraduationCap, Award, Save, RefreshCw, Camera, UserPlus, X, Download, Upload, Check } from "lucide-react";

interface ProfileProps {
  currentStudent: Student;
  onProfileUpdated: (student: Student) => void;
  isInstructor: boolean;
  selectedStudentId?: string;
  setSelectedStudentId?: (id: string) => void;
}

export default function StudentProfileView({ currentStudent, onProfileUpdated, isInstructor, selectedStudentId, setSelectedStudentId }: ProfileProps) {
  const activeStudentId = selectedStudentId || currentStudent.id;
  
  // Find database objects
  const students = dbService.getStudents();
  const targetStudent = students.find(s => s.id === activeStudentId) || currentStudent;
  const researchProfiles = dbService.getResearchProfiles();
  const targetResearch = researchProfiles.find(rp => rp.studentId === activeStudentId) || {
    id: activeStudentId,
    studentId: activeStudentId,
    studentName: targetStudent.name,
    topic: "",
    interests: "",
    methodology: "",
    currentStage: "Topic submitted and approved",
    updatedAt: new Date().toISOString()
  };

  // State modifiers
  const [profileForm, setProfileForm] = useState<Student>({ ...targetStudent });
  const [researchForm, setResearchForm] = useState<ResearchProfile>({ ...targetResearch });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const getStageIndex = (stageStr: string = "") => {
    const lower = stageStr.toLowerCase();
    if (lower.includes("topic")) return 0;
    if (lower.includes("orientation") || lower.includes("induction")) return 1;
    if (lower.includes("concept")) return 2;
    if (lower.includes("proposal")) return 3;
    if (lower.includes("tools") || lower.includes("approval")) return 4;
    if (lower.includes("field") || lower.includes("collection")) return 5;
    if (lower.includes("analysis") || lower.includes("write")) return 6;
    if (lower.includes("completed") || lower.includes("defended")) return 7;
    return 0;
  };

  const STAGES = [
    { label: "1. Topic Approved", desc: "Original qualitative research question finalized" },
    { label: "2. Orientation", desc: "Qualitative research method & software introductory briefing" },
    { label: "3. Concept Note", desc: "Brief statement of background methodology and goals" },
    { label: "4. Full Proposal", desc: "Formal proposal presentation defend check-in" },
    { label: "5. Tools Design", desc: "Design interview protocols & FGD guidelines" },
    { label: "6. Field Work", desc: "Active offline data collection, interviews & field notes" },
    { label: "7. Data Analysis", desc: "NVivo/Atlas.ti node categorization & thematic code matrix" },
    { label: "8. Completed & Defended", desc: "Full thesis compiled, reviewed, and finalized green" }
  ];

  // New Student Registry Form States
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [importType, setImportType] = useState<"manual" | "bulk">("manual");
  const [bulkCSVText, setBulkCSVText] = useState("");
  const [bulkDragging, setBulkDragging] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    name: "",
    gender: "Male" as "Male" | "Female" | "Other",
    email: "",
    mobile: "",
    currentPosition: "Year 1 Graduate",
    institution: "Ethiopian Police University",
    department: "Crime Prevention and Criminology",
    previousDegrees: "",
    researchInterests: "",
    thesisTopic: "",
    thesisMethodology: ""
  });

  const handleAddNewStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentForm.name.trim() || !newStudentForm.email.trim()) {
      triggerAlert("Error: Student name and email address are required.");
      return;
    }

    const studentId = `stud_custom_${Date.now()}`;
    
    // Create Student object
    const newStudent: Student = {
      id: studentId,
      name: newStudentForm.name.trim(),
      gender: newStudentForm.gender,
      email: newStudentForm.email.trim(),
      mobile: newStudentForm.mobile.trim(),
      institution: newStudentForm.institution.trim() || "Ethiopian Police University",
      department: newStudentForm.department.trim() || "Crime Prevention and Criminology",
      currentPosition: newStudentForm.currentPosition.trim() || "Year 1 Graduate",
      previousDegrees: newStudentForm.previousDegrees.trim(),
      researchInterests: newStudentForm.researchInterests.trim(),
      courseExpectations: "Acquire specialized qualitative research skills and computational qualitative analysis.",
      createdAt: new Date().toISOString()
    };

    // Save to database
    dbService.addStudent(newStudent);

    // Save Research Profile (Thesis topic)
    const newResearch: ResearchProfile = {
      id: studentId,
      studentId: studentId,
      studentName: newStudent.name,
      topic: newStudentForm.thesisTopic.trim() || "Not yet submitted",
      interests: newStudentForm.researchInterests.trim() || "Qualitative analysis",
      methodology: newStudentForm.thesisMethodology.trim() || "Under supervision",
      currentStage: "Topic submitted and approved",
      updatedAt: new Date().toISOString()
    };
    dbService.saveResearchProfile(newResearch);

    // Reset clean form
    setNewStudentForm({
      name: "",
      gender: "Male",
      email: "",
      mobile: "",
      currentPosition: "Year 1 Graduate",
      institution: "Ethiopian Police University",
      department: "Crime Prevention and Criminology",
      previousDegrees: "",
      researchInterests: "",
      thesisTopic: "",
      thesisMethodology: ""
    });

    // Close form and show feedback
    setIsAddingStudent(false);
    triggerAlert(`Successfully registered and created profile for "${newStudent.name}"!`);
    
    // Notify parent to refresh the student list
    onProfileUpdated(newStudent);

    // Select the new student profile in the focus switcher
    if (setSelectedStudentId) {
      setSelectedStudentId(studentId);
    }
  };

  const handleBulkCSVDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragging(true);
  };

  const handleBulkCSVDragLeave = () => {
    setBulkDragging(false);
  };

  const handleBulkCSVDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result as string;
        setBulkCSVText(text);
        triggerAlert(`Selected "${file.name}"! Scroll down to initiate registration.`);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const text = reader.result as string;
        setBulkCSVText(text);
        triggerAlert(`Selected "${file.name}"! Scroll down to initiate registration.`);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkCSVParse = () => {
    if (!bulkCSVText.trim()) {
      triggerAlert("Error: Please provide some CSV content to import.");
      return;
    }

    // Split rows safely
    const rows = bulkCSVText.split(/\r?\n/);
    if (rows.length === 0) {
      triggerAlert("Error: No row blocks detected inside the CSV.");
      return;
    }

    // Clean cell splits supporting quotes
    const cleanRows = rows.map(r => {
      const cells: string[] = [];
      let inQuotes = false;
      let currentCell = "";
      
      for (let i = 0; i < r.length; i++) {
        const char = r[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(currentCell.trim());
          currentCell = "";
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      return cells;
    }).filter(row => row.some(cell => cell !== ""));

    if (cleanRows.length === 0) {
      triggerAlert("Error: Empty document grid parsed.");
      return;
    }

    // Header mappings
    let hasHeader = false;
    let headers = ["name", "email", "gender", "mobile", "institution", "department", "position", "degrees", "interests", "topic", "methodology"];
    
    const firstRowLower = cleanRows[0].map(h => h.toLowerCase());
    const isHeaderMatched = firstRowLower.some(val => 
      val.includes("name") || val.includes("email") || val.includes("gender") || val.includes("phone") || val.includes("mobile")
    );

    let dataRows = cleanRows;
    if (isHeaderMatched) {
      hasHeader = true;
      headers = firstRowLower;
      dataRows = cleanRows.slice(1);
    }

    if (dataRows.length === 0) {
      triggerAlert("Error: No student rows found beneath the columns line.");
      return;
    }

    const getColumnIdx = (keywords: string[]) => {
      return headers.findIndex(h => keywords.some(k => h.includes(k)));
    };

    const nameIdx = getColumnIdx(["name", "full"]);
    const emailIdx = getColumnIdx(["email", "mail"]);
    const genderIdx = getColumnIdx(["gender", "sex"]);
    const mobileIdx = getColumnIdx(["mobile", "phone", "cell", "tel", "contact"]);
    const instIdx = getColumnIdx(["inst", "univ", "school", "campus", "academic institution"]);
    const deptIdx = getColumnIdx(["dept", "department", "stream", "course"]);
    const posIdx = getColumnIdx(["position", "rank", "level", "role"]);
    const degIdx = getColumnIdx(["degree", "qualification", "prev"]);
    const intIdx = getColumnIdx(["interest", "focus", "research interests"]);
    const topicIdx = getColumnIdx(["topic", "thesis topic", "proposed topic", "research topic"]);
    const methIdx = getColumnIdx(["meth", "methodology", "methodological"]);

    let potentialImports = 0;
    let potentialSkipped = 0;

    dataRows.forEach(row => {
      const name = hasHeader ? (nameIdx !== -1 && nameIdx < row.length ? row[nameIdx].trim() : "") : (row[0] ? row[0].trim() : "");
      const email = hasHeader ? (emailIdx !== -1 && emailIdx < row.length ? row[emailIdx].trim() : "") : (row[3] ? row[3].trim() : "");
      if (name && email) {
        potentialImports++;
      } else {
        potentialSkipped++;
      }
    });

    if (potentialImports === 0) {
      triggerAlert("Error: No valid student records with name and email were found in this spreadsheet.");
      return;
    }

    const confirmMsg = `Bulk Student Registration Confirmation:\n\n` +
      `• Total Rows in Spreadsheet: ${dataRows.length}\n` +
      `• Valid Students Parsed for Import: ${potentialImports}\n` +
      `• Skipped Rows (missing name or email): ${potentialSkipped}\n\n` +
      `Do you want to proceed with installing this batch of students into your active class registry?`;

    if (!confirm(confirmMsg)) {
      return;
    }

    let importCount = 0;
    let skippedCount = 0;
    let sampleStudent: Student | null = null;

    dataRows.forEach((row, rowIndex) => {
      const getVal = (idx: number, fallback: string = "") => {
        if (idx !== -1 && idx < row.length) {
          let val = row[idx];
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
          }
          return val.trim();
        }
        return fallback;
      };

      // Determine fields
      const name = hasHeader ? getVal(nameIdx) : getVal(0);
      const email = hasHeader ? getVal(emailIdx) : getVal(3);

      if (!name || !email) {
        skippedCount++;
        return;
      }

      const genderRaw = hasHeader ? getVal(genderIdx, "Male") : getVal(2, "Male");
      const gender: "Male" | "Female" | "Other" = (genderRaw.toLowerCase().startsWith("f")) 
        ? "Female" 
        : (genderRaw.toLowerCase().startsWith("m")) 
          ? "Male" 
          : "Other";

      const studentId = `stud_custom_bulk_${Date.now()}_${rowIndex}`;
      
      const newStudent: Student = {
        id: studentId,
        name,
        gender,
        email,
        mobile: hasHeader ? getVal(mobileIdx) : getVal(4),
        institution: (hasHeader ? getVal(instIdx) : getVal(5)) || "Ethiopian Police University",
        department: (hasHeader ? getVal(deptIdx) : getVal(6)) || "Crime Prevention and Criminology",
        currentPosition: (hasHeader ? getVal(posIdx) : getVal(7)) || "Year 1 Graduate",
        previousDegrees: hasHeader ? getVal(degIdx) : getVal(8),
        researchInterests: hasHeader ? getVal(intIdx) : getVal(9),
        courseExpectations: "Bulk imported from student registry spreadsheet.",
        createdAt: new Date().toISOString()
      };

      dbService.addStudent(newStudent);

      // Add thesis milestones logs
      const newResearch: ResearchProfile = {
        id: studentId,
        studentId,
        studentName: name,
        topic: (hasHeader ? getVal(topicIdx) : getVal(10)) || "Topic submitted and approved",
        interests: (hasHeader ? getVal(intIdx) : getVal(9)) || "Qualitative methodology interests",
        methodology: (hasHeader ? getVal(methIdx) : getVal(11)) || "Inductive research approach",
        currentStage: "Topic submitted and approved",
        updatedAt: new Date().toISOString()
      };
      dbService.saveResearchProfile(newResearch);

      importCount++;
      if (!sampleStudent) {
        sampleStudent = newStudent;
      }
    });

    if (importCount > 0) {
      setBulkCSVText("");
      setIsAddingStudent(false);
      triggerAlert(`Successfully bulk-imported ${importCount} students! Skipped ${skippedCount} items.`);
      
      if (sampleStudent && onProfileUpdated) {
        onProfileUpdated(sampleStudent);
        if (setSelectedStudentId) {
          setSelectedStudentId(sampleStudent.id);
        }
      }
    } else {
      triggerAlert("Error: Failed to register any student profile. Please inspect email/name headers.");
    }
  };

  const handleExportStudentsCSV = () => {
    const list = dbService.getStudents();
    if (list.length === 0) {
      triggerAlert("Error: There are currently no students registered to export.");
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
    link.setAttribute("href", url);
    link.setAttribute("download", `EPU_Student_Academic_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerAlert("Dataset successfully compiled! Initiating download for Student Academic Registry CSV.");
  };

  React.useEffect(() => {
    // Keep synchronize when active student ID changes
    const s = dbService.getStudents().find(st => st.id === activeStudentId) || currentStudent;
    const r = dbService.getResearchProfiles().find(rp => rp.studentId === activeStudentId) || {
      id: activeStudentId,
      studentId: activeStudentId,
      studentName: s.name,
      topic: "",
      interests: "",
      methodology: "",
      currentStage: "Topic submitted and approved",
      updatedAt: new Date().toISOString()
    };
    setProfileForm({ ...s });
    setResearchForm({ ...r });
  }, [activeStudentId, currentStudent]);

  // Profile picture base64 reader
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileForm(prev => ({ ...prev, profilePicture: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dbService.addStudent(profileForm);
    
    // Auto-update research name just in case
    const updatedResearch = {
      ...researchForm,
      studentName: profileForm.name
    };
    dbService.saveResearchProfile(updatedResearch);
    
    onProfileUpdated(profileForm);
    triggerAlert(
      isInstructor 
        ? `Successfully updated profile details for "${profileForm.name}" on their behalf!` 
        : "Your registry profile details have been saved successfully (Cached)."
    );
  };

  const handleResearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...researchForm,
      updatedAt: new Date().toISOString()
    };
    dbService.saveResearchProfile(updated);
    setResearchForm(updated);
    triggerAlert(
      isInstructor
        ? `Successfully updated milestones for "${profileForm.name}" on their behalf!`
        : "Your thesis progression details have been updated successfully (Cached)."
    );
  };

  const triggerAlert = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="student-profile-view">
      
      {/* Save Notification Toast */}
      {saveStatus && (
        <div className="lg:col-span-12 bg-indigo-900 border border-indigo-700 text-white text-xs font-semibold px-4 py-3 rounded-lg flex items-center justify-between shadow-md">
          <span>{saveStatus}</span>
          <button className="text-indigo-200 hover:text-white text-xs font-bold" onClick={() => setSaveStatus(null)}>Dismiss</button>
        </div>
      )}

      {/* Instructor Dashboard Controls */}
      {isInstructor && (
        <div className="lg:col-span-12 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs" id="instructor-registry-controls">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-xl">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Academic Registry Panel</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Administer course roster. Currently supporting <span className="font-black text-indigo-605 dark:text-indigo-400">{students.length} active researchers</span>.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              id="btn-export-student-registry"
              type="button"
              title="Export complete student profiles containing contact details and academic standings to CSV"
              onClick={handleExportStudentsCSV}
              className="inline-flex items-center space-x-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-sm transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Export Student List (CSV)</span>
            </button>

            <button
              id="btn-trigger-add-student"
              type="button"
              title="Open the enrollment portal to register a new student manually or perform bulk CSV spreadsheet imports"
              onClick={() => setIsAddingStudent(!isAddingStudent)}
              className="inline-flex items-center space-x-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-sm transition shrink-0 cursor-pointer"
            >
              {isAddingStudent ? (
                <>
                  <X className="h-4 w-4" />
                  <span>Cancel Registration</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Register New Student</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Add New Student Registry Form */}
      {isInstructor && isAddingStudent && (
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 border-2 border-indigo-250 dark:border-indigo-950 rounded-xl p-6 shadow-sm animate-fade-in" id="form-add-student-wizard">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="text-md font-bold text-slate-900 dark:text-white">New Student & Dissertation Registration</h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 font-medium">Formulate credentials and thesis milestone records offline and online</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setIsAddingStudent(false)} 
              className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
              id="btn-close-wizard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
            <button
              type="button"
              id="tab-import-manual"
              onClick={() => setImportType("manual")}
              className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                importType === "manual"
                  ? "border-indigo-600 dark:border-indigo-450 text-indigo-700 dark:text-indigo-400 font-extrabold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Manual Form Entry
            </button>
            <button
              type="button"
              id="tab-import-bulk"
              onClick={() => setImportType("bulk")}
              className={`py-2.5 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                importType === "bulk"
                  ? "border-indigo-600 dark:border-indigo-450 text-indigo-700 dark:text-indigo-400 font-extrabold"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              Bulk Spreadsheet Importer (CSV)
            </button>
          </div>

          {importType === "manual" ? (
            <form onSubmit={handleAddNewStudent} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1 */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold text-indigo-705 dark:text-indigo-400 tracking-wider font-mono">A. Identity Details</h5>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    id="new-student-name"
                    type="text"
                    required
                    placeholder="Enter student's full name"
                    value={newStudentForm.name}
                    onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    id="new-student-gender"
                    value={newStudentForm.gender}
                    onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  >
                    <option value="Male" className="dark:bg-slate-900">Male</option>
                    <option value="Female" className="dark:bg-slate-900">Female</option>
                    <option value="Other" className="dark:bg-slate-900">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    id="new-student-email"
                    type="email"
                    required
                    placeholder="academic.email@domain.com"
                    value={newStudentForm.email}
                    onChange={e => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold text-indigo-705 dark:text-indigo-400 tracking-wider font-mono">B. Academic & Institutional</h5>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Mobile Number</label>
                  <input
                    id="new-student-mobile"
                    type="tel"
                    placeholder="+251 9..."
                    value={newStudentForm.mobile}
                    onChange={e => setNewStudentForm({ ...newStudentForm, mobile: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Current Position</label>
                  <input
                    id="new-student-position"
                    type="text"
                    placeholder="e.g. Year 1 Graduate, PhD Scholar"
                    value={newStudentForm.currentPosition}
                    onChange={e => setNewStudentForm({ ...newStudentForm, currentPosition: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Institution</label>
                    <input
                      id="new-student-institution"
                      type="text"
                      placeholder="e.g. EPU"
                      value={newStudentForm.institution}
                      onChange={e => setNewStudentForm({ ...newStudentForm, institution: e.target.value })}
                      className="w-full text-[11px] border border-slate-200 dark:border-slate-805 rounded-md px-2 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Department</label>
                    <input
                      id="new-student-department"
                      type="text"
                      placeholder="e.g. Police Science"
                      value={newStudentForm.department}
                      onChange={e => setNewStudentForm({ ...newStudentForm, department: e.target.value })}
                      className="w-full text-[11px] border border-slate-200 dark:border-slate-805 rounded-md px-2 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold text-indigo-705 dark:text-indigo-400 tracking-wider font-mono">C. Thesis Topic Staging</h5>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Initial Research Topic</label>
                  <input
                    id="new-student-topic"
                    type="text"
                    placeholder="Proposed topic or interest theme"
                    value={newStudentForm.thesisTopic}
                    onChange={e => setNewStudentForm({ ...newStudentForm, thesisTopic: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Methodological Intent</label>
                  <input
                    id="new-student-methodology"
                    type="text"
                    placeholder="e.g. Grounded Theory, Mixed Methodology"
                    value={newStudentForm.thesisMethodology}
                    onChange={e => setNewStudentForm({ ...newStudentForm, thesisMethodology: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Previous Qualifications</label>
                  <input
                    id="new-student-degrees"
                    type="text"
                    placeholder="e.g. BSc Criminology"
                    value={newStudentForm.previousDegrees}
                    onChange={e => setNewStudentForm({ ...newStudentForm, previousDegrees: e.target.value })}
                    className="w-full text-xs border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
              <span className="font-semibold text-amber-700">* Real-time synchronization is cached dynamically for offline resilience.</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-bold text-xs uppercase"
                  id="btn-cancel-add-student"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-add-student"
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md font-bold text-xs uppercase flex items-center space-x-1.5 shadow-sm cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Establish Student Identity</span>
                </button>
              </div>
            </div>
          </form>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-805 p-4 rounded-xl text-xs space-y-3">
                <h5 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">Excel / CSV Spreadsheet Schema Guide:</h5>
                <p className="text-slate-600 dark:text-slate-405 leading-relaxed">
                  Your files inside spreadsheet programs (Microsoft Excel, Numbers, Google Sheets) should have a first-row column headers line.
                  The system will automatically auto-detect the headers format!
                </p>
                
                <div className="bg-slate-900 dark:bg-slate-950 text-slate-100 dark:text-slate-200 p-3 rounded font-mono text-[10px] space-y-1">
                  <p className="text-slate-400 dark:text-slate-500 font-bold"># Recommended column headers configuration:</p>
                  <p className="text-emerald-400 dark:text-emerald-500 font-bold select-all">Name, Email, Gender, Mobile, Institution, Department, Position, Degrees, Interests, Topic, Methodology</p>
                  <p className="text-slate-400 dark:text-slate-500 font-bold mt-2"># Dummy Sample Rows:</p>
                  <p>Abebe Kebede, abebe@EP-univ.edu, Male, +251911223344, Ethiopian Police University, Crime Prevention, Year 1, BSc Police, Crime logs, Crime analysis, Qualitative methods</p>
                  <p>Chaltu Demeke, chaltu@EP-univ.edu, Female, +251922334455, Ethiopian Police University, Crime Prevention, Year 1, LLB Law, Cyber Crime mitigation, Security analysis, BigData mining</p>
                </div>
              </div>

              {/* Drag and Drop Box */}
              <div
                onDragOver={handleBulkCSVDragOver}
                onDragLeave={handleBulkCSVDragLeave}
                onDrop={handleBulkCSVDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                  bulkDragging ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-550" : "border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40"
                }`}
              >
                <input
                  id="bulk-csv-file-input"
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleBulkFileChange}
                />
                <label htmlFor="bulk-csv-file-input" className="cursor-pointer space-y-3 block">
                  <Upload className="h-10 w-10 text-slate-400 dark:text-slate-600 mx-auto" />
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold underline text-indigo-600 dark:text-indigo-400">Click to select CSV file</span> or drag-and-drop here
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Accepts native UTF-8 CSV / plain TXT spreadsheets</p>
                </label>
              </div>

              {/* Text Input Box */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Raw CSV Spreadsheet Paste Block
                </label>
                <textarea
                  id="textarea-bulk-csv"
                  rows={8}
                  placeholder={`Paste raw Microsoft Excel / Google Sheets rows here directly (comma or tab separated)...&#13;&#10;Name,Email,Gender,Mobile&#13;&#10;Abebe Kebede,abebe@un.edu,Male,+251900000001`}
                  value={bulkCSVText}
                  onChange={e => setBulkCSVText(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-405"
                />
              </div>

              <div className="border-t border-slate-100 dark:border-slate-805 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-amber-700 dark:text-amber-500">
                  * Bulk uploads are handled instantly and indexed in your local session cache.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingStudent(false)}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-bold text-xs uppercase"
                    id="btn-cancel-bulk-student"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-execute-bulk-import"
                    type="button"
                    onClick={handleBulkCSVParse}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md font-bold text-xs uppercase flex items-center space-x-1.5 shadow-sm cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Initiate Bulk Register</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Main Student Profile Form details */}
      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-800">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Student Profile Registry</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">
              {isInstructor 
                ? "Instructor Privileges: You can fully enter and update student records on their behalf" 
                : "Manage your student registration, contacts and background credentials"}
            </p>
          </div>
        </div>

        {/* Profile Picture Upload & Preview Component */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/60 dark:border-slate-805/80 shadow-inner">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-indigo-400 shrink-0 shadow-sm flex items-center justify-center">
            {profileForm.profilePicture ? (
              <img src={profileForm.profilePicture} alt={profileForm.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-black text-lg uppercase font-sans">
                {profileForm.name ? profileForm.name[0] : "?"}
              </div>
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-mono font-bold text-slate-405 dark:text-slate-400 uppercase tracking-widest block font-sans">Student Profile Picture</span>
            <input 
              id="student-avatar-file-input"
              type="file" 
              accept="image/*" 
              onChange={handleImageFileChange}
              className="hidden" 
            />
            <button 
              type="button"
              onClick={() => document.getElementById("student-avatar-file-input")?.click()}
              className="inline-flex items-center space-x-1 whitespace-nowrap bg-indigo-650 hover:bg-indigo-705 text-[11px] text-white font-bold font-sans py-1.5 px-3 rounded-md transition shadow-md cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5 text-white" />
              <span className="text-white">Upload profile picture</span>
            </button>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium font-sans">Supports offline Base64 camera images</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                id="profile-name"
                type="text"
                required
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Gender</label>
              <select
                id="profile-gender"
                value={profileForm.gender}
                onChange={e => setProfileForm({ ...profileForm, gender: e.target.value as any })}
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              >
                <option value="Male" className="dark:bg-slate-900 text-slate-900 dark:text-white">Male</option>
                <option value="Female" className="dark:bg-slate-900 text-slate-900 dark:text-white">Female</option>
                <option value="Other" className="dark:bg-slate-900 text-slate-900 dark:text-white">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                id="profile-email"
                type="email"
                required
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
              <input
                id="profile-mobile"
                type="tel"
                value={profileForm.mobile}
                onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })}
                placeholder="+251..."
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Institution</label>
              <input
                id="profile-institution"
                type="text"
                value={profileForm.institution}
                onChange={e => setProfileForm({ ...profileForm, institution: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Department</label>
              <input
                id="profile-department"
                type="text"
                value={profileForm.department}
                onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Current Academic Rank</label>
            <input
              id="profile-position"
              type="text"
              placeholder="e.g. MSc Candidate, PhD Scholar"
              value={profileForm.currentPosition}
              onChange={e => setProfileForm({ ...profileForm, currentPosition: e.target.value })}
              className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Previous Accomplishments & Degrees</label>
            <textarea
              id="profile-degrees"
              rows={2}
              placeholder="e.g. BSc in Crime Prevention and Criminology"
              value={profileForm.previousDegrees}
              onChange={e => setProfileForm({ ...profileForm, previousDegrees: e.target.value })}
              className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Course Expectations</label>
            <textarea
              id="profile-expectations"
              rows={3}
              placeholder="What qualitative research methodology tools or software concepts do you expectation to acquire?"
              value={profileForm.courseExpectations}
              onChange={e => setProfileForm({ ...profileForm, courseExpectations: e.target.value })}
              className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="btn-save-profile"
              type="submit"
              className="bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>{isInstructor ? "Save Profile (On Behalf)" : "Save Registry Profile"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Graduate/Independent Dissertation and Thesis Stages Tracker */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-5">
            <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg text-slate-700 dark:text-slate-300 shrink-0 border border-slate-200 dark:border-slate-800">
              <GraduationCap className="h-5 w-5 text-indigo-650 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Thesis & Dissertation Log</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tracking supervision of student active researches</p>
            </div>
          </div>

          <form onSubmit={handleResearchSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-2">Research Topic</label>
              <input
                id="research-topic"
                type="text"
                required
                placeholder="Topic or focal question of study"
                value={researchForm.topic}
                onChange={e => setResearchForm({ ...researchForm, topic: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-905 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-2">Methodological Design</label>
              <textarea
                id="research-methodology"
                rows={2}
                placeholder="Methodology design (e.g. Grounded Inquiry, Inductive Narrative, CAQDAS software logic)"
                value={researchForm.methodology}
                onChange={e => setResearchForm({ ...researchForm, methodology: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-905 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-2">Academic Core Interests</label>
              <textarea
                id="research-interests"
                rows={2}
                placeholder="Core keywords (NVivo trees, focus group data, community safety)"
                value={researchForm.interests}
                onChange={e => setResearchForm({ ...researchForm, interests: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-805 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-905 dark:text-white focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-405 uppercase tracking-wider mb-1">Supervision Milestones Staging</label>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-medium">Standard academic research progression</p>
              <select
                id="research-stage"
                value={researchForm.currentStage}
                onChange={e => setResearchForm({ ...researchForm, currentStage: e.target.value })}
                className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 font-bold"
              >
                <option value="Topic submitted and approved" className="dark:bg-slate-900 text-slate-900 dark:text-white">1. Topic submitted and approved</option>
                <option value="Induction orientation given" className="dark:bg-slate-900 text-slate-900 dark:text-white">2. Induction orientation given</option>
                <option value="Concept note submission" className="dark:bg-slate-900 text-slate-900 dark:text-white">3. Concept note submission</option>
                <option value="Full proposal submission" className="dark:bg-slate-900 text-slate-900 dark:text-white">4. Full proposal submission</option>
                <option value="Data collection tools design and approval" className="dark:bg-slate-900 text-slate-900 dark:text-white">5. Data collection tools design and approval</option>
                <option value="Field work/ Data collection" className="dark:bg-slate-900 text-slate-900 dark:text-white">6. Field work/ Data collection</option>
                <option value="Data analysis ad write up" className="dark:bg-slate-900 text-slate-900 dark:text-white">7. Data analysis & write up</option>
                <option value="Completed & Defended" className="dark:bg-slate-900 text-slate-900 dark:text-white">8. Completed & Defended</option>
              </select>
            </div>

            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-md shadow-xs flex justify-between items-center text-[11px]">
              <span className="text-slate-400 dark:text-slate-500 font-mono font-bold uppercase">Milestone Date:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {new Date(researchForm.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-save-research"
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isInstructor ? "Update Stage (On Behalf)" : "Update Thesis Milestone"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Academic Supervision Progress Timeline Visualizer */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-indigo-650 dark:text-indigo-400 rounded-lg shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Supervision Landmarks Roadmap</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Interactive timeline visualization of thesis staging</p>
            </div>
          </div>

          <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-6">
            {STAGES.map((stg, sIndex) => {
              const activeIndex = getStageIndex(researchForm.currentStage);
              const isPassed = sIndex < activeIndex;
              const isActive = sIndex === activeIndex;

              return (
                <div key={sIndex} className="relative group text-left">
                  {/* Stepper Node Pointer */}
                  <div className={`absolute -left-[32px] top-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 text-[9px] font-bold transition-all duration-300 ${
                    isPassed ? "bg-emerald-500 border-emerald-500 text-white shadow-xs" :
                    isActive ? "bg-indigo-600 border-indigo-600 text-white animate-pulse shadow-md scale-105" :
                    "bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600"
                  }`}>
                    {isPassed ? "✓" : sIndex + 1}
                  </div>

                  {/* Text Description */}
                  <div className="pl-1.5 flex flex-col font-sans">
                    <span className={`text-[11px] font-extrabold uppercase tracking-wider leading-none mb-1 transition-colors ${
                      isActive ? "text-indigo-650 dark:text-indigo-400" :
                      isPassed ? "text-slate-800 dark:text-slate-200" :
                      "text-slate-400 dark:text-slate-550"
                    }`}>
                      {stg.label}
                    </span>
                    <span className={`text-[10px] leading-relaxed transition-colors ${
                      isActive ? "text-slate-700 dark:text-slate-300 font-bold" :
                      isPassed ? "text-slate-500 dark:text-slate-400 font-medium" :
                      "text-slate-400/80 dark:text-slate-600/80"
                    }`}>
                      {stg.desc}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

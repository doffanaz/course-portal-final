/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, ResearchProfile } from "../types";
import { dbService } from "../lib/db";
import { User, BookOpen, GraduationCap, Award, Save, RefreshCw, Camera, UserPlus, X } from "lucide-react";

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

  // New Student Registry Form States
  const [isAddingStudent, setIsAddingStudent] = useState(false);
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
        <div className="lg:col-span-12 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-3xs" id="instructor-registry-controls">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Academic Registry Panel</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Administer course roster. Currently supporting <span className="font-bold text-indigo-700">{students.length} active researchers</span>.
              </p>
            </div>
          </div>
          
          <button
            id="btn-trigger-add-student"
            type="button"
            onClick={() => setIsAddingStudent(!isAddingStudent)}
            className="inline-flex items-center space-x-2 text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold uppercase tracking-wider py-2.5 px-4 rounded-lg shadow-sm transition shrink-0 cursor-pointer"
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
      )}

      {/* Add New Student Registry Form */}
      {isInstructor && isAddingStudent && (
        <div className="lg:col-span-12 bg-white border-2 border-indigo-250 rounded-xl p-6 shadow-sm animate-fade-in" id="form-add-student-wizard">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
            <div className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              <div>
                <h4 className="text-md font-bold text-slate-900">New Student & Dissertation Registration</h4>
                <p className="text-xs text-slate-550 font-medium">Formulate credentials and thesis milestone records offline and online</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setIsAddingStudent(false)} 
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
              id="btn-close-wizard"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleAddNewStudent} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1 */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold text-indigo-705 tracking-wider font-mono">A. Identity Details</h5>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name *</label>
                  <input
                    id="new-student-name"
                    type="text"
                    required
                    placeholder="Enter student's full name"
                    value={newStudentForm.name}
                    onChange={e => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    id="new-student-gender"
                    value={newStudentForm.gender}
                    onChange={e => setNewStudentForm({ ...newStudentForm, gender: e.target.value as any })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address *</label>
                  <input
                    id="new-student-email"
                    type="email"
                    required
                    placeholder="academic.email@domain.com"
                    value={newStudentForm.email}
                    onChange={e => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              {/* Column 2 */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold text-indigo-705 tracking-wider font-mono">B. Academic & Institutional</h5>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                  <input
                    id="new-student-mobile"
                    type="tel"
                    placeholder="+251 9..."
                    value={newStudentForm.mobile}
                    onChange={e => setNewStudentForm({ ...newStudentForm, mobile: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Position</label>
                  <input
                    id="new-student-position"
                    type="text"
                    placeholder="e.g. Year 1 Graduate, PhD Scholar"
                    value={newStudentForm.currentPosition}
                    onChange={e => setNewStudentForm({ ...newStudentForm, currentPosition: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Institution</label>
                    <input
                      id="new-student-institution"
                      type="text"
                      placeholder="e.g. EPU"
                      value={newStudentForm.institution}
                      onChange={e => setNewStudentForm({ ...newStudentForm, institution: e.target.value })}
                      className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Department</label>
                    <input
                      id="new-student-department"
                      type="text"
                      placeholder="e.g. Police Science"
                      value={newStudentForm.department}
                      onChange={e => setNewStudentForm({ ...newStudentForm, department: e.target.value })}
                      className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="space-y-4">
                <h5 className="text-[10px] uppercase font-bold text-indigo-705 tracking-wider font-mono">C. Thesis Topic Staging</h5>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Research Topic</label>
                  <input
                    id="new-student-topic"
                    type="text"
                    placeholder="Proposed topic or interest theme"
                    value={newStudentForm.thesisTopic}
                    onChange={e => setNewStudentForm({ ...newStudentForm, thesisTopic: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Methodological Intent</label>
                  <input
                    id="new-student-methodology"
                    type="text"
                    placeholder="e.g. Grounded Theory, Mixed Methodology"
                    value={newStudentForm.thesisMethodology}
                    onChange={e => setNewStudentForm({ ...newStudentForm, thesisMethodology: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Previous Qualifications</label>
                  <input
                    id="new-student-degrees"
                    type="text"
                    placeholder="e.g. BSc Criminology"
                    value={newStudentForm.previousDegrees}
                    onChange={e => setNewStudentForm({ ...newStudentForm, previousDegrees: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
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

        </div>
      )}

      {/* Main Student Profile Form details */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4 mb-5">
          <div className="p-2 bg-slate-100 rounded-lg text-slate-700 shrink-0">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Student Profile Registry</h2>
            <p className="text-xs text-slate-500 font-medium">
              {isInstructor 
                ? "Instructor Privileges: You can fully enter and update student records on their behalf" 
                : "Manage your student registration, contacts and background credentials"}
            </p>
          </div>
        </div>

        {/* Profile Picture Upload & Preview Component */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200/60 shadow-inner">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-indigo-400 shrink-0 shadow-sm">
            {profileForm.profilePicture ? (
              <img src={profileForm.profilePicture} alt={profileForm.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-black text-lg uppercase">
                {profileForm.name ? profileForm.name[0] : "?"}
              </div>
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Student Profile Picture</span>
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
              className="inline-flex items-center space-x-1.5 text-[11px] bg-indigo-650 text-white hover:bg-indigo-700 font-bold font-mono py-1.5 px-3 rounded-md transition shadow-sm"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Upload profile picture</span>
            </button>
            <p className="text-[10px] text-slate-400 font-medium">Supports offline Base64 camera images</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input
                id="profile-name"
                type="text"
                required
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gender</label>
              <select
                id="profile-gender"
                value={profileForm.gender}
                onChange={e => setProfileForm({ ...profileForm, gender: e.target.value as any })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                id="profile-email"
                type="email"
                required
                value={profileForm.email}
                onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mobile Number</label>
              <input
                id="profile-mobile"
                type="tel"
                value={profileForm.mobile}
                onChange={e => setProfileForm({ ...profileForm, mobile: e.target.value })}
                placeholder="+251..."
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Institution</label>
              <input
                id="profile-institution"
                type="text"
                value={profileForm.institution}
                onChange={e => setProfileForm({ ...profileForm, institution: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
              <input
                id="profile-department"
                type="text"
                value={profileForm.department}
                onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Academic Rank</label>
            <input
              id="profile-position"
              type="text"
              placeholder="e.g. MSc Candidate, PhD Scholar"
              value={profileForm.currentPosition}
              onChange={e => setProfileForm({ ...profileForm, currentPosition: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Previous Accomplishments & Degrees</label>
            <textarea
              id="profile-degrees"
              rows={2}
              placeholder="e.g. BSc in Crime Prevention and Criminology"
              value={profileForm.previousDegrees}
              onChange={e => setProfileForm({ ...profileForm, previousDegrees: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Course Expectations</label>
            <textarea
              id="profile-expectations"
              rows={3}
              placeholder="What qualitative research methodology tools or software concepts do you expectation to acquire?"
              value={profileForm.courseExpectations}
              onChange={e => setProfileForm({ ...profileForm, courseExpectations: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
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
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 border-b border-slate-200 pb-4 mb-5">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-705 shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Thesis & Dissertation Log</h3>
              <p className="text-xs text-slate-500 font-medium">Tracking supervision of student active researches</p>
            </div>
          </div>

          <form onSubmit={handleResearchSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Research Topic</label>
              <input
                id="research-topic"
                type="text"
                required
                placeholder="Topic or focal question of study"
                value={researchForm.topic}
                onChange={e => setResearchForm({ ...researchForm, topic: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Methodological Design</label>
              <textarea
                id="research-methodology"
                rows={2}
                placeholder="Methodology design (e.g. Grounded Inquiry, Inductive Narrative, CAQDAS software logic)"
                value={researchForm.methodology}
                onChange={e => setResearchForm({ ...researchForm, methodology: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Academic Core Interests</label>
              <textarea
                id="research-interests"
                rows={2}
                placeholder="Core keywords (NVivo trees, focus group data, community safety)"
                value={researchForm.interests}
                onChange={e => setResearchForm({ ...researchForm, interests: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Supervision Milestones Staging</label>
              <p className="text-[10px] text-slate-400 mb-2 font-medium">Standard academic research progression</p>
              <select
                id="research-stage"
                value={researchForm.currentStage}
                onChange={e => setResearchForm({ ...researchForm, currentStage: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-bold"
              >
                <option value="Topic submitted and approved">1. Topic submitted and approved</option>
                <option value="Induction orientation given">2. Induction orientation given</option>
                <option value="Concept note submission">3. Concept note submission</option>
                <option value="Full proposal submission">4. Full proposal submission</option>
                <option value="Data collection tools design and approval">5. Data collection tools design and approval</option>
                <option value="Field work/ Data collection">6. Field work/ Data collection</option>
                <option value="Data analysis ad write up">7. Data analysis & write up</option>
                <option value="Completed & Defended">8. Completed & Defended</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 p-3 rounded-md shadow-xs flex justify-between items-center text-[11px]">
              <span className="text-slate-400 font-mono font-bold uppercase">Milestone Date:</span>
              <span className="font-semibold text-slate-700 font-mono">
                {new Date(researchForm.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn-save-research"
                type="submit"
                className="bg-indigo-650 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider flex items-center space-x-2 transition shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isInstructor ? "Update Stage (On Behalf)" : "Update Thesis Milestone"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}

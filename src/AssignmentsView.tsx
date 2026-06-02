/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Assignment, Submission } from "../types";
import { dbService } from "../lib/db";
import { Upload, BookOpen, Clock, FileText, CheckCircle, Save, Check, Link, ChevronRight } from "lucide-react";

interface AssignmentsProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function AssignmentsView({ isInstructor, currentStudent }: AssignmentsProps) {
  const assignments = dbService.getAssignments();
  const submissions = dbService.getSubmissions();
  const students = dbService.getStudents();

  // Selected assignment for viewing or grading
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    assignments.length > 0 ? assignments[0].id : null
  );

  // Instructor creation States
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDue, setNewDue] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Student upload States
  const [submissionText, setSubmissionText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("pdf");
  const [isDragging, setIsDragging] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Instructor grading States
  const [activeGradingSubId, setActiveGradingSubId] = useState<string | null>(null);
  const [numGrade, setNumGrade] = useState<number>(100);
  const [feedbackText, setFeedbackText] = useState("");

  const activeAssignment = assignments.find(a => a.id === selectedAssignmentId);

  // File drag & upload handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processMockFile = (nameList: string, typeSuffix: string, rawContent: string) => {
    if (!selectedAssignmentId) return;
    const subId = `sub_${selectedAssignmentId}_${currentStudent.id}`;
    
    // check if it is a resubmission
    const existingSub = submissions.find(s => s.id === subId);

    const newSubmission: Submission = {
      id: subId,
      assignmentId: selectedAssignmentId,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      fileName: nameList || "homework_submission.pdf",
      fileType: typeSuffix || "pdf",
      fileContent: btoa(rawContent || "student submitted homework document"),
      submittedAt: new Date().toISOString(),
      resubmitted: !!existingSub
    };

    dbService.submitAssignment(newSubmission);
    setSuccessMsg(`Homework successfully submitted (${newSubmission.fileName})`);
    setTimeout(() => setSuccessMsg(null), 4000);
    // clear input
    setFileName("");
    setSubmissionText("");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      const suffix = file.name.split(".").pop() || "pdf";
      setFileType(suffix);
      setSubmissionText(`Dropped file: ${file.name} - ${file.size} bytes`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      const suffix = file.name.split(".").pop() || "pdf";
      setFileType(suffix);
      setSubmissionText(`Selected file: ${file.name} - ${file.size} bytes`);
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFile = fileName || `submission_${selectedAssignmentId}.pdf`;
    processMockFile(finalFile, fileType, submissionText || "No supplementary comment text provided.");
  };

  // Instructor creation handler
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = `assign_${Date.now()}`;
    const item: Assignment = {
      id: cleanId,
      title: newTitle,
      description: newDesc,
      dueDate: newDue,
      createdAt: new Date().toISOString()
    };
    dbService.addAssignment(item);
    setSelectedAssignmentId(cleanId);
    
    // Reset forms
    setNewTitle("");
    setNewDesc("");
    setNewDue("");
    setIsCreating(false);
  };

  // Instructor grading handler
  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGradingSubId) return;
    dbService.gradeSubmission(activeGradingSubId, numGrade, feedbackText);
    setActiveGradingSubId(null);
    setFeedbackText("");
    
    setSuccessMsg("Submitted grading score & report card feedback");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6" id="assignments-manager-view">
      
      {/* Toast Alert */}
      {successMsg && (
        <div className="bg-slate-900 text-white rounded-md px-4 py-3 text-sm flex items-center justify-between shadow-md">
          <span>{successMsg}</span>
          <button className="text-slate-400 hover:text-white text-xs border border-slate-700 rounded-sm px-1.5 py-0.5" onClick={() => setSuccessMsg(null)}>OK</button>
        </div>
      )}

      {/* Roster assignments grid and selection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Assignment Directory Tracker */}
        <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Assignments</h3>
              <p className="text-[10px] text-slate-500 font-mono">Select lecture criteria to view</p>
            </div>
            {isInstructor && !isCreating && (
              <button
                id="btn-trigger-assignment-create"
                onClick={() => setIsCreating(true)}
                className="bg-indigo-600 text-white text-[10px] hover:bg-indigo-700 font-semibold uppercase px-2 py-1 rounded-sm tracking-widest shadow-xs transition"
              >
                + Create
              </button>
            )}
          </div>

          {/* Creation modal interface in the sidebar */}
          {isCreating ? (
            <form onSubmit={handleCreateAssignment} className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 shadow-md">
              <h4 className="text-xs font-bold text-slate-900 uppercase">New Assignment Form</h4>
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Title</label>
                <input
                  id="assignment-title"
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Criteria/Instructions</label>
                <textarea
                  id="assignment-criteria"
                  rows={3}
                  required
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Due Date</label>
                <input
                  id="assignment-due"
                  type="datetime-local"
                  required
                  value={newDue}
                  onChange={e => setNewDue(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div className="flex justify-end gap-1.5 pt-2">
                <button
                  id="btn-cancel-assignment-create"
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="border border-slate-200 text-slate-750 text-[10px] font-bold uppercase px-3 py-1.5 rounded-md transition hover:bg-slate-55"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-assignment"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold uppercase px-3 py-1.5 rounded-md transition shadow-xs"
                >
                  Publish
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              {assignments.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">No assignments published yet.</p>
              ) : (
                assignments.map(a => {
                  const subCount = submissions.filter(s => s.assignmentId === a.id).length;
                  const isSelected = selectedAssignmentId === a.id;
                  return (
                    <button
                      id={`btn-select-assignment-${a.id}`}
                      key={a.id}
                      onClick={() => {
                        setSelectedAssignmentId(a.id);
                        setActiveGradingSubId(null);
                      }}
                      className={`w-full text-left p-3.5 border rounded-xl transition-all text-sm flex items-start justify-between ${
                        isSelected 
                          ? "bg-indigo-50/50 border-indigo-600 ring-1 ring-indigo-600" 
                          : "bg-white border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 leading-tight">{a.title}</p>
                        <div className="flex items-center text-[10px] text-slate-500 font-mono gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-105 text-slate-650 px-1.5 py-0.5 rounded-md shrink-0">
                        {isInstructor ? `${subCount}/${students.length} filed` : submissions.some(sub => sub.assignmentId === a.id && sub.studentId === currentStudent.id) ? "Filed" : "Pending"}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right Side: Active Assignment details or Grading logs */}
        <div className="lg:col-span-8 space-y-6">
          {activeAssignment ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              
              {/* Context header */}
              <div className="border-b border-slate-100 pb-4 mb-5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Assignment Descriptor</span>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1">{activeAssignment.title}</h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">{activeAssignment.description}</p>
                <div className="flex items-center space-x-3 text-xs font-mono text-slate-500 pt-3.5">
                  <span>Created: {new Date(activeAssignment.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className="underline decoration-slate-300">Due Limit: {new Date(activeAssignment.dueDate).toLocaleString()}</span>
                </div>
              </div>

              {/* Action layout based on user role */}
              {isInstructor ? (
                /* ================= INSTRUCTOR GRADING ROSTER ================= */
                <div className="space-y-5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Student Submissions Dossier</h3>
                  
                  {/* Grading Panel popup */}
                  {activeGradingSubId && (() => {
                    const activeSub = submissions.find(s => s.id === activeGradingSubId);
                    if (!activeSub) return null;
                    return (
                      <form onSubmit={handleGradeSubmit} className="bg-slate-50 border border-slate-350 p-5 rounded-xl space-y-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase">Grading: {activeSub.studentName}</h4>
                          <button type="button" onClick={() => setActiveGradingSubId(null)} className="text-xs font-bold text-slate-500 hover:text-slate-900 font-mono">✕ Close</button>
                        </div>

                        <div className="text-xs font-mono text-slate-650 bg-white border border-slate-200 p-3 rounded-md max-h-40 overflow-y-auto whitespace-pre-line">
                          <strong className="text-slate-900 font-sans block mb-1">Submitted Attachments content:</strong>
                          {atob(activeSub.fileContent)}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                          <div>
                            <label className="block text-[10px] text-slate-600 font-mono uppercase mb-2">Numeric Mark (0-100)</label>
                            <input
                              id="input-mark"
                              type="number"
                              min={0}
                              max={100}
                              required
                              value={numGrade}
                              onChange={e => setNumGrade(parseInt(e.target.value) || 0)}
                              className="w-full text-sm font-mono border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-600 font-mono uppercase mb-2">Feedback & Comments</label>
                            <input
                              id="input-grade-feedback"
                              type="text"
                              required
                              placeholder="Key recommendations, observations..."
                              value={feedbackText}
                              onChange={e => setFeedbackText(e.target.value)}
                              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1.5">
                          <button
                            id="btn-submit-grades"
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-md transition shadow-xs"
                          >
                            Set Grade
                          </button>
                        </div>
                      </form>
                    );
                  })()}

                  {/* List of submissions */}
                  <div className="space-y-3">
                    {students.map(s => {
                      const sub = submissions.find(subItem => subItem.assignmentId === activeAssignment.id && subItem.studentId === s.id);
                      return (
                        <div key={s.id} className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/50 gap-4 transition-colors duration-150">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-950 font-sans">{s.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">Department: {s.department}</p>
                            {sub ? (
                              <div className="pt-1.5 flex flex-wrap gap-2 text-[10px] font-mono">
                                <span className="bg-slate-100 px-2 py-0.5 rounded-sm flex items-center space-x-1 border border-slate-200">
                                  <FileText className="h-2.5 w-2.5" />
                                  <span>{sub.fileName}</span>
                                </span>
                                <span className="text-slate-550 py-0.5">Filed: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                                {sub.resubmitted && <span className="text-indigo-700 bg-indigo-50 font-bold px-1 rounded-sm">Resubmitted</span>}
                              </div>
                            ) : (
                              <p className="text-[10px] italic text-rose-500 pt-1">No homework submitted yet</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            {sub ? (
                              <div className="flex items-center space-x-3">
                                {sub.grade !== undefined ? (
                                  <div className="text-right">
                                    <div className="text-sm font-bold font-mono text-slate-905">Mark: {sub.grade}/100</div>
                                    <div className="text-[10px] text-slate-500 font-sans italic truncate max-w-[150px]">{sub.comments}</div>
                                  </div>
                                ) : (
                                  <span className="text-xs font-serif italic text-amber-700 font-mono">Unmarked</span>
                                )}
                                <button
                                  id={`btn-grade-${sub.id}`}
                                  onClick={() => {
                                    setActiveGradingSubId(sub.id);
                                    setNumGrade(sub.grade || 100);
                                    setFeedbackText(sub.comments || "");
                                  }}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-md transition shadow-xs"
                                >
                                  {sub.grade !== undefined ? "Edit Grade" : "Verify & Grade"}
                                </button>
                              </div>
                            ) : (
                              <button disabled className="opacity-40 bg-slate-100 border border-slate-200 text-slate-400 font-semibold text-[10px] uppercase px-3 py-1.5 rounded-md cursor-not-allowed">
                                Idle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ================= STUDENT WORKPLACE SUBMISSIONS ================= */
                <div className="space-y-6">
                  {(() => {
                    const subId = `sub_${activeAssignment.id}_${currentStudent.id}`;
                    const existingSub = submissions.find(s => s.id === subId);

                    return (
                      <div className="space-y-6">
                        
                        {/* Grade result review */}
                        {existingSub && existingSub.grade !== undefined && (
                          <div className="bg-emerald-50 border border-emerald-250 p-5 rounded-xl flex items-start space-x-3.5 shadow-xs">
                            <CheckCircle className="h-6 w-6 text-emerald-800 shrink-0" />
                            <div>
                              <h4 className="text-sm font-bold text-emerald-905 uppercase tracking-wide">Graded & Completed</h4>
                              <p className="text-2xl font-bold font-mono text-emerald-950 mt-1">{existingSub.grade} / 100 Points</p>
                              {existingSub.comments && (
                                <p className="text-xs text-emerald-800 italic mt-2 font-sans">
                                  <strong>Instructor comments:</strong> "{existingSub.comments}"
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {existingSub && existingSub.grade === undefined && (
                          <div className="bg-slate-50 border border-slate-205 p-4 rounded-xl text-xs flex items-center space-x-2 text-slate-650">
                            <Clock className="h-5 w-5 text-slate-500" />
                            <span>Submitted successfully on {new Date(existingSub.submittedAt).toLocaleDateString()}. Waiting for lecture evaluations.</span>
                          </div>
                        )}

                        {/* Submission input form */}
                        <form onSubmit={handleStudentSubmit} className="space-y-4">
                          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">
                            {existingSub ? "Homework Resubmission Portal" : "Submit Homework Assignment"}
                          </h3>

                          {/* PWA Drag-and-drop or select file box */}
                          <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${isDragging ? "bg-indigo-50/50 border-indigo-600" : "border-slate-300 hover:bg-slate-50"}`}
                          >
                            <input
                              id="assignment-file-input"
                              type="file"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                            <label htmlFor="assignment-file-input" className="cursor-pointer space-y-2 block">
                              <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                              <div className="text-xs text-slate-600">
                                <span className="font-bold underline text-indigo-600">Click here to select</span> or drag-and-drop course documents (PDF, DOCX, PPTX)
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono">Ethio bandwidth friendly payload compress validation enabled</p>
                            </label>
                          </div>

                          {fileName && (
                            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center justify-between text-xs font-mono">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-slate-500" />
                                <span className="font-bold text-slate-800">{fileName}</span>
                              </div>
                              <button type="button" onClick={() => setFileName("")} className="text-rose-600 hover:underline">Clear</button>
                            </div>
                          )}

                          {/* Answers supplement textarea */}
                          <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Supplement Explanations / Written Answers</label>
                            <textarea
                              id="homework-supplement-text"
                              required
                              rows={5}
                              placeholder="Complete your assignment details or write short study supplement annotations here..."
                              value={submissionText}
                              onChange={e => setSubmissionText(e.target.value)}
                              className="w-full text-sm font-mono border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                            />
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              id="btn-upload-file-submission"
                              type="submit"
                              className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md font-medium text-xs flex items-center space-x-2 transition shadow-sm font-semibold"
                            >
                              <Check className="h-4 w-4" />
                              <span>{existingSub ? "Send Resubmission" : "Submit Assignment"}</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-3xs">
              <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium">Select an assignment to view its logs or file submissions</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

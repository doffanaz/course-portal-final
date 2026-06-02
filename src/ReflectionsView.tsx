/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Reflection } from "../types";
import { dbService } from "../lib/db";
import { BookOpen, Calendar, HelpCircle, Save, CheckCircle, Award } from "lucide-react";

interface ReflectionsProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function ReflectionsView({ isInstructor, currentStudent }: ReflectionsProps) {
  const [reflections, setReflections] = useState<Reflection[]>(dbService.getReflections());
  
  // Student entry state
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [journalText, setJournalText] = useState("");
  
  // Instructor feedback inline state
  const [activeRefId, setActiveRefId] = useState<string | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const syncList = () => {
    setReflections(dbService.getReflections());
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalText.trim()) return;

    const id = `ref_${Date.now()}`;
    const newRef: Reflection = {
      id,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      date: sessionDate,
      content: journalText,
      createdAt: new Date().toISOString()
    };

    dbService.submitReflection(newRef);
    setJournalText("");
    syncList();
    triggerToast("Post-class reflection saved to local journal");
  };

  const handleFeedbackSubmit = (e: React.FormEvent, refId: string) => {
    e.preventDefault();
    if (!feedbackInput.trim()) return;

    dbService.addReflectionFeedback(refId, feedbackInput);
    setActiveRefId(null);
    setFeedbackInput("");
    syncList();
    triggerToast("Saved feedback & mentorship notes");
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const activeReflections = isInstructor 
    ? reflections 
    : reflections.filter(r => r.studentId === currentStudent.id);

  return (
    <div className="space-y-6" id="reflection-journal-view">
      
      {/* Toast Alert */}
      {toast && (
        <div className="bg-slate-900 text-white rounded-md px-4 py-2.5 text-xs flex justify-between shadow-md">
          <span>{toast}</span>
        </div>
      )}

      <div className="border-b border-slate-200 pb-4 mb-5">
        <h2 className="text-lg font-bold text-slate-900 font-sans">Post-Class Reflection Journal</h2>
        <p className="text-xs text-slate-500 font-medium">Students submit critical reflections after lectures, enabling instructors to monitor comprehension levels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create action (only for students) */}
        {!isInstructor && (
          <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 h-fit shadow-sm">
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4">
              <BookOpen className="h-5 w-5 text-slate-600" />
              <h3 className="text-xs font-bold text-slate-904 uppercase tracking-wider">New Journal Entry</h3>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-mono uppercase mb-1">Session Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    id="reflection-date"
                    type="date"
                    required
                    value={sessionDate}
                    onChange={e => setSessionDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md pl-10 pr-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-550 font-mono uppercase mb-1">Critical Reflections</label>
                <p className="text-[10px] text-slate-400 mb-2">What concepts did you master today? What gaps did you observe?</p>
                <textarea
                  id="reflection-content"
                  required
                  rows={6}
                  placeholder="Analyze today's lecture themes, lab struggles, or research insights..."
                  value={journalText}
                  onChange={e => setJournalText(e.target.value)}
                  className="w-full text-xs font-mono border border-slate-200 rounded-md px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <button
                id="btn-submit-journal-entry"
                type="submit"
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 py-2.5 rounded-md font-medium text-xs flex items-center justify-center space-x-2 transition shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>Save Entry</span>
              </button>
            </form>
          </div>
        )}

        {/* Right Side: Log timeline display */}
        <div className={`lg:col-span-${isInstructor ? 12 : 8} space-y-4`}>
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Journal Entries Log</h3>
          
          {activeReflections.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-450 text-xs italic">
              No journal logs returned yet. Complete your first post-class reflection form.
            </div>
          ) : (
            activeReflections.slice().reverse().map(ref => (
              <div key={ref.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 hover:border-slate-300 transition shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-sans">{ref.studentName}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">Date of lecture: {ref.date}</span>
                  </div>
                  <span className="text-[9px] font-mono bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full uppercase border border-slate-200">
                    Filed: {new Date(ref.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-line bg-slate-50/50 p-3 rounded-md border border-slate-100">{ref.content}</p>

                {/* Mentorship feedback displays */}
                {ref.feedback ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-md text-xs space-y-1">
                    <p className="font-bold flex items-center gap-1.5 font-sans uppercase tracking-[0.05em] text-[10px] text-emerald-800">
                      <Award className="h-3.5 w-3.5" /> Mentor Feedback
                    </p>
                    <p className="italic font-sans text-emerald-800">"{ref.feedback}"</p>
                  </div>
                ) : (
                  <div>
                    {!isInstructor ? (
                      <p className="text-[10px] italic text-slate-400">Waiting for lecture reviews...</p>
                    ) : (
                      <div className="pt-2">
                        {activeRefId === ref.id ? (
                           <form onSubmit={(e) => handleFeedbackSubmit(e, ref.id)} className="space-y-3">
                            <input
                              id={`feedback-input-${ref.id}`}
                              type="text"
                              required
                              placeholder="Write direct mentoring review notes..."
                              value={feedbackInput}
                              onChange={e => setFeedbackInput(e.target.value)}
                              className="w-full text-xs border border-slate-350 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-indigo-600"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                id={`btn-cancel-feedback-${ref.id}`}
                                type="button" 
                                onClick={() => { setActiveRefId(null); setFeedbackInput(""); }}
                                className="border border-slate-200 text-slate-600 text-[10px] px-2.5 py-1 rounded-sm"
                              >
                                Cancel
                              </button>
                              <button
                                id={`btn-save-feedback-${ref.id}`}
                                type="submit" 
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-3 py-1.5 rounded-sm font-semibold transition"
                              >
                                Save Feedback
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            id={`btn-trigger-feedback-${ref.id}`}
                            onClick={() => {
                              setActiveRefId(ref.id);
                              setFeedbackInput("");
                            }}
                            className="text-[10px] font-semibold uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md transition shadow-sm"
                          >
                            Add Mentorship Feedback
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}

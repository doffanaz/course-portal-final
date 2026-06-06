/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Student, Question, FeedbackTemplate, AnonymousFeedback, AutomatedBackup } from "../types";
import { dbService } from "../lib/db";
import { 
  CheckCircle2, Plus, Save, Download, RefreshCw, BarChart3, HelpCircle, 
  Trash2, ChevronRight, MessageSquare, ShieldAlert, Archive, FileSpreadsheet
} from "lucide-react";

interface StudentFeedbackProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function StudentFeedbackView({ isInstructor, currentStudent }: StudentFeedbackProps) {
  // Database lists
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [feedbacks, setFeedbacks] = useState<AnonymousFeedback[]>([]);
  const [backups, setBackups] = useState<AutomatedBackup[]>([]);

  // Selected template context
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("mid_sem_default");
  
  // Custom template form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [customQuestions, setCustomQuestions] = useState<Question[]>([]);
  
  // Custom question builder
  const [currentLabel, setCurrentLabel] = useState("");
  const [currentType, setCurrentType] = useState<"likert" | "mcq" | "open">("likert");
  const [currentOptions, setCurrentOptions] = useState("");

  // Student form submission state
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [hasSubmittedThisSession, setHasSubmittedThisSession] = useState<Record<string, boolean>>({});

  // UI state managers
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync / pull database state
  useEffect(() => {
    refreshDatabase();
    
    // Listen for database changes
    const unsubscribe = dbService.registerStatusListener(() => {
      refreshDatabase();
    });
    return () => unsubscribe();
  }, []);

  const refreshDatabase = () => {
    setTemplates(dbService.getFeedbackTemplates());
    setFeedbacks(dbService.getAnonymousFeedback());
    setBackups(dbService.getAutomatedBackups());
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Add a built question to custom list
  const handleAddQuestionToBuilder = () => {
    if (!currentLabel.trim()) return;

    let parsedOptions: string[] | undefined = undefined;
    if (currentType === "mcq") {
      parsedOptions = currentOptions
        .split(",")
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);
      if (!parsedOptions.length) {
        alert("Please provide at least one comma-separated option for MULTIPLE CHOICE.");
        return;
      }
    } else if (currentType === "likert") {
      parsedOptions = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];
    }

    const newQ: Question = {
      id: "q_" + Math.random().toString(36).substring(2, 9),
      type: currentType,
      label: currentLabel.trim(),
      options: parsedOptions
    };

    setCustomQuestions(prev => [...prev, newQ]);
    setCurrentLabel("");
    setCurrentOptions("");
  };

  const handleRemoveQuestionFromBuilder = (idx: number) => {
    setCustomQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // Save the custom mid-semester survey template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Please provide a template title");
      return;
    }
    if (customQuestions.length === 0) {
      alert("Please add at least one question to the template!");
      return;
    }

    const newTemplate: FeedbackTemplate = {
      id: "temp_" + Math.random().toString(36).substring(2, 9),
      title: newTitle.trim(),
      description: newDesc.trim() || "Custom mid-semester survey template for student suggestions.",
      questions: customQuestions,
      createdAt: new Date().toISOString(),
      isCustom: true
    };

    dbService.addFeedbackTemplate(newTemplate);
    triggerToast(`Custom survey template "${newTitle}" created successfully! Automated state backup completed.`);
    
    // Clear forms
    setNewTitle("");
    setNewDesc("");
    setCustomQuestions([]);
    setIsCreatingTemplate(false);
    setSelectedTemplateId(newTemplate.id);
  };

  // Submit anonymous constructive feedback
  const handleSelectAnswer = (qId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!activeTemplate) return;

    // Check unanswered
    const unanswered = activeTemplate.questions.filter(q => answers[q.id] === undefined || answers[q.id] === "");
    if (unanswered.length > 0) {
      alert("Please answer all constructive feedback questions before submitting anonymously.");
      return;
    }

    const feedbackId = "anon_" + Math.random().toString(36).substring(2, 9);
    const newSubmission: AnonymousFeedback = {
      id: feedbackId,
      templateId: selectedTemplateId,
      answers,
      submittedAt: new Date().toISOString()
    };

    dbService.addAnonymousFeedback(newSubmission);
    setAnswers({});
    setHasSubmittedThisSession(prev => ({ ...prev, [selectedTemplateId]: true }));
    triggerToast("Your constructive feedback was submitted anonymously! Automated state backup compiled.");
  };

  // Manual Trigger Backup
  const handleTriggerManualBackup = () => {
    dbService.triggerAutomatedBackup("Manual instructor backup checkout");
    triggerToast("System state snapshot generated! Automated backup complete.");
  };

  // Restore automated backup data state
  const handleRestoreBackup = (b: AutomatedBackup) => {
    if (window.confirm(`Are you sure you want to restore the data state from backup generated at ${new Date(b.timestamp).toLocaleTimeString()}?\nCaution: This replaces all your client database lists with records containing ${b.recordCounts.students || 0} students, ${b.recordCounts.anonymous_feedback || 0} feedbacks.`)) {
      const success = dbService.importBackup(b.jsonData);
      if (success) {
        triggerToast("Restore Complete! Local database state synchronized successfully.");
        refreshDatabase();
      } else {
        alert("Failed to restore backup format.");
      }
    }
  };

  // Exclude current templates from statistics
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];
  const templateFeedbacks = feedbacks.filter(f => f.templateId === (activeTemplate?.id || ""));

  // Calculate quantitative results for MCQs / Likerts
  const getQuestionResults = (q: Question) => {
    const relevantFeedbacks = templateFeedbacks;
    const totalCount = relevantFeedbacks.length;

    if (q.type === "open") {
      return {
        responses: relevantFeedbacks
          .map(f => f.answers[q.id] as string)
          .filter(text => !!text && text.trim().length > 0)
      };
    }

    const options = q.options || [];
    const counts: Record<string, number> = {};
    options.forEach(opt => { counts[opt] = 0; });

    relevantFeedbacks.forEach(f => {
      const ans = f.answers[q.id];
      if (ans !== undefined && counts[String(ans)] !== undefined) {
        counts[String(ans)]++;
      }
    });

    const frequency = options.map(opt => {
      const count = counts[opt] || 0;
      const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return { label: opt, count, pct };
    });

    return { totalCount, frequency };
  };

  return (
    <div className="space-y-6" id="student-feedback-view">
      
      {/* Dynamic Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-750 text-white rounded-xl px-4 py-3 shadow-lg flex items-center space-x-2.5 animate-bounce-subtle pointer-events-auto">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium font-sans">{toastMessage}</span>
        </div>
      )}

      {/* Header View Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-extrabold flex items-center space-x-1">
            <MessageSquare className="h-3 w-3" />
            <span>Constructive Collaboration</span>
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-sans mt-0.5">Student Feedback & Evaluations</h2>
          <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">Anonymous surveys & automated course feedback metrics</p>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          {isInstructor && (
            <>
              <button
                id="btn-trigger-manual-backup"
                onClick={handleTriggerManualBackup}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-705 dark:text-slate-150 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-3xs"
                title="Create a full database backup state"
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Backup State</span>
              </button>

              <button
                id="btn-toggle-create-template"
                onClick={() => setIsCreatingTemplate(!isCreatingTemplate)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-3xs ${isCreatingTemplate ? "bg-amber-500 hover:bg-amber-600 text-zinc-950" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
              >
                {isCreatingTemplate ? (
                  <>
                    <span>✕ Cancel Builder</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Template</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* INSTRUCTOR: Survey Template Builder */}
      {isInstructor && isCreatingTemplate && (
        <form onSubmit={handleSaveTemplate} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-6 rounded-xl space-y-5 shadow-3xs relative animate-fade-in" id="template-creation-panel">
          
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase flex items-center space-x-2">
              <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] px-2.5 py-1 rounded">BUILDER</span>
              <span>Mid-Semester Assessment Survey Templates</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-1 leading-normal font-medium">
              Formulate Likert scales, MCQs, or qualitative questionnaire inputs to solicit constructive remarks from the students anon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Survey Title</label>
              <input
                id="template-title"
                type="text"
                required
                placeholder="e.g. Mid-Term Constructive Assessment Form"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-850 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Description</label>
              <input
                id="template-desc"
                type="text"
                placeholder="e.g. Rate your understanding of theoretical qualitative designs"
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-850 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Current Question list in active template */}
          <div className="bg-white dark:bg-slate-920 border border-slate-200 dark:border-slate-850 rounded-xl p-4 space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
              Active Template Questions ({customQuestions.length})
            </h4>
            
            {customQuestions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No questions added yet. Use the question generator below to append queries.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {customQuestions.map((q, idx) => (
                  <div key={q.id} className="py-2 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                        Q{idx+1} ({q.type})
                      </span>
                      <span className="text-slate-800 dark:text-slate-150 truncate max-w-md">{q.label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestionFromBuilder(idx)}
                      className="text-rose-600 hover:text-rose-700 font-bold p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded cursor-pointer transition text-[11px]"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Question Generator Section */}
          <div className="bg-white dark:bg-slate-920 border border-slate-200 dark:border-slate-850 rounded-xl p-5 space-y-4">
            <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider block">
              + Question Generator
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-1">
                <label className="block text-[9px] font-mono text-slate-400 uppercase font-black">Question Label / Prompt</label>
                <input
                  type="text"
                  placeholder="e.g. Is Dr. Zerihun's qualitative research feedback clear?"
                  value={currentLabel}
                  onChange={e => setCurrentLabel(e.target.value)}
                  className="w-full text-xs font-bold border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3 space-y-1">
                <label className="block text-[9px] font-mono text-slate-400 uppercase font-black">Evaluation Shape</label>
                <select
                  value={currentType}
                  onChange={e => setCurrentType(e.target.value as any)}
                  className="w-full text-xs font-bold border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="likert">Likert (1 to 5 stars range)</option>
                  <option value="mcq">MCQ (Multiple Choice Options)</option>
                  <option value="open">Open-Ended (Qualitative Essay)</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="button"
                  onClick={handleAddQuestionToBuilder}
                  className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer shadow-3xs"
                >
                  Append Query
                </button>
              </div>
            </div>

            {currentType === "mcq" && (
              <div className="pt-2 animate-fade-in space-y-1">
                <label className="block text-[9px] font-mono text-slate-400 uppercase font-black">
                  Multiple Choice Options (Comma Separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Clear & Actionable, Vague, Slow Turnaround, No Remarks"
                  value={currentOptions}
                  onChange={e => setCurrentOptions(e.target.value)}
                  className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-600"
                />
                <span className="text-[10px] text-slate-400 italic block">Separate choices clearly with a comma (e.g., choice A, choice B).</span>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-250 dark:border-slate-800">
            <button
              type="submit"
              className="bg-indigo-650 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-md transition"
            >
              <Save className="h-4 w-4" />
              <span>Save & Publish Templates</span>
            </button>
          </div>
        </form>
      )}

      {/* Main feedback view split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT NAV/LIST PANEL */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-xl p-4.5 space-y-3.5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 dark:text-slate-500 font-extrabold block">
              Survey Contexts ({templates.length})
            </span>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {templates.map(t => {
                const isActive = t.id === selectedTemplateId;
                const rCount = feedbacks.filter(f => f.templateId === t.id).length;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      setAnswers({});
                    }}
                    className={`w-full text-left p-3 rounded-lg border text-xs flex flex-col justify-between cursor-pointer transition ${isActive ? "bg-white dark:bg-slate-950 border-indigo-600 dark:border-indigo-400 text-slate-900 dark:text-white font-bold shadow-4xs" : "bg-transparent border-slate-200/55 dark:border-slate-800 text-slate-650 dark:text-slate-350 hover:bg-white/40 dark:hover:bg-slate-950/20"}`}
                  >
                    <div className="truncate font-bold text-slate-900 dark:text-white">{t.title}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono font-medium">
                      <span>{t.questions.length} queries</span>
                      <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-sans shrink-0 font-bold">
                        {rCount} Anon responses
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* INSTRUCTOR: Automated Snapshot Backups Monitor */}
          {isInstructor && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4.5 space-y-3 shadow-md text-slate-400 text-[11px] leading-relaxed">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="font-extrabold text-indigo-400 uppercase tracking-wider text-[9px] font-mono flex items-center space-x-1.5">
                  <Archive className="h-3.5 w-3.5 text-indigo-505 shrink-0" />
                  <span>Automated Snapshot Backups</span>
                </span>
                <span className="text-[8px] bg-indigo-950/50 text-indigo-300 font-mono inline-block px-1.5 py-0.5 rounded border border-indigo-800/30">Active</span>
              </div>
              
              <p className="text-slate-450 leading-normal text-[11px] font-sans">
                Every constructive feedback receipt or template alteration triggers an automated cache snapshot. Revert local states effortlessly below in case of file operations.
              </p>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {backups.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2 text-center">No automated cache checkpoints compiled yet.</p>
                ) : (
                  backups.map(b => (
                    <div key={b.id} className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg flex items-center justify-between gap-1 transition">
                      <div className="overflow-hidden">
                        <span className="text-[9px] text-slate-300 font-bold truncate block">{b.triggerEvent}</span>
                        <span className="text-[8px] text-slate-500 font-mono tracking-wide block">{new Date(b.timestamp).toLocaleTimeString()} ({Math.round(b.dataSize / 1024 * 10) / 10}KB)</span>
                      </div>
                      <button
                        onClick={() => handleRestoreBackup(b)}
                        className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950 hover:bg-indigo-900 px-2 py-1 rounded cursor-pointer shrink-0 border border-indigo-900/40"
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT INTERACTIVE WORKSPACE */}
        <div className="lg:col-span-8">
          
          {/* INSTRUCTOR: Evaluation Analysis Dashboard */}
          {isInstructor ? (
            <div className="space-y-6" id="feedback-analytics-dash">
              {activeTemplate ? (
                <>
                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-3xs">
                    <div>
                      <span className="bg-emerald-100 dark:bg-emerald-950/45 text-emerald-700 dark:text-emerald-300 border border-emerald-200/30 text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full select-none font-sans">
                        ANONYMOUS REVIEWS
                      </span>
                      <h3 className="text-md font-extrabold text-slate-900 dark:text-white mt-1.5">{activeTemplate.title} results</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 mt-1 font-medium">{activeTemplate.description}</p>
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg py-1.5 px-3 flex items-center space-x-2 shadow-3xs shrink-0 text-xs font-semibold">
                      <BarChart3 className="h-4 w-4 text-indigo-500" />
                      <span>{templateFeedbacks.length} filings recorded</span>
                    </div>
                  </div>

                  {/* Quantitative & Verbatim suggestions loop */}
                  <div className="space-y-6">
                    {activeTemplate.questions.map((q, idx) => {
                      const results = getQuestionResults(q);
                      return (
                        <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl p-6 shadow-sm">
                          
                          {/* Query Header */}
                          <div className="flex items-start space-x-2.5 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                            <HelpCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 uppercase font-black">Query {idx + 1} ({q.type})</span>
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 font-sans mt-0.5">{q.label}</p>
                            </div>
                          </div>

                          {q.type === "open" ? (
                            /* Verbatim list for Open-Ended constructive suggestions */
                            <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                              {!(results as any).responses || (results as any).responses.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No student suggestions logged anonymously for this query yet.</p>
                              ) : (
                                (results as any).responses.map((txt: string, sIdx: number) => (
                                  <div key={sIdx} className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-805 p-3 rounded-lg text-xs leading-normal font-sans shadow-3xs flex items-start gap-2">
                                    <span className="text-indigo-400 font-bold block shrink-0">💬</span>
                                    <p className="text-slate-650 dark:text-slate-300 font-medium italic">"{txt}"</p>
                                  </div>
                                ))
                              )}
                            </div>
                          ) : (
                            /* Frequency Micro-Chart metric bars */
                            <div className="space-y-3.5 font-mono text-xs">
                              {(results as any).frequency && (results as any).frequency.map((item: any, fIdx: number) => (
                                <div key={fIdx} className="space-y-1">
                                  <div className="flex justify-between items-center font-sans">
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-sm truncate">{item.label}</span>
                                    <span className="font-bold text-slate-600 dark:text-slate-400">{item.count} filings ({item.pct}%)</span>
                                  </div>
                                  
                                  {/* Color Progress Bar Indicators */}
                                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 border border-slate-205 dark:border-slate-805 rounded-full overflow-hidden flex shadow-inner">
                                    <div
                                      className="bg-indigo-650 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${item.pct}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-xl text-center space-y-2 italic">
                  <span>Please choose from active survey contexts to review analytics.</span>
                </div>
              )}
            </div>
          ) : (
            
            /* STUDENT: Compliance Anonymous constructive submission */
            <div className="space-y-6" id="student-compliance-form">
              {activeTemplate ? (
                hasSubmittedThisSession[activeTemplate.id] ? (
                  <div className="bg-white dark:bg-slate-900 border border-emerald-400 dark:border-emerald-800 p-8 rounded-xl text-center space-y-4 shadow-sm animate-fade-in">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                    <div>
                      <h3 className="text-md font-bold text-emerald-950 dark:text-slate-100 uppercase tracking-wide">
                        Constructive Submission Logged Successfully
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-405 mt-1 font-medium leading-relaxed max-w-md mx-auto">
                        Thank you for your constructive guidance! This report has been recorded anonymously and securely. All student metadata was discarded, and results have been compiled in Dr. Zerihun's evaluation sheets.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
                    
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-450 font-semibold uppercase tracking-wide">
                        <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                        <span>🔒 Secured Anonymous Compliance Channel</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">{activeTemplate.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-405 font-medium mt-1 leading-normal">{activeTemplate.description}</p>
                    </div>

                    <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                      {activeTemplate.questions.map((q, idx) => (
                        <div key={q.id} className="space-y-3.5 border-b border-slate-100 dark:border-slate-805/40 pb-5">
                          <span className="text-[10px] font-mono text-indigo-650 dark:text-indigo-400 uppercase tracking-widest block font-black">
                            Question {idx + 1}
                          </span>
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{q.label}</p>

                          {q.type === "mcq" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {q.options?.map(opt => (
                                <label key={opt} className={`flex items-center space-x-2.5 p-3 rounded-lg border text-xs cursor-pointer transition ${answers[q.id] === opt ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-600 dark:border-indigo-500 font-bold" : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900"}`}>
                                  <input
                                    type="radio"
                                    name={q.id}
                                    required
                                    checked={answers[q.id] === opt}
                                    onChange={() => handleSelectAnswer(q.id, opt)}
                                    className="h-4 w-4 text-indigo-600 border-slate-350 focus:ring-indigo-500"
                                  />
                                  <span className="text-slate-700 dark:text-slate-300">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.type === "likert" && (
                            <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0 pt-1">
                              {q.options?.map(opt => (
                                <label key={opt} className={`flex-1 flex items-center justify-center space-x-2 p-2.5 rounded-lg border text-xs cursor-pointer transition text-center ${answers[q.id] === opt ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-600 dark:border-indigo-500 font-bold text-indigo-800 dark:text-indigo-300" : "bg-slate-50/50 dark:bg-slate-955/20 border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>
                                  <input
                                    type="radio"
                                    name={q.id}
                                    required
                                    checked={answers[q.id] === opt}
                                    onChange={() => handleSelectAnswer(q.id, opt)}
                                    className="h-4 w-4 text-indigo-500 border-slate-300 focus:ring-indigo-500"
                                  />
                                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {q.type === "open" && (
                            <textarea
                              required
                              rows={5}
                              placeholder="Please share constructive, specific suggestions freely. To protect anonymity, focus purely on course adjustments or material improvement advice..."
                              value={(answers[q.id] as string) || ""}
                              onChange={e => handleSelectAnswer(q.id, e.target.value)}
                              className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600"
                            />
                          )}
                        </div>
                      ))}

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="bg-[#055a64] hover:bg-[#034951] text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2 shadow-md cursor-pointer transition select-none"
                        >
                          <Save className="h-4 w-4" />
                          <span>Dispatch Constructive Evaluation Anon</span>
                        </button>
                      </div>

                    </form>

                  </div>
                )
              ) : (
                <div className="bg-slate-50 dark:bg-slate-955 p-8 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs italic text-slate-400">
                  No active feedback surveys are available. Please ask Dr. Zerihun to publish template evaluations!
                </div>
              )}
            </div>

          )}

        </div>

      </div>

    </div>
  );
}

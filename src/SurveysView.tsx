/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Survey, SurveyResponse } from "../types";
import { dbService } from "../lib/db";
import { Check, BarChart3, Users, HelpCircle, Save } from "lucide-react";

interface SurveysProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function SurveysView({ isInstructor, currentStudent }: SurveysProps) {
  const surveys = dbService.getSurveys();
  const responses = dbService.getSurveyResponses();

  // Selected survey index
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("survey_b");
  
  // Student answers mapping (questionId -> answer string/number)
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const activeSurvey = surveys.find(s => s.id === selectedSurveyId);
  
  // Check if current student has already filled out the selected survey
  const hasSubmitted = responses.some(
    r => r.surveyId === selectedSurveyId && r.studentId === currentStudent.id
  );

  React.useEffect(() => {
    setAnswers({});
  }, [selectedSurveyId]);

  const handleSelectAnswer = (qId: string, value: string | number) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleSurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSurvey) return;

    // Verify all questions are answered
    const unanswered = activeSurvey.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert("Please complete all questions before submitting.");
      return;
    }

    const newResponse: SurveyResponse = {
      id: `res_${selectedSurveyId}_${currentStudent.id}`,
      surveyId: selectedSurveyId,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      answers,
      submittedAt: new Date().toISOString()
    };

    dbService.submitSurveyResponse(newResponse);
    setSuccessToast("Survey response submitted & registered (offline-first sync)");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // --- ANALYTICS ENGINE FOR INSTRUCTOR ---
  const getQuestionAnalytics = (qId: string, qType: "mcq" | "likert" | "open", options?: string[]) => {
    const relevantResponses = responses.filter(r => r.surveyId === selectedSurveyId);
    const totalCount = relevantResponses.length;

    if (qType === "open") {
      // Just list open texts
      return {
        responses: relevantResponses
          .map(r => ({ name: r.studentName, text: r.answers[qId] as string }))
          .filter(item => !!item.text)
      };
    }

    const labels = options || [];
    const counts: Record<string, number> = {};
    labels.forEach(l => { counts[l] = 0; });

    relevantResponses.forEach(r => {
      const val = r.answers[qId];
      if (val !== undefined && counts[String(val)] !== undefined) {
        counts[String(val)]++;
      }
    });

    const frequencyData = labels.map(label => {
      const count = counts[label] || 0;
      const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
      return { label, count, pct };
    });

    return { totalCount, frequencyData };
  };

  return (
    <div className="space-y-6" id="surveys-module-view">
      
      {/* Toast notifications */}
      {successToast && (
        <div className="bg-slate-900 text-white rounded-md px-4 py-2 text-sm shadow-md">
          <span>{successToast}</span>
        </div>
      )}

      {/* Select survey context tab */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-sans">Lecture Evaluation Surveys</h2>
          <p className="text-xs text-slate-500 font-medium">Take beginning-of-course or final academic performance reviews</p>
        </div>

        <div className="flex space-x-2">
          {surveys.map(s => (
            <button
              id={`btn-select-survey-${s.id}`}
              key={s.id}
              onClick={() => setSelectedSurveyId(s.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold uppercase tracking-wider transition ${selectedSurveyId === s.id ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/50"}`}
            >
              {s.type === "beginning" ? "Beginning Survey" : "Ending Survey"}
            </button>
          ))}
        </div>
      </div>

      {activeSurvey && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {isInstructor ? (
            /* ================= INSTRUCTOR ANALYTICS FEED ================= */
            <div className="lg:col-span-12 space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{activeSurvey.title} Results</h3>
                  <p className="text-xs text-slate-500 font-medium">Full cohort statistics based on student feedback</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-md py-1.5 px-3 flex items-center space-x-2 shadow-sm shrink-0 text-xs font-mono">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>Responses: <strong className="text-slate-950 font-black">{responses.filter(r => r.surveyId === activeSurvey.id).length}</strong> filed</span>
                </div>
              </div>

              <div className="space-y-6">
                {activeSurvey.questions.map((q, qIndex) => {
                  const analytics = getQuestionAnalytics(q.id, q.type, q.options);
                  
                  return (
                    <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start space-x-2 border-b border-slate-100 pb-3 mb-4">
                        <HelpCircle className="h-4 w-4 text-slate-405 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-mono text-slate-400 font-semibold">Question {qIndex + 1}</p>
                          <p className="text-sm font-bold text-slate-900">{q.label}</p>
                        </div>
                      </div>

                      {q.type === "open" ? (
                        /* Open verbatim textual list */
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                          {(analytics as any).responses.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">No verbal suggestions returned yet.</p>
                          ) : (
                            (analytics as any).responses.map((r: any, rIdx: number) => (
                              <div key={rIdx} className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-xs shadow-xs">
                                <p className="font-semibold text-slate-800 mb-1 font-mono">{r.name || "Anonymous student"}:</p>
                                <p className="text-slate-650 italic font-sans font-medium">"{r.text}"</p>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        /* Beautiful custom micro charts */
                        <div className="space-y-4 font-mono text-xs">
                          {(analytics as any).frequencyData.map((fd: any, fdIdx: number) => (
                            <div key={fdIdx} className="space-y-1.5">
                              <div className="flex justify-between items-center text-slate-705">
                                <span className="font-sans font-medium text-slate-900 block max-w-sm truncate">{fd.label}</span>
                                <span className="font-semibold text-slate-800">{fd.count} votes ({fd.pct}%)</span>
                              </div>
                              
                              {/* Custom SVG-like bars */}
                              <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex border border-slate-200/50">
                                <div
                                  className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                                  style={{ width: `${fd.pct}%` }}
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
            </div>
          ) : (
            /* ================= STUDENT COMPLIANCE QUESTIONNAIRE ================= */
            <div className="lg:col-span-12">
              {hasSubmitted ? (
                /* Already filled layout */
                <div className="bg-white border border-emerald-400 p-8 rounded-xl text-center space-y-4 shadow-sm">
                  <Check className="h-10 w-10 text-emerald-700 bg-emerald-50 rounded-full p-2 mx-auto border border-emerald-200" />
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider">Evaluation Logged</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Thank you! Your survey responses have been synchronized with Dr. Zerihun's administrative workspace.</p>
                  </div>
                </div>
              ) : (
                /* Needs filling layout */
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <div className="border-b border-slate-100 pb-3 mb-5">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">Incomplete Task</span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{activeSurvey.title}</h3>
                  </div>

                  <form onSubmit={handleSurveySubmit} className="space-y-6">
                    {activeSurvey.questions.map((q, idx) => (
                      <div key={q.id} className="space-y-3 border-b border-slate-50 pb-5">
                        <p className="text-xs font-mono text-slate-400 font-semibold uppercase">Question {idx + 1}</p>
                        <p className="text-sm font-bold text-slate-900">{q.label}</p>

                        {q.type === "mcq" && (
                          <div className="space-y-2">
                            {q.options?.map(opt => (
                              <label key={opt} className="flex items-center space-x-3 text-xs text-slate-750 cursor-pointer">
                                <input
                                  id={`opt-${q.id}-${opt}`}
                                  type="radio"
                                  name={q.id}
                                  required
                                  checked={answers[q.id] === opt}
                                  onChange={() => handleSelectAnswer(q.id, opt)}
                                  className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                />
                                <span className="font-medium text-slate-700">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "likert" && (
                          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 pt-1">
                            {q.options?.map((opt, oIdx) => (
                              <label key={opt} className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl py-1.5 px-3 transition shadow-xs">
                                <input
                                  id={`likert-${q.id}-${oIdx}`}
                                  type="radio"
                                  name={q.id}
                                  required
                                  checked={answers[q.id] === opt}
                                  onChange={() => handleSelectAnswer(q.id, opt)}
                                  className="h-4.5 w-4.5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                />
                                <span className="font-bold text-slate-800">{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {q.type === "open" && (
                          <textarea
                            id={`textarea-${q.id}`}
                            required
                            rows={4}
                            placeholder="Type your open evaluations freely here..."
                            value={(answers[q.id] as string) || ""}
                            onChange={e => handleSelectAnswer(q.id, e.target.value)}
                            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-900 focus:outline-none focus:border-indigo-600 font-sans"
                          />
                        )}
                      </div>
                    ))}

                    <div className="flex justify-end pt-3">
                      <button
                        id="btn-submit-survey-evaluation"
                        type="submit"
                        className="bg-indigo-600 text-white hover:bg-indigo-700 px-5 py-2.5 rounded-md font-semibold text-xs flex items-center space-x-2 transition shadow-sm"
                      >
                        <Save className="h-4 w-4" />
                        <span>Log Evaluation Answers</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
}

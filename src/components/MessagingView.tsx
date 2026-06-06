/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Message } from "../types";
import { dbService } from "../lib/db";
import { Send, User, Users, Inbox, Bell, AlertTriangle } from "lucide-react";

interface MessagingProps {
  isInstructor: boolean;
  currentStudent: Student;
}

export default function MessagingView({ isInstructor, currentStudent }: MessagingProps) {
  const [messages, setMessages] = useState<Message[]>(dbService.getMessages());
  const students = dbService.getStudents();

  // Selected recipient for instructors
  const [recipientId, setRecipientId] = useState<string>("all");
  const [draftContent, setDraftContent] = useState("");
  const [sentToast, setSentToast] = useState<string | null>(null);

  const getFilteredMessages = () => {
    if (isInstructor) {
      // Instructors see everything
      return messages;
    } else {
      // Students see broadcasts ("all") OR messages they sent OR messages specifically for them
      return messages.filter(
        msg => msg.recipientId === "all" || msg.senderId === currentStudent.id || msg.recipientId === currentStudent.id
      );
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;

    const msgId = `msg_${Date.now()}`;
    const newMsg: Message = {
      id: msgId,
      senderId: isInstructor ? "instructor_1" : currentStudent.id,
      senderName: isInstructor ? "Dr. Zerihun (Instructor)" : currentStudent.name,
      senderRole: isInstructor ? "instructor" : "student",
      recipientId: isInstructor ? recipientId : "instructor_1", // Student always writes to Instructor
      content: draftContent,
      createdAt: new Date().toISOString()
    };

    dbService.addMessage(newMsg);
    setMessages(dbService.getMessages());
    setDraftContent("");
    
    setSentToast("Message dispatched & cached");
    setTimeout(() => setSentToast(null), 3000);
  };

  const activeMessages = getFilteredMessages().sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="messaging-center">
      
      {/* Toast Alert */}
      {sentToast && (
        <div className="lg:col-span-12 bg-slate-900 text-white rounded-md px-4 py-2.5 text-xs flex justify-between shadow-md animate-fade-in">
          <span>{sentToast}</span>
        </div>
      )}

      {/* Left Column: Notification list / Inbox list */}
      <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4">
          <Bell className="h-5 w-5 text-slate-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Notification Bulletin</h3>
        </div>

        <div className="space-y-3 font-sans">
          
          <div className="bg-white border border-slate-250 p-4 rounded-xl shadow-sm flex items-start space-x-2.5">
            <Inbox className="h-5 w-5 text-indigo-500 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-slate-900">Course Channels Active</p>
              <p className="text-slate-500 mt-1 font-medium leading-relaxed">Both general Section Broadcasts and Single Student threads are supported seamlessly.</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start space-x-2.5 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-amber-700 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-amber-900">Offline-Queue Support</p>
              <p className="text-amber-800 mt-1 font-medium leading-relaxed font-sans">If cellular services dropout in AAU, bulletins remain locally visible. Dispatched letters will buffer until connections resume.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Chat layout terminal */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between min-h-[480px] shadow-sm">
        <div>
          <div className="border-b border-slate-150 pb-3 mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Communication Thread</h2>
              <p className="text-xs text-slate-500 font-medium">Live conversation thread with instructors & students</p>
            </div>
            
            <div className="text-[10px] font-mono bg-slate-150 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200">
              Dr. Zerihun (Administrative Coordinator)
            </div>
          </div>

          {/* Renders previous chat arrays */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-2">
            {activeMessages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                No conversations logged on this thread yet.
              </div>
            ) : (
              activeMessages.map(m => {
                const selfMessage = isInstructor ? m.senderRole === "instructor" : m.senderId === currentStudent.id;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[80%] ${selfMessage ? "ml-auto items-end" : "mr-auto items-start"}`}
                  >
                    <span className="text-[10px] text-slate-400 font-mono mb-1 font-medium">
                      {m.senderName} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div
                      className={`p-3 rounded-xl text-xs leading-relaxed shadow-sm ${selfMessage ? "bg-indigo-650 text-white rounded-tr-none" : "bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200"}`}
                    >
                      <p>{m.content}</p>
                      
                      {m.recipientId === "all" && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold tracking-wider font-mono text-indigo-400 mt-1.5 justify-end w-full uppercase">
                          <Users className="h-2.5 w-2.5" /> Broadcast
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSendMessage} className="border-t border-slate-150 dark:border-slate-800 pt-4 space-y-3">
          {isInstructor && (
            <div className="flex items-center space-x-3 text-xs mb-1">
              <span className="font-semibold text-slate-750 dark:text-slate-300">Send To:</span>
              <select
                id="message-recipient"
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                className="border border-slate-200 dark:border-slate-805 text-xs rounded-md px-2.5 py-1.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
              >
                <option value="all" className="dark:bg-slate-900 text-slate-900 dark:text-white">📢 ALL Registered Students (Broadcast)</option>
                {students.map(s => (
                  <option key={s.id} value={s.id} className="dark:bg-slate-900 text-slate-900 dark:text-white">👤 {s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex space-x-3">
            <input
              id="draft-message-input"
              type="text"
              required
              placeholder={isInstructor ? "Compose bulletin message..." : "Ask your professor an academic question..."}
              value={draftContent}
              onChange={e => setDraftContent(e.target.value)}
              className="flex-1 text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-sans font-medium"
            />
            <button
              id="btn-dispatch-message"
              type="submit"
              className="bg-indigo-600 text-white hover:bg-indigo-700 p-2.5 rounded-md transition shadow-sm font-semibold cursor-pointer"
              title="Dispatch Message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}

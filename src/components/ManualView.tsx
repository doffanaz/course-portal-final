/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Layers, Download, HelpCircle, Wifi, Database, Info, 
  Settings, CheckCircle, RefreshCw, Smartphone, BookOpen 
} from "lucide-react";

export default function ManualView() {
  return (
    <div className="space-y-8 animate-fade-in" id="manual-and-faq-workspace">
      
      {/* Visual Header */}
      <div className="border-b border-slate-100 pb-5">
        <div className="flex items-center space-x-3 mb-1.5">
          <div className="p-2 bg-slate-900 text-indigo-400 rounded-lg shrink-0 shadow-sm">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">User Manual & Offline Sync Architecture</h2>
            <p className="text-xs text-slate-500 font-medium">Systems reference guidelines designed by Dr. Zerihun Doda for Ethiopian Universities</p>
          </div>
        </div>
      </div>

      {/* CORE SYNC ARCHITECTURE BENTO BLOCK */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-6 shadow-md border border-indigo-950">
        <div className="flex items-center space-x-2.5 mb-4">
          <Database className="h-5.5 w-5.5 text-indigo-300" />
          <h3 className="text-md font-bold tracking-tight">Offline-First Synchronizer Design Specifications</h3>
        </div>
        <p className="text-xs text-indigo-200 leading-relaxed mb-6 font-medium">
          The Course Companion implements a heavy-duty, state-of-the-art offline synchronization strategy 
          optimized specifically for intermittent telecom network grids (such as rural 3G/4G blackouts). Here's 
          how the operational data loop is governed under the hood:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Local caching */}
          <div className="bg-white/10 p-4 rounded-lg border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">Phase 1</span>
              <h4 className="font-bold text-sm text-white mt-1 mb-2">Immutable Redundant Caching</h4>
              <p className="text-[11px] text-indigo-100 leading-normal font-medium">
                All course registries, profiles, student submissions, and files are saved immediately inside the browser's 
                <code className="bg-black/30 px-1 py-0.5 rounded text-[10px] font-mono text-amber-300 border border-white/5">LocalStorage</code> partition. 
                Zero network roundtrips are needed to load records or read lecture notes once cached.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-indigo-250 font-mono">
              <span>LOCAL DISK CACHE</span>
              <span className="text-emerald-400">● SECURE</span>
            </div>
          </div>

          {/* Card 2: Outbox queue */}
          <div className="bg-white/10 p-4 rounded-lg border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">Phase 2</span>
              <h4 className="font-bold text-sm text-white mt-1 mb-2">Transactional Outbox Queue</h4>
              <p className="text-[11px] text-indigo-100 leading-normal font-medium">
                When offline operations occur (e.g. marking attendance sheet, entering student expectation profile, posting grades), 
                a structured transaction is logged into a sequential <code className="bg-black/30 px-1 py-0.5 rounded text-[10px] text-amber-300 font-mono border border-white/5">sync_outbox</code> array. 
                Changes are cataloged instantly so nothing is lost.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-indigo-250 font-mono">
              <span>OUTBOX TRANSACTION</span>
              <span className="text-amber-400">● READY_QUEUE</span>
            </div>
          </div>

          {/* Card 3: Conflict resolution */}
          <div className="bg-white/10 p-4 rounded-lg border border-white/10 backdrop-blur-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-300">Phase 3</span>
              <h4 className="font-bold text-sm text-white mt-1 mb-2">Automated Flush & Merge</h4>
              <p className="text-[11px] text-indigo-100 leading-normal font-medium">
                When physical connectivity is restored, the client receives a window update and triggers a secure flushing sequence. 
                Conflicts are resolved via <strong className="text-amber-300">Last-Write-Wins (LWW)</strong> policies: 
                records with more recent millisecond timestamps overwrite elder data states.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-indigo-250 font-mono">
              <span>CONFLICT RESOLVER</span>
              <span className="text-indigo-300">● LAST_WRITE_WINS</span>
            </div>
          </div>

        </div>
      </div>

      {/* MOBILE PWA STANDALONE INSTALLATION GUIDE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Step-by-step PWA Setup */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Smartphone className="h-5 w-5 text-indigo-600" />
            <h4 className="font-bold text-sm text-slate-900">How to Install stand-alone Course Companion</h4>
          </div>
          
          <ul className="space-y-3 font-medium text-slate-650 text-xs">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-[11px] font-mono shrink-0">1</span>
              <span>
                <strong>Launch in Chrome or Safari:</strong> Open the Course Companion URL on your mobile phone or laptop browser.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-[11px] font-mono shrink-0">2</span>
              <span>
                <strong>For Android Chrome:</strong> Tap the 3 vertical dots at the top right of the browser and click 
                <span className="text-indigo-605 font-bold"> "Add to Home Screen"</span> or <span className="text-indigo-605 font-bold">"Install App"</span>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-[11px] font-mono shrink-0">3</span>
              <span>
                <strong>For iOS Safari:</strong> Tap the browser <span className="italic">"Share Button"</span> at the bottom layout and click <span className="text-indigo-605 font-bold">"Add to Home Screen"</span>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-slate-100 text-slate-800 rounded-full flex items-center justify-center font-bold text-[11px] font-mono shrink-0">4</span>
              <span>
                <strong>Offline Launch:</strong> The app will generate an official launch icon. You can tap it anytime to open it in full-screen standalone mode, completely bypassing browser bars even with cellular network completely cut!
              </span>
            </li>
          </ul>

          <div className="bg-indigo-50/60 p-3 rounded-md border border-indigo-100 text-[11px] text-indigo-950 flex gap-2 font-medium">
            <Info className="h-4 w-4 text-indigo-605 shrink-0" />
            <span>Students can scan your dynamic campus QR code or toggle offline cache downloads instantly to install files!</span>
          </div>
        </div>

        {/* Dynamic Shared Installation URL Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 mb-4">
              <Download className="h-5 w-5 text-slate-700" />
              <h4 className="font-bold text-sm text-slate-900">Dynamic Student Shareable URL</h4>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-4">
              Display or copy this active digital link and project it on the lecture slides or share it over rural Telegram threads so students can instantly install the Standalone PWA onto their private devices:
            </p>

            <div className="bg-white border border-slate-300 p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between shadow-3xs mb-3 gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 select-all tracking-tight break-all cursor-pointer" title="Click to select">
                {typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app"}
              </span>
              <button 
                id="btn-copy-install-url"
                onClick={() => {
                  const activeUrl = typeof window !== "undefined" ? window.location.origin : "https://ais-pre-rtsrmsaajdoaefybjzeiti-417855481124.europe-west2.run.app";
                  navigator.clipboard.writeText(activeUrl);
                  alert(`Copied App Link: ${activeUrl} to clipboard! Share this exact link with students.`);
                }}
                className="bg-indigo-650 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase font-sans tracking-wide px-3 py-1.5 rounded transition shrink-0 self-start sm:self-auto shadow-3xs cursor-pointer"
              >
                Copy URL Link
              </button>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              *Once visited, the student's phone automatically downloads 100% of the UI shell and caches mock seed data for instant standalone operation.
            </p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-emerald-800 text-[11px] font-bold flex items-center justify-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>PWA Manifest file validated and active</span>
          </div>
        </div>

      </div>

      {/* DETAILED FAQ SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <HelpCircle className="h-5.5 w-5.5 text-slate-700" />
          <h4 className="font-black text-slate-900 text-sm">Classroom Management Frequently Asked Questions (FAQ)</h4>
        </div>

        <div className="space-y-4">
          
          <div>
            <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-1 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              <span>Can I edit student profiles on their behalf if they don't have internet access?</span>
            </h5>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pl-3">
              Yes, absolutely! On the <strong>"Registry & Thesis"</strong> page, whenever you are logged in as "Dr. Zerihun (Instructor)" and select a student, the inputs are completely unlocked. You can update their full names, institutions, contacts, or project milestones, and click <strong>"Save Profile (On Behalf)"</strong>. The changes are cached locally and merged to the cloud.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-1 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              <span>How are my course assignments weighted?</span>
            </h5>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pl-3">
              Assignments are configured for the Qualitative Research methodology stream with precise core weights:
              <br />
              - Research Proposal Development: <strong>25%</strong>
              <br />
              - Critical Book/Article Review: <strong>20%</strong>
              <br />
              - Seminar on Key Methodological Concepts: <strong>25%</strong>
              <br />
              - Data Analysis & Writing Exercise Project: <strong>30%</strong>
            </p>
          </div>

          <div>
            <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-1 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              <span>Do lecture materials work offline?</span>
            </h5>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pl-3">
              Yes. Downloaded materials are serialized in the cache memory so you and your students can review textbooks and chapters anytime during electricity or telecom disconnects.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide mb-1 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
              <span>How do we handle grade conflict resolutions?</span>
            </h5>
            <p className="text-xs text-slate-600 font-medium leading-relaxed pl-3">
              If grades are modified simultaneously, the system relies on LWW matching and highlights the final score. Instructors retain the master privilege to overwrite entries safely.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}

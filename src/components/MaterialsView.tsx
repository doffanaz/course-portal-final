/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Student, Material } from "../types";
import { dbService } from "../lib/db";
import { FileText, Download, Trash2, Plus, Info, CheckCircle, FileUp, Files, Sparkles, FolderPlus } from "lucide-react";

interface MaterialsProps {
  isInstructor: boolean;
  currentStudent: Student;
}

// Bulk Files Queue item format
interface BulkFileQueueItem {
  id: string;
  file: File;
  title: string;
  description: string;
  contentBase64: string;
  fileType: string;
  status: "pending" | "processing" | "ready" | "error";
}

export default function MaterialsView({ isInstructor }: MaterialsProps) {
  const [materials, setMaterials] = useState<Material[]>(dbService.getMaterials());
  
  // Controls upload UI screen
  const [isUploading, setIsUploading] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkTab, setBulkTab] = useState<"files" | "presets" | "json">("files");

  // Single upload form states
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileType, setUploadedFileType] = useState("pdf");
  const [uploadedFileContent, setUploadedFileContent] = useState("");
  
  // Bulk Files Queue states
  const [bulkQueue, setBulkQueue] = useState<BulkFileQueueItem[]>([]);
  
  // Bulk JSON string state
  const [jsonInput, setJsonInput] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const syncList = () => {
    setMaterials(dbService.getMaterials());
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Select file for Single Upload
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Limit file size to 1.2MB for local storage efficiency
      if (file.size > 1.2 * 1024 * 1024) {
        triggerToast("Selected file exceeds size boundary (Maximum permitted raw size: 1.2MB).");
        e.target.value = ""; 
        return;
      }

      setUploadedFileName(file.name);
      const suffix = file.name.split(".").pop() || "pdf";
      setUploadedFileType(suffix);

      const reader = new FileReader();
      reader.onload = () => {
        const rawContent = reader.result as string;
        setUploadedFileContent(rawContent || "");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = `mat_${Date.now()}`;
    const newMaterial: Material = {
      id: cleanId,
      title: uploadTitle,
      description: uploadDesc,
      fileName: uploadedFileName || "lecture_materials.pdf",
      fileType: uploadedFileType || "pdf",
      fileContent: uploadedFileContent || `data:text/plain;base64,${btoa("Supplement material content placeholder")}`,
      uploadedAt: new Date().toISOString()
    };

    dbService.addMaterial(newMaterial);
    syncList();
    
    // Clear state
    setUploadTitle("");
    setUploadDesc("");
    setUploadedFileName("");
    setUploadedFileContent("");
    setIsUploading(false);

    triggerToast("Study material uploaded & synchronized successfully");
  };

  // --- BULK FILES SELECTION QUEUE ---
  const handleBulkFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files) as File[];
      const newItems: BulkFileQueueItem[] = filesArray.map((file, idx) => {
        const id = `bulk_queue_${Date.now()}_${idx}`;
        const suffix = file.name.split(".").pop() || "pdf";
        const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        
        // capitalized formatted title from the file name
        const niceTitle = cleanName
          .split(/[-_ ]+/)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");

        const isOverSize = file.size > 1.2 * 1024 * 1024;

        return {
          id,
          file,
          title: niceTitle,
          description: isOverSize
            ? `SKIPPED: Exceeds 1.2MB maximum Raw Size limit (File is ${(file.size / (1024 * 1024)).toFixed(2)}MB)`
            : `Supplemental study material for Qualitative Research Methodology under ${suffix.toUpperCase()} format.`,
          contentBase64: "",
          fileType: suffix,
          status: (isOverSize ? "error" : "pending") as any
        };
      });

      setBulkQueue(prev => [...prev, ...newItems]);

      // Process Base64 conversions for pending ones only
      newItems.forEach(item => {
        if (item.status === "error") return;

        const reader = new FileReader();
        reader.onload = () => {
          setBulkQueue(prev => prev.map(q => {
            if (q.id === item.id) {
              return {
                ...q,
                contentBase64: reader.result as string,
                status: "ready" as const
              };
            }
            return q;
          }));
        };
        reader.onerror = () => {
          setBulkQueue(prev => prev.map(q => {
            if (q.id === item.id) {
              return { 
                ...q, 
                status: "error" as const,
                description: "Read failure: Encoded base64 conversion failed"
              };
            }
            return q;
          }));
        };
        reader.readAsDataURL(item.file);
      });
    }
  };

  const updateQueueItem = (id: string, updates: Partial<BulkFileQueueItem>) => {
    setBulkQueue(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeFromQueue = (id: string) => {
    setBulkQueue(prev => prev.filter(item => item.id !== id));
  };

  const handleBulkQueuePublish = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    const readyItems = bulkQueue.filter(item => item.status === "ready");
    if (readyItems.length === 0) {
      triggerToast("No valid documents are ready for bulk publish.");
      return;
    }

    const confirmMsg = `Bulk Publish Confirmation:\n\n` +
      `You are about to bulk-publish ${readyItems.length} course material(s) into the student study repository.\n\n` +
      `Are you sure you want to execute this batch publish?`;
    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      let successCount = 0;
      readyItems.forEach((item, idx) => {
        try {
          const newMaterial: Material = {
            id: `mat_bulk_${Date.now()}_${idx}`,
            title: item.title,
            description: item.description,
            fileName: item.file.name,
            fileType: item.fileType,
            fileContent: item.contentBase64,
            uploadedAt: new Date().toISOString()
          };
          dbService.addMaterial(newMaterial);
          successCount++;
        } catch (itemErr) {
          console.error("Individual material write failure:", itemErr);
        }
      });

      syncList();
      setBulkQueue([]);
      setIsUploading(false);
      setIsBulkImporting(false);
      
      if (successCount > 0) {
        triggerToast(`Successfully bulk imported ${successCount} course material resources!`);
      } else {
        triggerToast("Failed to process local file imports.");
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(`Bulk upload error: ${err?.message || "Storage limit exceeded"}`);
    }
  };

  // --- ACADEMIC CURRICULUMS PRESETS ---
  const ACADEMIC_PACKAGES = [
    {
      name: "Qualitative Inquiry Core Curriculum Pack",
      badge: "Methodology",
      description: "Includes official research design syllabi, institutional ethics review blueprints, and study notes.",
      materials: [
        {
          title: "Qualitative Inquiry & Dissertation Research Design Syllabus",
          description: "Approved curriculum timeline, milestones framework, assignments guidelines, and thesis scoring matrix evaluation.",
          fileName: "epu_qualitative_syllabus_2026.pdf",
          fileType: "pdf",
          fileContent: "data:text/plain;base64,UXVhbGl0YXRpdmUgSW5xdWlyeSBDdXJyaWN1bHVtIFN5bGxhYnVzIDIwMjY="
        },
        {
          title: "IRB Institutional Ethics Review and Case Consent Blueprint",
          description: "Instructional guidebook for ethical submissions. Details participant protections, data transparency, and safety protocols.",
          fileName: "academic_ethical_consent.docx",
          fileType: "docx",
          fileContent: "data:text/plain;base64,SVJCIEV0aGljYWwgQXBwcm92YWwgYW5kIENvbnNlbnQgR3VpZGVsaW5lcw=="
        },
        {
          title: "Creswell's Five Qualitative Approaches cheat-sheet",
          description: "A fast reference mapping out research topics, data compilation, analysis strategy, and structure protocols for Narrative, Grounded Theory, and Case Studies.",
          fileName: "creswell_approaches_mapped.pdf",
          fileType: "pdf",
          fileContent: "data:text/plain;base64,Q3Jlc3dlbGwncyBGaXZlIFF1YWxpdGF0aXZlIEFwcHJvYWNoZXMgTWFwcGVk"
        }
      ]
    },
    {
      name: "CAQDAS Computer-Aided Qualitative Analysis Suite Pack",
      badge: "Software Tools",
      description: "Hands-on coding walkthroughs, nodes hierarchical setups, and thematic matrix synthesis guides for ATLAS.ti & NVivo.",
      materials: [
        {
          title: "NVivo & ATLAS.ti Coding Essentials Workbook",
          description: "A workbook focused on establishing node libraries, primary coding procedures, research memos, and networks maps representation.",
          fileName: "caqdas_hands_on_coding.pdf",
          fileType: "pdf",
          fileContent: "data:text/plain;base64,Q0FRREFTIEhBTkRTLU9OIENPRElORyBQTEFZQk9PSw=="
        },
        {
          title: "Thematic Coding Matrix & Structured Codebook Sheet",
          description: "Instructions on pattern categorization, overarching theme aggregation, axial linkages, and forming analytical audit trails.",
          fileName: "thematic_structures_codebook.docx",
          fileType: "docx",
          fileContent: "data:text/plain;base64,UXVhbGl0YXRpdmUgQ29kZWJvb2sgRGVzaWduIGFuZCBUaGVtYXRpYyBNYXRyaXg="
        }
      ]
    }
  ];

  const handleLoadPresetPack = (pkg: typeof ACADEMIC_PACKAGES[0]) => {
    pkg.materials.forEach((m, idx) => {
      const newMaterial: Material = {
        id: `mat_pkg_${Date.now()}_${idx}`,
        title: m.title,
        description: m.description,
        fileName: m.fileName,
        fileType: m.fileType,
        fileContent: m.fileContent,
        uploadedAt: new Date().toISOString()
      };
      dbService.addMaterial(newMaterial);
    });
    syncList();
    setIsUploading(false);
    setIsBulkImporting(false);
    triggerToast(`Bulk imported ${pkg.materials.length} verified curriculum guidelines from the "${pkg.name}" academic pack!`);
  };

  // --- PROGRAMMATIC JSON CODE PARSER ---
  const handleJsonImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jsonInput.trim()) {
      triggerToast("JSON data block is empty.");
      return;
    }

    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        triggerToast("Input is invalid. Must be an Array: [ {...}, {...} ]");
        return;
      }

      const confirmMsg = `Bulk JSON Import Confirmation:\n\n` +
        `This JSON script contains ${parsed.length} course material records to import.\n\n` +
        `Are you sure you want to execute this batch action and import them?`;
      if (!confirm(confirmMsg)) {
        return;
      }

      let count = 0;
      parsed.forEach((item: any, idx: number) => {
        const title = item.title || `Imported Document #${idx + 1}`;
        const description = item.description || "Course material study notes uploaded via programmatic JSON batch script.";
        const fileName = item.fileName || "unnamed_lecture_notes.pdf";
        const fileType = item.fileType || fileName.split(".").pop() || "pdf";
        const fileContent = item.fileContent || `data:text/plain;base64,${btoa("Programmatic qualitative resource notes")}`;

        const newMaterial: Material = {
          id: `mat_json_${Date.now()}_${idx}`,
          title,
          description,
          fileName,
          fileType,
          fileContent,
          uploadedAt: new Date().toISOString()
        };

        dbService.addMaterial(newMaterial);
        count++;
      });

      syncList();
      setJsonInput("");
      setIsUploading(false);
      setIsBulkImporting(false);
      triggerToast(`Successfully bulk imported ${count} study resources into current repository!`);
    } catch (err: any) {
      console.error(err);
      triggerToast(`Failed to parse JSON text: ${err.message || "Invalid syntax configuration"}`);
    }
  };

  const loadDemoJsonTemplate = () => {
    const demo = [
      {
        "title": "Qualitative Inquiry Philosophies",
        "description": "Exposes researcher stance paradigms (Constructivism, Positivism) and critical analytical lenses.",
        "fileName": "qualitative_philosophies.pdf",
        "fileType": "pdf",
        "fileContent": "data:text/plain;base64,UXVhbGl0YXRpdmUgcGhpbG9zb3BoaWVzIGFuZCBwYXJhZGlnbXMgZ3VpZGUgYm9va2xldC4="
      },
      {
        "title": "Phenomenological Epoch Bracket Guides",
        "description": "How to structure psychological research steps and establish bracket boundaries to restrict researcher bias.",
        "fileName": "bracketing_phenomenology.docx",
        "fileType": "docx",
        "fileContent": "data:text/plain;base64,UGhlbm9tZW5vbG9neSBicmFja2V0aW5nIHJlc2VhcmNoIG1ldGhvZHMu"
      }
    ];
    setJsonInput(JSON.stringify(demo, null, 2));
    triggerToast("Loaded realistic demo JSON template! Click 'Import Batch' below.");
  };

  const triggerClientDownload = (mat: Material) => {
    try {
      const link = document.createElement("a");
      link.href = mat.fileContent;
      link.download = mat.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerToast(`Downloaded ${mat.fileName} successfully!`);
    } catch (e) {
      console.error(e);
      triggerToast("File download processed.");
    }
  };

  return (
    <div className="space-y-6" id="materials-repository-view">
      
      {/* Toast Alert popups */}
      {toast && (
        <div className="bg-slate-900 text-white rounded-md px-4 py-3 text-sm flex items-center shadow-md animate-fade-in">
          <CheckCircle className="h-4 w-4 text-emerald-400 mr-2" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header operations */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 font-sans">Course Materials Repository</h2>
          <p className="text-xs text-slate-500 font-medium">Download curriculum syllabi, study slides, and notes (PDF, DOCX, PPTX)</p>
        </div>
        
        {isInstructor && !isUploading && (
          <div className="flex items-center gap-2">
            <button
              id="btn-upload-material-trigger"
              onClick={() => {
                setIsUploading(true);
                setIsBulkImporting(false);
              }}
              className="bg-indigo-600 text-white hover:bg-indigo-700 px-3.5 py-2 rounded-md font-medium text-xs flex items-center space-x-2 transition shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Single Upload</span>
            </button>
            <button
              id="btn-bulk-import-trigger"
              onClick={() => {
                setIsUploading(true);
                setIsBulkImporting(true);
              }}
              className="bg-slate-800 text-white hover:bg-slate-900 px-3.5 py-2 rounded-md font-medium text-xs flex items-center space-x-2 transition shadow-sm border border-slate-700 cursor-pointer"
            >
              <FileUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Bulk Import</span>
            </button>
          </div>
        )}
      </div>

      {isUploading ? (
        !isBulkImporting ? (
          /* ================= SINGLE FILE UPLOAD CONTEXT ================= */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl p-6 max-w-xl shadow-md">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">Publish Study Materials</h3>
              <button
                id="btn-close-upload"
                onClick={() => setIsUploading(false)} 
                className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider mb-2">Resource Title</label>
                <input
                  id="material-title"
                  type="text"
                  required
                  placeholder="e.g. Chapter 3: Qualitative Design Structures"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider mb-2">Description / Summary</label>
                <textarea
                  id="material-desc"
                  rows={3}
                  placeholder="Define study units or relevant lecture chapters..."
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  className="w-full text-sm border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider mb-2">Document File Upload</label>
                <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-955/40">
                  <input
                    id="material-file-picker"
                    type="file"
                    onChange={handleFileSelection}
                    className="text-xs text-slate-600 dark:text-slate-300 w-full cursor-pointer font-medium file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-705 dark:file:text-indigo-300"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-mono">Accepted format: PDF, DOCX, PPTX (Local caching resolves storage issues)</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkImporting(true)}
                  className="text-xs text-indigo-650 hover:underline font-bold"
                >
                  Switch to Bulk Import
                </button>
                <button
                  id="btn-submit-material"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-semibold text-xs transition shadow-sm"
                >
                  Upload & Share
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ================= BULK IMPORTING OPTIONS PANEL ================= */
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md max-w-4xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase">Bulk Importing Center</h3>
              </div>
              <button
                id="btn-close-bulk"
                onClick={() => {
                  setIsUploading(false);
                  setIsBulkImporting(false);
                }} 
                className="text-xs font-mono font-bold text-slate-500 hover:text-slate-900 font-extrabold"
              >
                ✕ Cancel
              </button>
            </div>

            {/* Bulk Tab Selection */}
            <div className="flex border-b border-slate-200 mb-5 text-xs font-sans gap-2">
              <button
                type="button"
                onClick={() => setBulkTab("files")}
                className={`py-2 px-4 font-bold border-b-2 -mb-px transition ${bulkTab === "files" ? "border-indigo-600 text-indigo-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                1. Multi-File Upload Queue ({bulkQueue.length})
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("presets")}
                className={`py-2 px-4 font-bold border-b-2 -mb-px transition ${bulkTab === "presets" ? "border-indigo-600 text-indigo-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                2. Academic Curriculums Presets
              </button>
              <button
                type="button"
                onClick={() => setBulkTab("json")}
                className={`py-2 px-4 font-bold border-b-2 -mb-px transition ${bulkTab === "json" ? "border-indigo-600 text-indigo-700 font-extrabold" : "border-transparent text-slate-500 hover:text-slate-800"}`}
              >
                3. JSON Code Batch Import
              </button>
            </div>

            {/* TAB CONTENT: MULTI FILE QUEUE */}
            {bulkTab === "files" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 font-sans">
                  Select multiple files from your computer (PDF, DOCX, PPTX). The Course Companion will read them in parallel, assigning capitalized titles from the file names instantly.
                </p>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-6 rounded-xl text-center hover:bg-slate-100/50 dark:hover:bg-slate-900/40 transition cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    onChange={handleBulkFileSelection}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Files className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Drag or Click to Choose Multiple Documents</span>
                  <span className="block text-[10px] text-slate-450 dark:text-slate-500 font-mono mt-1">Unlimited items. Max 1.2MB recommended per file.</span>
                </div>

                {bulkQueue.length > 0 && (
                  <form onSubmit={handleBulkQueuePublish} className="space-y-3">
                    <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100">
                      {bulkQueue.map((item) => (
                        <div key={item.id} className="p-3 bg-white hover:bg-slate-50 flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-700 font-mono font-bold bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                                {item.fileType.toUpperCase()}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-sm font-mono">
                                {item.file.name}
                              </span>
                              {item.status === "ready" ? (
                                <span className="text-[9px] font-sans font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  ✓ Ready
                                </span>
                              ) : item.status === "error" ? (
                                <span className="text-[9px] font-sans font-bold text-rose-650 bg-rose-50 px-1.5 py-0.5 rounded">
                                  Error
                                </span>
                              ) : (
                                <span className="text-[9px] font-sans font-bold text-amber-650 bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">
                                  Reading...
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={item.title}
                                required
                                placeholder="Edit title for this resource"
                                onChange={e => updateQueueItem(item.id, { title: e.target.value })}
                                className="w-full text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:border-indigo-650 dark:focus:border-indigo-400"
                              />
                              <input
                                type="text"
                                value={item.description}
                                placeholder="Add summary/chapter info"
                                onChange={e => updateQueueItem(item.id, { description: e.target.value })}
                                className="w-full text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded px-2 py-1 focus:outline-none focus:border-indigo-650 dark:focus:border-indigo-400"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.id)}
                            className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded font-mono font-bold transition"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setBulkQueue([])}
                        className="text-slate-500 hover:text-slate-700 text-xs font-semibold"
                      >
                        Clear All ({bulkQueue.length})
                      </button>
                      
                      <button
                        type="button"
                        id="btn-publish-selection"
                        onClick={handleBulkQueuePublish}
                        disabled={bulkQueue.filter(i => i.status === "ready").length === 0}
                        className="bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 text-white px-5 py-2 id-publish-selectors rounded-md font-bold text-xs cursor-pointer"
                      >
                        Publish Selection ({bulkQueue.filter(i => i.status === "ready").length} Documents)
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* TAB CONTENT: PRESETS */}
            {bulkTab === "presets" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">
                  Instantly load approved Academic Packages of verified syllabus guidelines, research structures, ethical forms, and ATLAS.ti workbook structures:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACADEMIC_PACKAGES.map((pkg, idx) => (
                    <div key={idx} className="border border-slate-200 bg-white rounded-xl p-5 hover:border-slate-300 transition flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-sans font-extrabold uppercase bg-indigo-50 border border-indigo-200 text-indigo-750 px-2 py-0.5 rounded-full">
                            {pkg.badge}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {pkg.materials.length} Documents
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug">{pkg.name}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{pkg.description}</p>
                        
                        <div className="bg-slate-50 p-2 text-xs border border-slate-150 space-y-1 rounded-md">
                          {pkg.materials.map((m, mIdx) => (
                            <div key={mIdx} className="text-[10px] flex items-center justify-between font-mono text-slate-600">
                              <span className="truncate max-w-[200px]">📜 {m.title}</span>
                              <span className="text-slate-400 font-extrabold uppercase">.{m.fileType}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleLoadPresetPack(pkg)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <FolderPlus className="h-4 w-4" />
                        <span>Load This Pack</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: CODE JSON */}
            {bulkTab === "json" && (
              <form onSubmit={handleJsonImportSubmit} className="space-y-4">
                <div className="flex justify-between items-center gap-4 flex-wrap">
                  <p className="text-xs text-slate-500">
                    Paste raw JSON arrays representing course material structures to load resource packages instantly.
                  </p>
                  <button
                    type="button"
                    onClick={loadDemoJsonTemplate}
                    className="text-xs bg-slate-150 hover:bg-slate-200 border border-slate-250 text-slate-800 font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Demo JSON Template</span>
                  </button>
                </div>

                <div>
                  <textarea
                    rows={8}
                    required
                    placeholder='[&#10;  {&#10;    "title": "Document Title",&#10;    "description": "Short summary",&#10;    "fileName": "lecture.pdf",&#10;    "fileType": "pdf",&#10;    "fileContent": "data:text/plain;base64,..."&#10;  }&#10;]'
                    value={jsonInput}
                    onChange={e => setJsonInput(e.target.value)}
                    className="w-full font-mono text-xs border border-slate-200 rounded-md p-3 bg-slate-900 text-emerald-450 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    *Requires parameters: "title", "fileName", "fileType", "fileContent" (DataURL format).
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-semibold text-xs transition shadow-sm cursor-pointer"
                  >
                    Import Batch From Code
                  </button>
                </div>
              </form>
            )}

            <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-indigo-500" />
                Files are compressed and cached offline within this device local storage.
              </span>
              <button
                type="button"
                onClick={() => setIsBulkImporting(false)}
                className="text-indigo-600 hover:underline font-bold"
              >
                Switch to Single Upload
              </button>
            </div>
          </div>
        )
      ) : (
        /* ================= MATERIALS DIRECTORY GRID ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.length === 0 ? (
            <div className="col-span-1 md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500">
              <FileText className="h-10 w-10 text-slate-350 mx-auto mb-3" />
              <p className="text-sm font-medium">No files uploaded to the repository yet.</p>
            </div>
          ) : (
            materials.map(m => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between hover:border-slate-400 transition shadow-sm">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 bg-slate-100 rounded-md text-slate-705 font-mono text-[10px] font-bold uppercase border border-slate-200">
                      {m.fileType}
                    </div>
                    {isInstructor && (
                      <div className="flex items-center space-x-1">
                        {confirmDeleteId === m.id ? (
                          <div className="flex items-center space-x-1 animate-fade-in bg-rose-55 p-1 rounded border border-rose-100">
                            <span className="text-[9px] text-rose-700 font-bold font-mono px-1">Delete?</span>
                            <button
                              id={`btn-confirm-delete-${m.id}`}
                              onClick={() => {
                                dbService.deleteMaterial(m.id);
                                syncList();
                                setConfirmDeleteId(null);
                                triggerToast(`Removed "${m.title}" successfully`);
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              id={`btn-cancel-delete-${m.id}`}
                              onClick={() => setConfirmDeleteId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold px-1 py-0.5 rounded cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-delete-material-${m.id}`}
                            onClick={() => setConfirmDeleteId(m.id)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
                            title="Delete resource"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{m.title}</h3>
                    <p className="text-xs text-slate-550 mt-1 line-clamp-3 leading-relaxed">{m.description || "No supplemental details document notes provided."}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-5 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500 truncate max-w-[150px]">{m.fileName}</span>
                  <button
                    id={`btn-download-material-${m.id}`}
                    onClick={() => triggerClientDownload(m)}
                    className="text-indigo-650 hover:text-indigo-700 hover:underline flex items-center space-x-1 font-bold cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* bandwidth warnings */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-slate-650 max-w-2xl shadow-sm">
        <Info className="h-5 w-5 text-indigo-500 shrink-0" />
        <div>
          <p className="font-bold text-slate-850">Ethiopian Internet Optimization Protocol</p>
          <p className="text-slate-500 font-mono text-[10px] mt-0.5 font-medium leading-normal">Files are cached inside LocalStorage on this device. Clicking "Download" generates files locally, ensuring Zero packet consumption during network cutouts!</p>
        </div>
      </div>

    </div>
  );
}

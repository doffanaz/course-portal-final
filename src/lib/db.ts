/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Attendance, Assignment, Submission, Material, Message, Survey, SurveyResponse, Reflection, ResearchProfile, PeerFeedback, WorkspaceNote, FeedbackTemplate, AnonymousFeedback, AutomatedBackup } from "../types";
import { 
  SEED_STUDENTS, SEED_ASSIGNMENTS, SEED_SUBMISSIONS, SEED_MATERIALS, 
  SEED_SURVEYS, SEED_REFLECTIONS, SEED_RESEARCH_PROFILES, SEED_MESSAGES, SEED_ATTENDANCE 
} from "./mockData";
import { db, auth, isPlaceholderFirebase, handleFirestoreError, OperationType } from "./firebase";
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

// Local storage key prefixes
const STORAGE_PREFIX = "cc_mvp_";

// Interface for outbox sync operations
interface SyncOperation {
  collection: string;
  docId: string;
  type: "set" | "update" | "delete";
  data?: any;
}

export class DBManager {
  private memoryCache: Record<string, any[]> = {};
  private outbox: SyncOperation[] = [];
  private onStatusChangeCallbacks: (() => void)[] = [];
  private isConnected: boolean = true;

  constructor() {
    this.initLocalStorage();
    this.loadOutbox();
    
    // Add network listeners
    if (typeof window !== "undefined") {
      this.isConnected = window.navigator.onLine;
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
    
    // Listen for Firebase Auth state changes to trigger cloud sync
    if (typeof window !== "undefined" && !isPlaceholderFirebase) {
      auth.onAuthStateChanged((user) => {
        if (user) {
          console.log("Firebase Auth State Change: Authenticated as Uid", user.uid);
          this.syncOutbox();
          this.pullAllDataFromServer();
        } else {
          console.log("Firebase Auth State Change: Not authenticated");
        }
      });
    }
  }

  private initLocalStorage() {
    // If empty, seed everything
    const keys = ["students", "attendance", "assignments", "submissions", "materials", "messages", "surveys", "survey_responses", "reflections", "research_profiles", "peer_feedbacks", "workspace_notes", "feedback_templates", "anonymous_feedback", "automated_backups"];
    
    // Seeds map
    const seeds: Record<string, any[]> = {
      students: SEED_STUDENTS,
      attendance: SEED_ATTENDANCE,
      assignments: SEED_ASSIGNMENTS,
      submissions: SEED_SUBMISSIONS,
      materials: SEED_MATERIALS,
      messages: SEED_MESSAGES,
      surveys: SEED_SURVEYS,
      survey_responses: [],
      reflections: SEED_REFLECTIONS,
      research_profiles: SEED_RESEARCH_PROFILES,
      peer_feedbacks: [],
      workspace_notes: [],
      feedback_templates: [
        {
          id: "mid_sem_default",
          title: "Mid-Semester Course Evaluation (Standard)",
          description: "An anonymous evaluation template designed to gather constructive feedback regarding course pace, lecture structure, and clarity of concepts.",
          questions: [
            {
              id: "fb_q1",
              type: "likert",
              label: "The pace of the lectures in this course is appropriate.",
              options: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]
            },
            {
              id: "fb_q2",
              type: "mcq",
              label: "Which area needs the most immediate adjustment or focus?",
              options: [
                "Lecture Pace & Progression",
                "Clarification of Qualitative Concepts",
                "Thesis & Research Proposal Support",
                "Assignment Instruction Details",
                "No adjustments needed"
              ]
            },
            {
              id: "fb_q3",
              type: "open",
              label: "What constructive suggestions do you have for Dr. Zerihun to improve this course?"
            }
          ],
          createdAt: new Date().toISOString()
        }
      ],
      anonymous_feedback: [
        {
          id: "seed_fb_1",
          templateId: "mid_sem_default",
          answers: {
            "fb_q1": "Agree",
            "fb_q2": "Clarification of Qualitative Concepts",
            "fb_q3": "Dr. Zerihun is amazing. Please provide more examples of qualitative data coding sheets like ATLAS.ti. Otherwise, the pace is perfect!"
          },
          submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "seed_fb_2",
          templateId: "mid_sem_default",
          answers: {
            "fb_q1": "Disagree",
            "fb_q2": "Lecture Pace & Progression",
            "fb_q3": "I feel we are moving some theoretical chapters very fast. Could we slow down slightly and have small break-out sessions?"
          },
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      automated_backups: []
    };

    keys.forEach(key => {
      if (key === "surveys") {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(seeds[key]));
        this.memoryCache[key] = [...seeds[key]];
        return;
      }

      if (key === "materials") {
        // Automatically purge old mock materials from existing browser localStorage if present
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        if (
          !stored || 
          stored.includes("qualitative_inquiry_john_creswell.pdf") || 
          stored.includes("caqdas_atlasti_nvivo_guide.pdf") ||
          stored.includes("lecture_offline_architectures.pdf") ||
          stored.includes("ethio_telecom_pwa_guide.docx")
        ) {
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify([]));
          this.memoryCache[key] = [];
          return;
        }
      }

      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (!stored) {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(seeds[key]));
        this.memoryCache[key] = [...seeds[key]];
      } else {
        try {
          this.memoryCache[key] = JSON.parse(stored);
        } catch (e) {
          console.error("Local storage corruption, re-seeding " + key, e);
          localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(seeds[key]));
          this.memoryCache[key] = [...seeds[key]];
        }
      }
    });
  }

  private saveToLocalStorage(key: string) {
    if (this.memoryCache[key]) {
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(this.memoryCache[key]));
      } catch (e) {
        console.warn(`LocalStorage quota exceeded while saving "${key}". Data is preserved in-memory for this session.`, e);
      }
    }
  }

  private loadOutbox() {
    const stored = localStorage.getItem(STORAGE_PREFIX + "sync_outbox");
    if (stored) {
      try {
        this.outbox = JSON.parse(stored);
      } catch (e) {
        this.outbox = [];
      }
    }
  }

  private saveOutbox() {
    try {
      localStorage.setItem(STORAGE_PREFIX + "sync_outbox", JSON.stringify(this.outbox));
    } catch (e) {
      console.warn("LocalStorage quota exceeded while saving sync outbox. Preserved in memory.", e);
    }
  }

  private handleNetworkChange(online: boolean) {
    this.isConnected = online;
    this.triggerStatusChange();
    if (online) {
      this.syncOutbox();
    }
  }

  public registerStatusListener(callback: () => void) {
    this.onStatusChangeCallbacks.push(callback);
    return () => {
      this.onStatusChangeCallbacks = this.onStatusChangeCallbacks.filter(c => c !== callback);
    };
  }

  private triggerStatusChange() {
    this.onStatusChangeCallbacks.forEach(cb => cb());
  }

  public isOnline(): boolean {
    return this.isConnected;
  }

  public getOutboxCount(): number {
    return this.outbox.length;
  }

  public getOutbox(): SyncOperation[] {
    return [...this.outbox];
  }

  // --- Core CRUD helpers ---
  private addSyncOp(col: string, docId: string, type: "set" | "update" | "delete", data?: any) {
    this.outbox.push({ collection: col, docId, type, data });
    this.saveOutbox();
    this.triggerStatusChange();
    
    if (this.isOnline() && !isPlaceholderFirebase) {
      this.syncOutbox();
    }
  }

  public async syncOutbox() {
    if (isPlaceholderFirebase || !this.isOnline() || this.outbox.length === 0) return;
    
    const currentOps = [...this.outbox];
    this.outbox = [];
    this.saveOutbox();
    this.triggerStatusChange();

    try {
      const batch = writeBatch(db);
      let opCount = 0;

      for (const op of currentOps) {
        const docRef = doc(db, op.collection, op.docId);
        if (op.type === "set" || op.type === "update") {
          batch.set(docRef, op.data, { merge: true });
        } else if (op.type === "delete") {
          batch.delete(docRef);
        }
        opCount++;
        
        // Firestore limits batch writes to 500
        if (opCount >= 400) {
          await batch.commit();
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }
      console.log("Successfully synchronized local outbox with Firestore server databases!");
    } catch (e) {
      console.error("Outbox synchronization failure. Returning ops to outbox", e);
      // Prepend failed operations back to sync
      this.outbox = [...currentOps, ...this.outbox];
      this.saveOutbox();
      this.triggerStatusChange();
    }
  }

  // Synchronizes Firestore down to local cache if connected and verified
  public async pullAllDataFromServer() {
    if (isPlaceholderFirebase || !this.isOnline()) return;
    
    const collections = ["students", "attendance", "assignments", "submissions", "materials", "messages", "surveys", "survey_responses", "reflections", "research_profiles"];
    
    for (const colName of collections) {
      try {
        const querySnapshot = await getDocs(collection(db, colName));
        const list: any[] = [];
        querySnapshot.forEach(doc => {
          list.push({ ...doc.data(), id: doc.id });
        });
        if (list.length > 0) {
          // Merge server data with local cache to preserve offline additions and seed profiles
          const currentLocal = this.memoryCache[colName] || [];
          const merged = [...list];
          currentLocal.forEach((localItem: any) => {
            const exists = merged.some((mItem: any) => mItem.id === localItem.id);
            if (!exists) {
              merged.push(localItem);
            }
          });
          this.memoryCache[colName] = merged;
          this.saveToLocalStorage(colName);
        }
      } catch (e) {
        console.warn(`Could not pull down records for ${colName} from Firebase. Usually caused by credentials or empty schema.`, e);
      }
    }
    this.triggerStatusChange();
  }

  // --- Student Registration & Profiles CRUD ---
  public getStudents(): Student[] {
    let list = this.memoryCache["students"] || [];
    
    // Ensure SEED_STUDENTS are always present and never missing from the local list
    SEED_STUDENTS.forEach(seed => {
      const exists = list.some(s => s.id === seed.id || (s.email && s.email.toLowerCase() === seed.email.toLowerCase()));
      if (!exists) {
        list.push(seed);
      }
    });

    // Cleanse of mock students requested by user (covers existing caches)
    const mockNames = [
      "abebe kebede", 
      "aster tolosa", 
      "aster tolossa", 
      "yonas alemu", 
      "commander abebe kebede", 
      "inspector aster tolossa", 
      "deputy inspector yonas alemu"
    ];
    list = list.filter(s => {
      if (!s || !s.name) return false;
      const normalizedName = s.name.toLowerCase().trim();
      return !mockNames.some(mName => normalizedName.includes(mName) || mName.includes(normalizedName));
    });

    this.memoryCache["students"] = list;
    return list;
  }

  public addStudent(student: Student) {
    const list = this.getStudents();
    this.memoryCache["students"] = [...list.filter(s => s.id !== student.id), student];
    this.saveToLocalStorage("students");
    this.addSyncOp("students", student.id, "set", student);
  }

  public updateStudent(student: Student) {
    this.addStudent(student);
  }

  // --- Attendance Tracking CRUD ---
  public getAttendanceSheets(): Attendance[] {
    return this.memoryCache["attendance"] || [];
  }

  public saveAttendanceSheet(attendance: Attendance) {
    const list = this.getAttendanceSheets();
    this.memoryCache["attendance"] = [...list.filter(a => a.id !== attendance.id), attendance];
    this.saveToLocalStorage("attendance");
    this.addSyncOp("attendance", attendance.id, "set", attendance);
  }

  // --- Assignment Management CRUD ---
  public getAssignments(): Assignment[] {
    return this.memoryCache["assignments"] || [];
  }

  public addAssignment(assignment: Assignment) {
    const list = this.getAssignments();
    this.memoryCache["assignments"] = [...list, assignment];
    this.saveToLocalStorage("assignments");
    this.addSyncOp("assignments", assignment.id, "set", assignment);
  }

  public getSubmissions(): Submission[] {
    return this.memoryCache["submissions"] || [];
  }

  public submitAssignment(submission: Submission) {
    const list = this.getSubmissions();
    this.memoryCache["submissions"] = [...list.filter(s => s.id !== submission.id), submission];
    this.saveToLocalStorage("submissions");
    this.addSyncOp("submissions", submission.id, "set", submission);
  }

  public gradeSubmission(submissionId: string, grade: number, comments: string) {
    const list = this.getSubmissions();
    const updated = list.map(sub => {
      if (sub.id === submissionId) {
        const subData = { ...sub, grade, comments };
        this.addSyncOp("submissions", submissionId, "update", { grade, comments });
        return subData;
      }
      return sub;
    });
    this.memoryCache["submissions"] = updated;
    this.saveToLocalStorage("submissions");
  }

  // --- Course Materials Repository CRUD ---
  public getMaterials(): Material[] {
    return this.memoryCache["materials"] || [];
  }

  public addMaterial(material: Material) {
    const list = this.getMaterials();
    this.memoryCache["materials"] = [...list, material];
    this.saveToLocalStorage("materials");
    this.addSyncOp("materials", material.id, "set", material);
  }

  public deleteMaterial(materialId: string) {
    const list = this.getMaterials();
    this.memoryCache["materials"] = list.filter(m => m.id !== materialId);
    this.saveToLocalStorage("materials");
    this.addSyncOp("materials", materialId, "delete");
  }

  // --- Messaging System CRUD ---
  public getMessages(): Message[] {
    return this.memoryCache["messages"] || [];
  }

  public addMessage(message: Message) {
    const list = this.getMessages();
    this.memoryCache["messages"] = [...list, message];
    this.saveToLocalStorage("messages");
    this.addSyncOp("messages", message.id, "set", message);
  }

  // --- Survey Module CRUD ---
  public getSurveys(): Survey[] {
    return this.memoryCache["surveys"] || [];
  }

  public getSurveyResponses(): SurveyResponse[] {
    return this.memoryCache["survey_responses"] || [];
  }

  public submitSurveyResponse(response: SurveyResponse) {
    const list = this.getSurveyResponses();
    this.memoryCache["survey_responses"] = [...list.filter(r => r.id !== response.id), response];
    this.saveToLocalStorage("survey_responses");
    this.addSyncOp("survey_responses", response.id, "set", response);
  }

  // --- Reflection Journal CRUD ---
  public getReflections(): Reflection[] {
    return this.memoryCache["reflections"] || [];
  }

  public submitReflection(reflection: Reflection) {
    const list = this.getReflections();
    this.memoryCache["reflections"] = [...list.filter(r => r.id !== reflection.id), reflection];
    this.saveToLocalStorage("reflections");
    this.addSyncOp("reflections", reflection.id, "set", reflection);
  }

  public addReflectionFeedback(reflectionId: string, feedback: string) {
    const list = this.getReflections();
    const updated = list.map(ref => {
      if (ref.id === reflectionId) {
        const refData = { ...ref, feedback };
        this.addSyncOp("reflections", reflectionId, "update", { feedback });
        return refData;
      }
      return ref;
    });
    this.memoryCache["reflections"] = updated;
    this.saveToLocalStorage("reflections");
  }

  // --- Research Profile Tracking CRUD ---
  public getResearchProfiles(): ResearchProfile[] {
    return this.memoryCache["research_profiles"] || [];
  }

  public saveResearchProfile(profile: ResearchProfile) {
    const list = this.getResearchProfiles();
    this.memoryCache["research_profiles"] = [...list.filter(p => p.id !== profile.id), profile];
    this.saveToLocalStorage("research_profiles");
    this.addSyncOp("research_profiles", profile.id, "set", profile);
  }

  // --- Peer Feedbacks CRUD ---
  public getPeerFeedbacks(): PeerFeedback[] {
    return this.memoryCache["peer_feedbacks"] || [];
  }

  public addPeerFeedback(feedback: PeerFeedback) {
    const list = this.getPeerFeedbacks();
    this.memoryCache["peer_feedbacks"] = [...list, feedback];
    this.saveToLocalStorage("peer_feedbacks");
    this.addSyncOp("peer_feedbacks", feedback.id, "set", feedback);
  }

  // --- Workspace Notes CRUD ---
  public getWorkspaceNotes(): WorkspaceNote[] {
    return this.memoryCache["workspace_notes"] || [];
  }

  public saveWorkspaceNote(note: WorkspaceNote) {
    const list = this.getWorkspaceNotes();
    this.memoryCache["workspace_notes"] = [...list.filter(n => n.id !== note.id), note];
    this.saveToLocalStorage("workspace_notes");
    this.addSyncOp("workspace_notes", note.id, "set", note);
  }

  // --- Student Feedback & Mid-Semester Evaluation CRUD ---
  public getFeedbackTemplates(): FeedbackTemplate[] {
    return this.memoryCache["feedback_templates"] || [];
  }

  public addFeedbackTemplate(template: FeedbackTemplate) {
    const list = this.getFeedbackTemplates();
    this.memoryCache["feedback_templates"] = [template, ...list.filter(t => t.id !== template.id)];
    this.saveToLocalStorage("feedback_templates");
    this.addSyncOp("feedback_templates", template.id, "set", template);
    this.triggerAutomatedBackup(`Created survey template: ${template.title}`);
  }

  public getAnonymousFeedback(): AnonymousFeedback[] {
    return this.memoryCache["anonymous_feedback"] || [];
  }

  public addAnonymousFeedback(feedback: AnonymousFeedback) {
    const list = this.getAnonymousFeedback();
    this.memoryCache["anonymous_feedback"] = [feedback, ...list];
    this.saveToLocalStorage("anonymous_feedback");
    this.addSyncOp("anonymous_feedback", feedback.id, "set", feedback);
    this.triggerAutomatedBackup("Anonymous student feedback submission");
  }

  // --- Automated Backups CRUD ---
  public getAutomatedBackups(): AutomatedBackup[] {
    return this.memoryCache["automated_backups"] || [];
  }

  public triggerAutomatedBackup(event: string) {
    const backupJson = this.exportBackup();
    const keys = ["students", "attendance", "assignments", "submissions", "materials", "messages", "surveys", "survey_responses", "reflections", "research_profiles", "workspace_notes", "feedback_templates", "anonymous_feedback"];
    
    const recordCounts: Record<string, number> = {};
    keys.forEach(key => {
      recordCounts[key] = (this.memoryCache[key] || []).length;
    });

    const newBackup: AutomatedBackup = {
      id: "auto_bk_" + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      triggerEvent: event,
      dataSize: backupJson.length,
      recordCounts,
      jsonData: backupJson
    };

    const backups = this.getAutomatedBackups();
    // Keep last 15 automated backups to prevent storage saturation
    const trimmed = [newBackup, ...backups].slice(0, 15);
    this.memoryCache["automated_backups"] = trimmed;
    this.saveToLocalStorage("automated_backups");
  }

  // --- Data Backup (Export / Import) ---
  public exportBackup(): string {
    const backupData: Record<string, any[]> = {};
    const keys = ["students", "attendance", "assignments", "submissions", "materials", "messages", "surveys", "survey_responses", "reflections", "research_profiles", "peer_feedbacks", "workspace_notes", "feedback_templates", "anonymous_feedback", "automated_backups"];
    keys.forEach(key => {
      backupData[key] = this.memoryCache[key] || [];
    });
    return JSON.stringify({
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: backupData
    }, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== "object" || !parsed.data) {
        return false;
      }
      const keys = ["students", "attendance", "assignments", "submissions", "materials", "messages", "surveys", "survey_responses", "reflections", "research_profiles", "peer_feedbacks", "workspace_notes", "feedback_templates", "anonymous_feedback", "automated_backups"];
      const backupData = parsed.data;
      
      // Basic validation: must contain array records for students and assignments
      if (!Array.isArray(backupData.students) || !Array.isArray(backupData.assignments)) {
        return false;
      }

      keys.forEach(key => {
        if (Array.isArray(backupData[key])) {
          this.memoryCache[key] = [...backupData[key]];
          this.saveToLocalStorage(key);
        }
      });
      this.triggerStatusChange();
      return true;
    } catch (e) {
      console.error("Backup import failed:", e);
      return false;
    }
  }

  public clearAllDataAndReset() {
    const keys = ["students", "attendance", "assignments", "submissions", "materials", "messages", "surveys", "survey_responses", "reflections", "research_profiles", "sync_outbox", "peer_feedbacks", "workspace_notes", "feedback_templates", "anonymous_feedback", "automated_backups"];
    keys.forEach(key => {
      localStorage.removeItem(STORAGE_PREFIX + key);
    });
    this.memoryCache = {};
    this.outbox = [];
    this.initLocalStorage();
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }
}

export const dbService = new DBManager();

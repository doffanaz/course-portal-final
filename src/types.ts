/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  id: string; // auth uid or custom offline student ID
  name: string;
  gender: "Male" | "Female" | "Other";
  email: string;
  mobile: string;
  institution: string;
  department: string;
  currentPosition: string; // e.g. "Year 1 Undergraduate", "Year 3 Undergraduate", "Graduate"
  previousDegrees: string;
  researchInterests: string;
  courseExpectations: string;
  createdAt: string;
  profilePicture?: string; // Base64 dataURL or avatar url
}

export interface Attendance {
  id: string; // format YYYY-MM-DD
  date: string; // YYYY-MM-DD
  records: Record<string, "present" | "absent" | "late">; // studentId -> status
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  fileName: string;
  fileType: string;
  fileContent: string; // Base64 or serialized text content
  submittedAt: string;
  grade?: number; // 0-100 check scale
  comments?: string; // Teacher feedback notes
  resubmitted?: boolean;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  fileContent: string; // base64 payload to permit download offline
  uploadedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "instructor" | "student";
  recipientId: string; // studentId or "all"
  content: string;
  createdAt: string;
}

export interface Question {
  id: string;
  type: "mcq" | "likert" | "open";
  label: string;
  options?: string[]; // only for mcq or scale categories
}

export interface Survey {
  id: string;
  type: "beginning" | "end";
  title: string;
  questions: Question[];
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string | number>; // questionId -> response value
  submittedAt: string;
}

export interface Reflection {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // date of class session
  content: string; // student reflection entry
  feedback?: string; // teacher review remarks
  createdAt: string;
}

export interface ResearchProfile {
  id: string; // studentId match
  studentId: string;
  studentName: string;
  topic: string;
  interests: string;
  methodology: string;
  currentStage: string; // Dynamic milestone stage representing EPU/EPSU/AAU requirements
  updatedAt: string;
}

export interface PeerFeedback {
  id: string;
  submissionId: string;
  assignmentId: string;
  reviewerStudentId: string;
  reviewerStudentName: string;
  comments: string;
  createdAt: string;
}

export interface WorkspaceNote {
  id: string;
  role: "instructor" | "student";
  studentId?: string; // if student-specific note
  content: string;
  updatedAt: string;
}

export interface FeedbackTemplate {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isCustom?: boolean;
}

export interface AnonymousFeedback {
  id: string;
  templateId: string;
  answers: Record<string, string | number>;
  submittedAt: string;
}

export interface AutomatedBackup {
  id: string;
  timestamp: string;
  triggerEvent: string; // e.g., "feedback_submission", "template_creation", "manual"
  dataSize: number; // size in characters
  recordCounts: Record<string, number>;
  jsonData: string; // complete backup JSON representation
}


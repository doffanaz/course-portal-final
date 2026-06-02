/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Assignment, Material, Survey, Reflection, ResearchProfile, Message, Attendance, Submission } from "../types";

export const SEED_STUDENTS: Student[] = [];

export const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: "assign_1",
    title: "Research Proposal Development",
    description: "Formulate a comprehensive qualitative research proposal highlighting statement of the problem, qualitative research questions, theoretical framework, and proposed analytical software strategies. (Weight: 25%)",
    dueDate: "2026-06-15T23:59:00Z",
    createdAt: "2026-06-01T08:00:00Z"
  },
  {
    id: "assign_2",
    title: "Critical Book/Article Review",
    description: "Critically review two peer-reviewed qualitative research articles in your specific criminological/security domain, focusing specifically on their methodological rigor, credibility criteria, and transparency in computer-assisted qualitative data analysis. (Weight: 20%)",
    dueDate: "2026-06-25T23:59:00Z",
    createdAt: "2026-06-01T08:00:00Z"
  },
  {
    id: "assign_3",
    title: "Seminar on Key Methodological Concepts",
    description: "Prepare and present a detailed seminar slides deck addressing key ontological and epistemological debates in qualitative methodologies (e.g. phenomenology, case study design, thematic analysis versus grounded theory). (Weight: 25%)",
    dueDate: "2026-07-05T23:59:00Z",
    createdAt: "2026-06-01T08:00:00Z"
  },
  {
    id: "assign_4",
    title: "Data Analysis and Report Writing-up Exercise Project",
    description: "Utilize sample qualitative interview transcripts or focus group discussions, perform manual/software coding (using packages such as ATLAS.ti, NVivo, or open-source equivalents), develop hierarchical coding trees, and formulate the final thematic findings report. (Weight: 30%)",
    dueDate: "2026-07-20T23:59:00Z",
    createdAt: "2026-06-01T08:00:00Z"
  }
];

export const SEED_SUBMISSIONS: Submission[] = [];

export const SEED_MATERIALS: Material[] = [];

export const SEED_SURVEYS: Survey[] = [
  {
    id: "survey_b",
    type: "beginning",
    title: "Course Entry: Experience, Software Familiarity & Tech Profiles",
    questions: [
      {
        id: "bq_q1",
        type: "mcq",
        label: "What is your level of prior experience with Qualitative Research Methodology?",
        options: [
          "None (I have only used quantitative designs before)",
          "Basic (Theoretical lessons or standard classroom projects only)",
          "Intermediate (Participated in a qualitative field research / interviews)",
          "Advanced (Have published articles or directed qualitative research designs)"
        ]
      },
      {
        id: "bq_q2",
        type: "mcq",
        label: "What is your current level of experience and knowledge regarding Qualitative Data Analysis Software (QDAS, e.g., NVivo, ATLAS.ti)?",
        options: [
          "No prior knowledge (Never opened or used QDAS before)",
          "Basic understanding (Understand coding concepts but haven't used them in practice)",
          "Intermediate experience (Have imported transcripts and performed simple manual/software coding)",
          "Expert user (Fluent in hierarchical codebook designs, query tree extractions, and modeling)"
        ]
      },
      {
        id: "bq_q3",
        type: "open",
        label: "What are your specific personal and academic expectations about this qualitative research methodology course?"
      },
      {
        id: "bq_q4",
        type: "mcq",
        label: "How would you describe your daily experience with use of and physical access to technology (personal laptops, computers, academic devices)?",
        options: [
          "Extremely limited (I rely wholly on shared computer labs or internet cafes)",
          "Occasional/Shared (Have a shared smartphone or family laptop with limited runtime)",
          "Private access (I own a personal laptop and active smartphone for regular academic work)",
          "Excellent (Own multiple devices and high-spec systems for advanced computation)"
        ]
      },
      {
        id: "bq_q5",
        type: "likert",
        label: "I feel confident in my default digital literacy levels to install standalone PWAs, manage local profiles, and submit assignments online.",
        options: ["Strongly Disagree", "Disagree", "Neutral / Undecided", "Agree", "Strongly Agree"]
      },
      {
        id: "bq_q6",
        type: "mcq",
        label: "How would you rate your default internet connectivity profile and active data package accessibility?",
        options: [
          "Highly stable and fast (Constant 4G/Broadband fiber with high data access)",
          "Intermittent (Frequent telecom dropouts, power outages, or shared connectivity)",
          "Highly restricted (Can only sync/download materials on campus or lab networks)",
          "Extremely poor / Completely off-grid offline environment"
        ]
      }
    ],
    createdAt: "2026-06-01T08:00:00Z"
  },
  {
    id: "survey_e",
    type: "end",
    title: "End-of-Course Comprehensive Evaluation",
    questions: [
      {
        id: "eq_q1",
        type: "likert",
        label: "The installable offline-first standalone app successfully enabled me to complete submissions and track thesis milestones during regional internet dropouts.",
        options: ["Disagree", "Neutral", "Agree", "Strongly Agree"]
      },
      {
        id: "eq_q2",
        type: "mcq",
        label: "How would you rate your improvement in qualitative coding methodology and software-assisted analysis post-course?",
        options: ["Tremendous Growth", "Moderate Improvement", "Slight Growth", "No Visual Progress"]
      },
      {
        id: "eq_q3",
        type: "open",
        label: "Please provide your final suggestions or feedback for Dr. Zerihun on how to optimize this course companion's utility for thesis supervision."
      }
    ],
    createdAt: "2026-06-01T08:00:00Z"
  }
];

export const SEED_REFLECTIONS: Reflection[] = [];

export const SEED_RESEARCH_PROFILES: ResearchProfile[] = [];

export const SEED_MESSAGES: Message[] = [
  {
    id: "msg_1",
    senderId: "instructor_1",
    senderName: "Dr. Zerihun (Instructor)",
    senderRole: "instructor",
    recipientId: "all",
    content: "Welcome EPU class! Please complete your academic registry profile and complete the 'Course Entry Survey' on qualitative software and technology access parameters.",
    createdAt: "2026-06-01T08:05:00Z"
  }
];

export const SEED_ATTENDANCE: Attendance[] = [];

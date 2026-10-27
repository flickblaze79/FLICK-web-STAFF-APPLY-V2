export type UserRole = 'USER' | 'STAFF' | 'MOD' | 'ADMIN' | 'OWNER';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  bannerURL?: string;
  bio?: string;
  role: UserRole;
  createdAt: string;
  lastSignInAt?: string;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspensionDate?: string;
  suspendedBy?: string;
  roleAssignedAt?: string;
  roleAssignedBy?: string;
  providerId?: string;
  notificationsEnabled?: boolean;
}

export type ApplicationStatus = 'Pending' | 'Under Review' | 'Accepted' | 'Rejected';
export type ApplicationQueue = 'Staff Review' | 'Mod Review' | 'Admin Review' | 'Owner Review';
export type ApplicationCategory = 'Developer Apply' | 'Staff Apply' | 'Moderator Apply' | 'Helper Apply';

export const QUESTIONS: Record<ApplicationCategory, string[]> = {
  'Developer Apply': [
    "What is your Discord username?",
    "How old are you?",
    "What is your timezone?",
    "Which country do you live in?",
    "How many years of development experience do you have?",
    "Which programming languages and technologies do you specialize in?",
    "What types of projects have you developed before?",
    "Share links to your portfolio, GitHub, or previous work.",
    "Why do you want to join the FLICK Developer Team?",
    "How much time can you dedicate each week?",
    "Are you comfortable working with a team and following project requirements?"
  ],
  'Staff Apply': [
    "What is your Discord username?",
    "How old are you?",
    "What is your timezone?",
    "Which country do you live in?",
    "Do you have any previous staff experience? If yes, explain your responsibilities.",
    "What was your previous staff role, and on which server did you work?",
    "What are your biggest strengths and weaknesses?",
    "How will you help Flick Staff Apply V2?",
    "Why should we choose you over other applicants?",
    "How many hours per day or week can you be active on the server?",
    "If your friend breaks a server rule, what punishment or action will you take, and why?",
    "If you see a senior staff member breaking the rules and no other senior staff are online, what will you do?",
    "If two users are fighting, how will you handle the situation?",
    "State any three server rules in your own words and explain why they are important.",
    "If a sudden raid happens and you are the only staff member online, what will you do?",
    "Is there anything else you would like to tell us?"
  ],
  'Moderator Apply': [
    "What is your Discord username?",
    "How old are you?",
    "What is your timezone?",
    "Which country do you live in?",
    "What previous moderation or community management experience do you have?",
    "How do you stay calm and impartial during intense member disputes?",
    "How many hours per day or week can you dedicate to moderation duties?",
    "How would you handle a situation involving severe rule violations or harassment?",
    "Are you comfortable conducting ticket reviews and issuing warnings/bans according to policy?",
    "Why do you want to become a Moderator for Flick?",
    "Is there anything else you would like to share with the senior management team?"
  ],
  'Helper Apply': [
    "What is your Discord username?",
    "How old are you?",
    "What is your timezone?",
    "Which country do you live in?",
    "Why do you want to become a Helper on Flick?",
    "How will you assist users with their questions or technical issues?",
    "What are your key strengths when interacting with community members?",
    "How many hours per day or week can you be active on the server?",
    "If you see a user breaking the rules, what action will you take?",
    "If two users are arguing in public chat, how will you de-escalate the situation?",
    "Are you fully familiar with our community rules and guidelines?",
    "Is there anything else you would like to tell us?"
  ]
};

export interface StaffApplication {
  id?: string;
  applicantUid: string;
  applicantName: string;
  applicantEmail: string;
  discordUsername: string;
  discordUserId?: string;
  age: string;
  timezone: string;
  availableHours?: string;
  category: ApplicationCategory;
  position: string;
  answers: Record<string, string>;
  status: ApplicationStatus;
  queue?: ApplicationQueue;
  assignedReviewerUid?: string;
  assignedReviewerName?: string;
  assignmentStatus?: 'Unassigned' | 'Assigned';
  assignedAt?: string;
  reviewerUid?: string;
  reviewerRole?: UserRole | 'SYSTEM';
  reviewNotes?: string;
  decisionAt?: string;
  autoRejected?: boolean;
  autoRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type ReportType = 'Basic Reports' | 'Video Reports' | 'Photo Reports' | 'Other';
export type ReportStatus = 'Open' | 'Reviewing' | 'Under Review' | 'Resolved' | 'Rejected' | 'Dismissed';

export interface UserReport {
  id?: string;
  authorUid: string;
  authorName: string;
  authorEmail: string;
  reportType: ReportType | string;
  subject: string;
  description: string;
  status: ReportStatus;
  evidenceUrl?: string; // Standard attachment (Photo)
  videoLink?: string;   // Video attachment
  contactInfo?: string;
  assignedToUid?: string;
  assignedToName?: string;
  resolutionNotes?: string;
  savedBy?: string[]; // Array of user UIDs who bookmarked / saved this report for later
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id?: string;
  recipientUid: string;
  title: string;
  message: string;
  type: 'application' | 'report' | 'system' | 'role';
  read: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id?: string;
  action: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  actorRole: UserRole;
  targetResource: string;
  targetUid?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemSettings {
  applicationsOpen: boolean;
  categoryToggles: Record<ApplicationCategory, boolean>;
  announcementText: string;
  requirementsText: string;
  positions: string[];
  autoRejectHours: number;
  updatedAt: string;
}

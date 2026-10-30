export type Role = "admin" | "teacher" | "student";
export type View = "overview" | "students" | "interventions" | "insights" | "users" | "settings" | "records" | "resources";
export type Student = {
  id: number; studentId: string; name: string; email: string; course: string; year: number;
  avatarColor: string; engagement: number; quizScore: number; attendance: number;
  lateSubmissions: number; missedAssessments: number; riskScore: number;
  lastActive: string; weeklyActivity: number[]; createdAt: string;
};
export type PortalUser = {
  id: number; name: string; email: string; role: Role; studentId: number | null;
  courses: string[]; notificationsEnabled: boolean; weeklyDigest: boolean; createdAt: string;
};
export type Intervention = {
  id: number; studentId: number; authorId: number; title: string; type: string; notes: string;
  status: "scheduled" | "in_progress" | "completed"; dueDate: string; createdAt: string;
};
export type Workspace = {
  user: PortalUser; students: Student[]; interventions: Intervention[]; users: PortalUser[];
  stats: { total: number; high: number; moderate: number; low: number; active: number; engagement: number };
};
export const COURSES = ["Computer Science", "Business Management", "Psychology", "Data Science", "Engineering", "Social Sciences"];
export function riskLevel(score: number) { return score >= 65 ? "High risk" : score >= 40 ? "Moderate" : "Low risk"; }
export function initials(name: string) { return name.split(" ").map(n => n[0]).slice(0, 2).join(""); }
export function formatDate(value: string) { return new Date(value + (value.length === 10 ? "T12:00:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

import { db } from "@/db";
import { students, users, interventions } from "@/db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { COURSES, type Role, type Workspace } from "./types";
import { predictRisk } from "./risk-model";

const globalState = globalThis as typeof globalThis & { upliftSeed?: Promise<void>; upliftSecret?: string };
const secret = process.env.SESSION_SECRET || (globalState.upliftSecret ??= randomBytes(32).toString("hex"));
export function signUser(id: number) { return `${id}.${createHmac("sha256", secret).update(String(id)).digest("hex")}`; }
export function ensureSeed() {
  if (!globalState.upliftSeed) globalState.upliftSeed = seed().catch(error => { globalState.upliftSeed = undefined; throw error; });
  return globalState.upliftSeed;
}
async function seed() {
  await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(98471235)`);
    const [existing] = await tx.select({ id: users.id }).from(users).limit(1);
    if (existing) return;
    const first = ["Emma", "Liam", "Sophia", "Noah", "Ava", "Ethan", "Isabella", "Oliver", "Mia", "Lucas", "Amelia", "Aiden", "Harper", "Elijah", "Evelyn", "James", "Charlotte", "Henry", "Aria", "Leo", "Grace", "Daniel", "Zara", "Adam"];
    const last = ["Wilson", "Anderson", "Chen", "Williams", "Martinez", "Taylor", "Brown", "Davis", "Robinson", "Thomas", "Patel", "Harris", "Clark", "Lewis", "Walker", "Hall", "Young", "Allen", "King", "Wright", "Scott", "Green", "Baker", "Adams", "Nelson", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts", "Phillips", "Evans", "Turner", "Parker", "Collins", "Edwards", "Stewart", "Morris", "Rogers", "Reed", "Cook", "Morgan", "Bell", "Murphy", "Bailey", "Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres", "Peterson", "Gray", "Ramirez"];
    const colors = ["peach", "sage", "lavender", "blue", "pink", "sand"];
    const rows = Array.from({ length: 1284 }, (_, i) => {
      const high = i < 148, moderate = i >= 148 && i < 360;
      let features = high ? { engagement: 35 + i % 18, quizScore: 45 + i % 18, attendance: 50 + i % 18, lateSubmissions: 4 + i % 2, missedAssessments: 2 } : moderate ? { engagement: 55 + i % 14, quizScore: 58 + i % 17, attendance: 64 + i % 19, lateSubmissions: 1 + i % 2, missedAssessments: 1 } : { engagement: 76 + i % 23, quizScore: 74 + i % 22, attendance: 82 + i % 17, lateSubmissions: 0, missedAssessments: 0 };
      if (i === 0) features = { engagement: 30, quizScore: 48, attendance: 60, lateSubmissions: 4, missedAssessments: 2 };
      const name = i < 24 ? `${first[i]} ${last[i]}` : `${first[i % first.length]} ${last[Math.floor(i / first.length) % last.length]}`;
      const trend = Array.from({ length: 8 }, (_, w) => Math.max(8, Math.min(100, features.engagement + (high ? (7 - w) * 5 : (w - 7) * 3) + ((i + w) % 5 - 2) * 2)));
      return { studentId: `UP-${String(24001 + i)}`, name, email: `${name.toLowerCase().replace(/ /g, ".")}.${i + 1}@student.uplift.edu`, course: COURSES[i % COURSES.length], year: 1 + i % 4, avatarColor: colors[i % colors.length], ...features, riskScore: predictRisk(features), lastActive: new Date(Date.now() - (high ? (i % 6 + 1) * 24 : (i % 20 + 1)) * 3600000), weeklyActivity: trend };
    });
    const inserted: { id: number }[] = [];
    for (let i = 0; i < rows.length; i += 250) inserted.push(...await tx.insert(students).values(rows.slice(i, i + 250)).returning({ id: students.id }));
    const team = await tx.insert(users).values([
      { name: "Sarah Mitchell", email: "sarah@uplift.edu", role: "admin", courses: [] },
      { name: "Daniel Cooper", email: "daniel@uplift.edu", role: "teacher", courses: ["Computer Science", "Data Science"] },
      { name: "Emma Wilson", email: "emma@uplift.edu", role: "student", studentId: inserted[0].id, courses: [] },
      { name: "Rachel Green", email: "rachel@uplift.edu", role: "teacher", courses: ["Psychology", "Social Sciences"] },
      { name: "Alex Morgan", email: "alex@uplift.edu", role: "teacher", courses: ["Business Management", "Engineering"] },
    ]).returning();
    const titles = ["Let's check in", "Build a weekly study plan", "Assignment catch-up session", "Connect with your advisor", "Quiz preparation support", "Review your learning goals"];
    await tx.insert(interventions).values(Array.from({ length: 64 }, (_, i) => ({ studentId: inserted[i < 3 ? 0 : i - 2].id, authorId: team[1 + (i % 2 === 0 ? 0 : 3)].id, title: titles[i % titles.length], type: ["Academic check-in", "Study plan", "Academic support", "Mentoring"][i % 4], notes: ["A friendly conversation about how the semester is going. Together, we'll identify one small next step.", "Set aside three short study sessions this week and catch up on the most recent lecture materials.", "Review outstanding work with your teacher and agree on achievable submission dates."][i % 3], status: i % 3 === 0 ? "in_progress" : "scheduled", dueDate: new Date(Date.now() + (i % 12 + 1) * 86400000).toISOString().slice(0, 10) })));
  });
}
export async function currentUser() {
  await ensureSeed();
  const value = (await cookies()).get("uplift_session")?.value;
  let id: number | undefined;
  if (value) {
    const [rawId, signature] = value.split(".");
    const expected = signUser(Number(rawId)).split(".")[1];
    if (signature && signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) id = Number(rawId);
  }
  const [user] = await db.select().from(users).where(id ? eq(users.id, id) : eq(users.email, "sarah@uplift.edu")).limit(1);
  if (!user) throw new Error("Workspace session not found");
  return user;
}
export async function canAccessStudent(user: Awaited<ReturnType<typeof currentUser>>, id: number) {
  if (user.role === "admin") return true;
  if (user.role === "student") return user.studentId === id;
  const [student] = await db.select({ course: students.course }).from(students).where(eq(students.id, id));
  return !!student && user.courses.includes(student.course);
}
export async function workspace(): Promise<Workspace> {
  const user = await currentUser();
  const scope = user.role === "student" ? eq(students.id, user.studentId ?? -1) : user.role === "teacher" ? inArray(students.course, user.courses) : undefined;
  const roster = await db.select().from(students).where(scope).orderBy(students.id);
  const ids = roster.map(s => s.id);
  const plans = ids.length ? await db.select().from(interventions).where(inArray(interventions.studentId, ids)).orderBy(interventions.dueDate) : [];
  const team = user.role === "admin" ? await db.select().from(users).orderBy(users.id) : await db.select().from(users).where(user.role === "teacher" ? eq(users.id, user.id) : and(eq(users.role, "teacher"), sql`${users.courses} @> '["Computer Science"]'::jsonb`));
  const stats = { total: roster.length, high: roster.filter(s => s.riskScore >= 65).length, moderate: roster.filter(s => s.riskScore >= 40 && s.riskScore < 65).length, low: roster.filter(s => s.riskScore < 40).length, active: plans.filter(p => p.status !== "completed").length, engagement: Math.round(roster.reduce((sum, s) => sum + s.engagement, 0) / Math.max(1, roster.length)) };
  return JSON.parse(JSON.stringify({ user, students: roster, interventions: plans, users: team, stats })) as Workspace;
}
export function isRole(value: unknown): value is Role { return ["admin", "teacher", "student"].includes(String(value)); }
export function apiError(error: unknown) {
  console.error("Uplift API:", error);
  return Response.json({ error: "We couldn't save your changes. Please try again." }, { status: 500 });
}

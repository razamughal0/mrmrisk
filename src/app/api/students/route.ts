import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser, apiError } from "@/lib/server";
import { predictRisk } from "@/lib/risk-model";
import { COURSES } from "@/lib/types";
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (user.role !== "admin") return Response.json({ error: "Only administrators can add students." }, { status: 403 });
    const b = await request.json();
    if (typeof b.name !== "string" || b.name.trim().length < 2 || b.name.length > 120 || typeof b.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) || b.email.length > 180 || !COURSES.includes(b.course)) return Response.json({ error: "Please enter a name, a valid email, and a course." }, { status: 400 });
    const [existing] = await db.select({ id: students.id }).from(students).where(eq(students.email, b.email.toLowerCase()));
    if (existing) return Response.json({ error: "A student with that email already exists." }, { status: 409 });
    const f = { engagement: Number(b.engagement ?? 85), quizScore: Number(b.quizScore ?? 78), attendance: Number(b.attendance ?? 90), lateSubmissions: Number(b.lateSubmissions ?? 0), missedAssessments: Number(b.missedAssessments ?? 0) };
    if ([f.engagement, f.quizScore, f.attendance].some(v => !Number.isInteger(v) || v < 0 || v > 100) || [f.lateSubmissions, f.missedAssessments].some(v => !Number.isInteger(v) || v < 0 || v > 20)) return Response.json({ error: "Scores must be 0–100 and submission counts 0–20." }, { status: 400 });
    const [student] = await db.insert(students).values({ name: b.name.trim(), email: b.email.toLowerCase(), course: b.course, studentId: `UP-${Date.now().toString().slice(-9)}`, year: Number.isInteger(Number(b.year)) && Number(b.year) >= 1 && Number(b.year) <= 4 ? Number(b.year) : 1, avatarColor: "sage", ...f, riskScore: predictRisk(f), lastActive: new Date(), weeklyActivity: Array(8).fill(f.engagement) }).returning();
    return Response.json(student, { status: 201 });
  } catch (error) { return apiError(error); }
}

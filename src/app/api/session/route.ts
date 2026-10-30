import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureSeed, signUser, isRole, apiError } from "@/lib/server";
import { cookies } from "next/headers";
export async function POST(request: Request) {
  try {
    const { role } = await request.json();
    if (!isRole(role)) return Response.json({ error: "Choose a valid workspace role." }, { status: 400 });
    await ensureSeed();
    const emails = { admin: "sarah@uplift.edu", teacher: "daniel@uplift.edu", student: "emma@uplift.edu" };
    const [user] = await db.select().from(users).where(eq(users.email, emails[role]));
    if (!user) return Response.json({ error: "Demo account unavailable." }, { status: 404 });
    (await cookies()).set("uplift_session", signUser(user.id), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && request.url.startsWith("https:"), path: "/", maxAge: 60 * 60 * 24 * 7 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

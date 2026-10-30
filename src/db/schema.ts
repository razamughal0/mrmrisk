import { pgTable, serial, varchar, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  course: varchar("course", { length: 100 }).notNull(),
  year: integer("year").notNull().default(2),
  avatarColor: varchar("avatar_color", { length: 20 }).notNull(),
  engagement: integer("engagement").notNull(),
  quizScore: integer("quiz_score").notNull(),
  attendance: integer("attendance").notNull(),
  lateSubmissions: integer("late_submissions").notNull(),
  missedAssessments: integer("missed_assessments").notNull(),
  riskScore: integer("risk_score").notNull(),
  lastActive: timestamp("last_active", { withTimezone: true }).notNull(),
  weeklyActivity: jsonb("weekly_activity").$type<number[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("portal_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 180 }).notNull().unique(),
  role: varchar("role", { length: 20 }).notNull(),
  studentId: integer("student_id").references(() => students.id),
  courses: jsonb("courses").$type<string[]>().notNull().default([]),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  weeklyDigest: boolean("weekly_digest").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const interventions = pgTable("interventions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => students.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: varchar("title", { length: 180 }).notNull(),
  type: varchar("type", { length: 60 }).notNull(),
  notes: text("notes").notNull(),
  status: varchar("status", { length: 25 }).notNull().default("scheduled"),
  dueDate: varchar("due_date", { length: 12 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

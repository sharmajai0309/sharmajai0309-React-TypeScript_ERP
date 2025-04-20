import { mysqlTable, varchar, int, boolean, datetime, json, text, mysqlEnum, timestamp, index, unique } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table with role-based access
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: varchar("password", { length: 100 }).notNull(),
  firstName: varchar("first_name", { length: 50 }).notNull(),
  lastName: varchar("last_name", { length: 50 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  role: mysqlEnum("role", ["admin", "teacher", "student"]).notNull().default("student"),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Students table
export const students = mysqlTable("students", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id),
  studentId: varchar("student_id", { length: 50 }).notNull().unique(),
  grade: varchar("grade", { length: 20 }).notNull(),
  dateEnrolled: timestamp("date_enrolled").defaultNow().notNull(),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).notNull().default("active"),
  parentName: varchar("parent_name", { length: 100 }),
  parentEmail: varchar("parent_email", { length: 100 }),
  parentPhone: varchar("parent_phone", { length: 20 }),
  address: text("address"),
});

// Courses table
export const courses = mysqlTable("courses", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  teacherId: int("teacher_id").references(() => users.id),
  credits: int("credits").notNull(),
  semester: varchar("semester", { length: 20 }),
  status: mysqlEnum("status", ["active", "inactive", "completed"]).notNull().default("active"),
});

// Enrollments table
export const enrollments = mysqlTable("enrollments", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("student_id").notNull().references(() => students.id),
  courseId: int("course_id").notNull().references(() => courses.id),
  enrollmentDate: timestamp("enrollment_date").defaultNow().notNull(),
  status: mysqlEnum("status", ["enrolled", "dropped", "completed"]).notNull().default("enrolled"),
});

// Assignments table
export const assignments = mysqlTable("assignments", {
  id: int("id").primaryKey().autoincrement(),
  courseId: int("course_id").notNull().references(() => courses.id),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date").notNull(),
  maxScore: int("max_score").notNull().default(100),
  weight: int("weight").notNull().default(1),
  status: mysqlEnum("status", ["draft", "published", "graded"]).notNull().default("draft"),
});

// Submissions table
export const submissions = mysqlTable("submissions", {
  id: int("id").primaryKey().autoincrement(),
  assignmentId: int("assignment_id").notNull().references(() => assignments.id),
  studentId: int("student_id").notNull().references(() => students.id),
  submissionDate: timestamp("submission_date").defaultNow().notNull(),
  content: text("content"),
  score: int("score"),
  feedback: text("feedback"),
  status: mysqlEnum("status", ["submitted", "late", "graded", "not_submitted"]).notNull(),
});

// Grades table
export const grades = mysqlTable("grades", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("student_id").notNull().references(() => students.id),
  courseId: int("course_id").notNull().references(() => courses.id),
  score: int("score").notNull(),
  grade: varchar("grade", { length: 5 }).notNull(),
  semester: varchar("semester", { length: 20 }).notNull(),
  notes: text("notes"),
});

// Attendance table
export const attendance = mysqlTable("attendance", {
  id: int("id").primaryKey().autoincrement(),
  studentId: int("student_id").notNull().references(() => students.id),
  courseId: int("course_id").notNull().references(() => courses.id),
  date: timestamp("date").notNull(),
  status: mysqlEnum("status", ["present", "absent", "late", "excused"]).notNull(),
  notes: text("notes"),
});

// Activities table for system activities
export const activities = mysqlTable("activities", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: json("metadata"),
});

// Schemas for insertions

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  enrollmentDate: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  submissionDate: true,
});

export const insertGradeSchema = createInsertSchema(grades).omit({
  id: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

// Types for database operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;

export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignments.$inferSelect;

export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;

export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof grades.$inferSelect;

export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Type with required fields for login
export type LoginData = Pick<InsertUser, "username" | "password">;

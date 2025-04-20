import { 
  User, InsertUser, Student, InsertStudent, Course, InsertCourse, 
  Enrollment, InsertEnrollment, Assignment, InsertAssignment, 
  Submission, InsertSubmission, Grade, InsertGrade, 
  Attendance, InsertAttendance, Activity, InsertActivity,
  users, students, courses, enrollments, assignments, submissions,
  grades, attendance, activities
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import mysql from "mysql2/promise";

// Initialize MySQL session store
const MySQLStore = require('express-mysql-session')(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    // Create a session store with the MySQL connection
    const options = {
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'sharmajai0309',
      database: 'edumanage'
    };
    
    this.sessionStore = new MySQLStore(options);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const result = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result[0];
  }

  async listUsers(role?: string): Promise<User[]> {
    if (role) {
      return await db.select().from(users).where(eq(users.role, role));
    }
    return await db.select().from(users);
  }

  // Student operations
  async getStudent(id: number): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id));
    return result[0];
  }

  async getStudentByUserId(userId: number): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.userId, userId));
    return result[0];
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(student).returning();
    return result[0];
  }

  async updateStudent(id: number, studentData: Partial<InsertStudent>): Promise<Student | undefined> {
    const result = await db.update(students).set(studentData).where(eq(students.id, id)).returning();
    return result[0];
  }

  async listStudents(status?: string): Promise<Student[]> {
    if (status) {
      return await db.select().from(students).where(eq(students.status, status));
    }
    return await db.select().from(students);
  }

  // Course operations
  async getCourse(id: number): Promise<Course | undefined> {
    const result = await db.select().from(courses).where(eq(courses.id, id));
    return result[0];
  }

  async createCourse(course: InsertCourse): Promise<Course> {
    const result = await db.insert(courses).values(course).returning();
    return result[0];
  }

  async updateCourse(id: number, courseData: Partial<InsertCourse>): Promise<Course | undefined> {
    const result = await db.update(courses).set(courseData).where(eq(courses.id, id)).returning();
    return result[0];
  }

  async listCourses(status?: string): Promise<Course[]> {
    if (status) {
      return await db.select().from(courses).where(eq(courses.status, status));
    }
    return await db.select().from(courses);
  }

  // Enrollment operations
  async getEnrollment(id: number): Promise<Enrollment | undefined> {
    const result = await db.select().from(enrollments).where(eq(enrollments.id, id));
    return result[0];
  }

  async createEnrollment(enrollment: InsertEnrollment): Promise<Enrollment> {
    const result = await db.insert(enrollments).values(enrollment).returning();
    return result[0];
  }

  async updateEnrollment(id: number, enrollmentData: Partial<InsertEnrollment>): Promise<Enrollment | undefined> {
    const result = await db.update(enrollments).set(enrollmentData).where(eq(enrollments.id, id)).returning();
    return result[0];
  }

  async listEnrollmentsByStudent(studentId: number): Promise<Enrollment[]> {
    return await db.select().from(enrollments).where(eq(enrollments.studentId, studentId));
  }

  async listEnrollmentsByCourse(courseId: number): Promise<Enrollment[]> {
    return await db.select().from(enrollments).where(eq(enrollments.courseId, courseId));
  }

  // Assignment operations
  async getAssignment(id: number): Promise<Assignment | undefined> {
    const result = await db.select().from(assignments).where(eq(assignments.id, id));
    return result[0];
  }

  async createAssignment(assignment: InsertAssignment): Promise<Assignment> {
    const result = await db.insert(assignments).values(assignment).returning();
    return result[0];
  }

  async updateAssignment(id: number, assignmentData: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const result = await db.update(assignments).set(assignmentData).where(eq(assignments.id, id)).returning();
    return result[0];
  }

  async listAssignmentsByCourse(courseId: number): Promise<Assignment[]> {
    return await db.select().from(assignments).where(eq(assignments.courseId, courseId));
  }

  // Submission operations
  async getSubmission(id: number): Promise<Submission | undefined> {
    const result = await db.select().from(submissions).where(eq(submissions.id, id));
    return result[0];
  }

  async createSubmission(submission: InsertSubmission): Promise<Submission> {
    const result = await db.insert(submissions).values(submission).returning();
    return result[0];
  }

  async updateSubmission(id: number, submissionData: Partial<InsertSubmission>): Promise<Submission | undefined> {
    const result = await db.update(submissions).set(submissionData).where(eq(submissions.id, id)).returning();
    return result[0];
  }

  async listSubmissionsByAssignment(assignmentId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
  }

  async listSubmissionsByStudent(studentId: number): Promise<Submission[]> {
    return await db.select().from(submissions).where(eq(submissions.studentId, studentId));
  }

  // Grade operations
  async getGrade(id: number): Promise<Grade | undefined> {
    const result = await db.select().from(grades).where(eq(grades.id, id));
    return result[0];
  }

  async createGrade(grade: InsertGrade): Promise<Grade> {
    const result = await db.insert(grades).values(grade).returning();
    return result[0];
  }

  async updateGrade(id: number, gradeData: Partial<InsertGrade>): Promise<Grade | undefined> {
    const result = await db.update(grades).set(gradeData).where(eq(grades.id, id)).returning();
    return result[0];
  }

  async listGradesByStudent(studentId: number): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.studentId, studentId));
  }

  async listGradesByCourse(courseId: number): Promise<Grade[]> {
    return await db.select().from(grades).where(eq(grades.courseId, courseId));
  }

  // Attendance operations
  async getAttendance(id: number): Promise<Attendance | undefined> {
    const result = await db.select().from(attendance).where(eq(attendance.id, id));
    return result[0];
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const result = await db.insert(attendance).values(attendanceData).returning();
    return result[0];
  }

  async updateAttendance(id: number, attendanceData: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const result = await db.update(attendance).set(attendanceData).where(eq(attendance.id, id)).returning();
    return result[0];
  }

  async listAttendanceByStudent(studentId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.studentId, studentId));
  }

  async listAttendanceByCourse(courseId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.courseId, courseId));
  }

  // Activity operations
  async createActivity(activity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(activity).returning();
    return result[0];
  }

  async listRecentActivities(limit = 10): Promise<Activity[]> {
    return await db.select().from(activities).orderBy(desc(activities.timestamp)).limit(limit);
  }
}
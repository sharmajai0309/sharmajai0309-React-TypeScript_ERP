import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertStudentSchema, insertCourseSchema, insertEnrollmentSchema, 
  insertAssignmentSchema, insertSubmissionSchema, insertGradeSchema,
  insertAttendanceSchema, insertUserSchema
} from "@shared/schema";
import { z } from "zod";

// Middleware to check if user is authenticated
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
}

// Middleware to check if user has required role
function hasRole(roles: string[]) {
  return (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as Express.User;
    if (!roles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }
    
    next();
  };
}

// Helper to validate request body against schema
function validateBody<T>(schema: z.ZodType<T>) {
  return (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      next(error);
    }
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Dashboard data route
  app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as Express.User;
      const students = await storage.listStudents();
      const courses = await storage.listCourses("active");
      
      // Calculate attendance percentage
      const attendanceRecords = await storage.listAttendanceByCourse(1); // Just an example
      const totalRecords = attendanceRecords.length;
      const presentRecords = attendanceRecords.filter(a => a.status === "present").length;
      const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
      
      // Get assignments
      const assignments = await storage.listAssignmentsByCourse(1); // Just an example
      const pendingAssignments = assignments.filter(a => a.status === "published").length;
      
      // Get recent activities
      const activities = await storage.listRecentActivities(10);
      
      // Recent students
      const recentStudents = await Promise.all(
        students.slice(0, 5).map(async (student) => {
          const user = await storage.getUser(student.userId);
          return { ...student, user };
        })
      );
      
      return res.json({
        stats: {
          totalStudents: students.length,
          activeCourses: courses.length,
          attendancePercentage,
          pendingAssignments,
        },
        recentStudents,
        activities,
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Users API
  app.get("/api/users", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const users = await storage.listUsers();
      return res.json(users.map(user => ({ ...user, password: undefined })));
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/users", isAuthenticated, hasRole(["admin"]), validateBody(insertUserSchema), async (req, res) => {
    try {
      const hashedPassword = req.body.password; // Password hashing is done in auth.ts during registration
      const user = await storage.createUser(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "USER_CREATED",
        description: `Admin created user ${user.username} with role ${user.role}`,
        metadata: { userId: user.id, role: user.role },
      });
      
      return res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/users/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.json({ ...user, password: undefined });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      // Don't allow password updates through this endpoint
      const { password, ...userData } = req.body;
      
      const updatedUser = await storage.updateUser(parseInt(req.params.id), userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "USER_UPDATED",
        description: `Admin updated user ${updatedUser.username}`,
        metadata: { userId: updatedUser.id, role: updatedUser.role },
      });
      
      return res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Students API
  app.get("/api/students", isAuthenticated, async (req, res) => {
    try {
      const students = await storage.listStudents();
      
      // Enrich with user data
      const enrichedStudents = await Promise.all(
        students.map(async (student) => {
          const user = await storage.getUser(student.userId);
          return { ...student, user: user ? { ...user, password: undefined } : undefined };
        })
      );
      
      return res.json(enrichedStudents);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/students", isAuthenticated, hasRole(["admin"]), validateBody(insertStudentSchema), async (req, res) => {
    try {
      const student = await storage.createStudent(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "STUDENT_CREATED",
        description: `Admin created student record with ID ${student.studentId}`,
        metadata: { studentId: student.id },
      });
      
      return res.status(201).json(student);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const student = await storage.getStudent(parseInt(req.params.id));
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      const user = await storage.getUser(student.userId);
      const enrollments = await storage.listEnrollmentsByStudent(student.id);
      
      // Get courses for each enrollment
      const courses = await Promise.all(
        enrollments.map(async (enrollment) => {
          return await storage.getCourse(enrollment.courseId);
        })
      );
      
      return res.json({
        ...student,
        user: user ? { ...user, password: undefined } : undefined,
        courses: courses.filter(Boolean), // Remove null courses
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/students/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const updatedStudent = await storage.updateStudent(parseInt(req.params.id), req.body);
      if (!updatedStudent) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "STUDENT_UPDATED",
        description: `Admin updated student record with ID ${updatedStudent.studentId}`,
        metadata: { studentId: updatedStudent.id },
      });
      
      return res.json(updatedStudent);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Courses API
  app.get("/api/courses", isAuthenticated, async (req, res) => {
    try {
      const courses = await storage.listCourses();
      
      // Enrich with teacher data
      const enrichedCourses = await Promise.all(
        courses.map(async (course) => {
          const teacher = course.teacherId ? await storage.getUser(course.teacherId) : null;
          return {
            ...course,
            teacher: teacher ? { ...teacher, password: undefined } : null,
          };
        })
      );
      
      return res.json(enrichedCourses);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/courses", isAuthenticated, hasRole(["admin", "teacher"]), validateBody(insertCourseSchema), async (req, res) => {
    try {
      const course = await storage.createCourse(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "COURSE_CREATED",
        description: `Course ${course.name} (${course.code}) created`,
        metadata: { courseId: course.id },
      });
      
      return res.status(201).json(course);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/courses/:id", isAuthenticated, async (req, res) => {
    try {
      const course = await storage.getCourse(parseInt(req.params.id));
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const teacher = course.teacherId ? await storage.getUser(course.teacherId) : null;
      const enrollments = await storage.listEnrollmentsByCourse(course.id);
      
      // Get students for each enrollment
      const students = await Promise.all(
        enrollments.map(async (enrollment) => {
          const student = await storage.getStudent(enrollment.studentId);
          if (!student) return null;
          
          const user = await storage.getUser(student.userId);
          return {
            ...student,
            user: user ? { ...user, password: undefined } : undefined,
            enrollmentStatus: enrollment.status,
          };
        })
      );
      
      return res.json({
        ...course,
        teacher: teacher ? { ...teacher, password: undefined } : null,
        students: students.filter(Boolean), // Remove null students
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/courses/:id", isAuthenticated, hasRole(["admin", "teacher"]), async (req, res) => {
    try {
      const updatedCourse = await storage.updateCourse(parseInt(req.params.id), req.body);
      if (!updatedCourse) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "COURSE_UPDATED",
        description: `Course ${updatedCourse.name} (${updatedCourse.code}) updated`,
        metadata: { courseId: updatedCourse.id },
      });
      
      return res.json(updatedCourse);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Enrollments API
  app.post("/api/enrollments", isAuthenticated, hasRole(["admin"]), validateBody(insertEnrollmentSchema), async (req, res) => {
    try {
      const { studentId, courseId } = req.body;
      
      // Check if student and course exist
      const student = await storage.getStudent(studentId);
      const course = await storage.getCourse(courseId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      // Check if enrollment already exists
      const enrollments = await storage.listEnrollmentsByStudent(studentId);
      const existingEnrollment = enrollments.find(e => e.courseId === courseId);
      
      if (existingEnrollment) {
        return res.status(400).json({ message: "Student is already enrolled in this course" });
      }
      
      const enrollment = await storage.createEnrollment(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "ENROLLMENT_CREATED",
        description: `Student enrolled in course ${course.name} (${course.code})`,
        metadata: { studentId, courseId },
      });
      
      return res.status(201).json(enrollment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/enrollments/:id", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const updatedEnrollment = await storage.updateEnrollment(parseInt(req.params.id), req.body);
      if (!updatedEnrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "ENROLLMENT_UPDATED",
        description: `Enrollment status updated to ${updatedEnrollment.status}`,
        metadata: { enrollmentId: updatedEnrollment.id },
      });
      
      return res.json(updatedEnrollment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Assignments API
  app.get("/api/courses/:courseId/assignments", isAuthenticated, async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const assignments = await storage.listAssignmentsByCourse(courseId);
      return res.json(assignments);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/assignments", isAuthenticated, hasRole(["admin", "teacher"]), validateBody(insertAssignmentSchema), async (req, res) => {
    try {
      const assignment = await storage.createAssignment(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "ASSIGNMENT_CREATED",
        description: `New assignment "${assignment.title}" created`,
        metadata: { assignmentId: assignment.id, courseId: assignment.courseId },
      });
      
      return res.status(201).json(assignment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/assignments/:id", isAuthenticated, async (req, res) => {
    try {
      const assignment = await storage.getAssignment(parseInt(req.params.id));
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      const course = await storage.getCourse(assignment.courseId);
      const submissions = await storage.listSubmissionsByAssignment(assignment.id);
      
      return res.json({
        ...assignment,
        course,
        submissionsCount: submissions.length,
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/assignments/:id", isAuthenticated, hasRole(["admin", "teacher"]), async (req, res) => {
    try {
      const updatedAssignment = await storage.updateAssignment(parseInt(req.params.id), req.body);
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "ASSIGNMENT_UPDATED",
        description: `Assignment "${updatedAssignment.title}" updated`,
        metadata: { assignmentId: updatedAssignment.id },
      });
      
      return res.json(updatedAssignment);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Submissions API
  app.post("/api/submissions", isAuthenticated, validateBody(insertSubmissionSchema), async (req, res) => {
    try {
      const user = req.user as Express.User;
      
      // If student is submitting, ensure they're submitting for themselves
      if (user.role === "student" && user.studentInfo) {
        req.body.studentId = user.studentInfo.id;
      }
      
      const submission = await storage.createSubmission(req.body);
      
      await storage.createActivity({
        userId: user.id,
        activityType: "SUBMISSION_CREATED",
        description: `Assignment submission created`,
        metadata: { submissionId: submission.id, assignmentId: submission.assignmentId },
      });
      
      return res.status(201).json(submission);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/submissions/:id", isAuthenticated, hasRole(["admin", "teacher"]), async (req, res) => {
    try {
      const updatedSubmission = await storage.updateSubmission(parseInt(req.params.id), req.body);
      if (!updatedSubmission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "SUBMISSION_UPDATED",
        description: `Submission ${updatedSubmission.status === "graded" ? "graded" : "updated"}`,
        metadata: { submissionId: updatedSubmission.id },
      });
      
      return res.json(updatedSubmission);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Grades API
  app.get("/api/students/:studentId/grades", isAuthenticated, async (req, res) => {
    try {
      const studentId = parseInt(req.params.studentId);
      const student = await storage.getStudent(studentId);
      
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }
      
      // Check permissions - only admins, teachers, or the student themselves
      const user = req.user as Express.User;
      if (user.role === "student" && (!user.studentInfo || user.studentInfo.id !== studentId)) {
        return res.status(403).json({ message: "Forbidden: you can only view your own grades" });
      }
      
      const grades = await storage.listGradesByStudent(studentId);
      
      // Enrich with course data
      const enrichedGrades = await Promise.all(
        grades.map(async (grade) => {
          const course = await storage.getCourse(grade.courseId);
          return { ...grade, course };
        })
      );
      
      return res.json(enrichedGrades);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/grades", isAuthenticated, hasRole(["admin", "teacher"]), validateBody(insertGradeSchema), async (req, res) => {
    try {
      const grade = await storage.createGrade(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "GRADE_CREATED",
        description: `Grade created for student`,
        metadata: { gradeId: grade.id, studentId: grade.studentId, courseId: grade.courseId },
      });
      
      return res.status(201).json(grade);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/grades/:id", isAuthenticated, hasRole(["admin", "teacher"]), async (req, res) => {
    try {
      const updatedGrade = await storage.updateGrade(parseInt(req.params.id), req.body);
      if (!updatedGrade) {
        return res.status(404).json({ message: "Grade not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "GRADE_UPDATED",
        description: `Grade updated for student`,
        metadata: { gradeId: updatedGrade.id },
      });
      
      return res.json(updatedGrade);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Attendance API
  app.get("/api/courses/:courseId/attendance", isAuthenticated, hasRole(["admin", "teacher"]), async (req, res) => {
    try {
      const courseId = parseInt(req.params.courseId);
      const course = await storage.getCourse(courseId);
      
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }
      
      const attendanceRecords = await storage.listAttendanceByCourse(courseId);
      
      // Get students for statistics
      const enrollments = await storage.listEnrollmentsByCourse(courseId);
      const studentIds = enrollments.map(e => e.studentId);
      
      // Count attendance by date
      const attendanceByDate = attendanceRecords.reduce((acc, record) => {
        const date = record.date.toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { present: 0, absent: 0, late: 0, excused: 0, total: studentIds.length };
        }
        
        if (record.status === "present") acc[date].present++;
        else if (record.status === "absent") acc[date].absent++;
        else if (record.status === "late") acc[date].late++;
        else if (record.status === "excused") acc[date].excused++;
        
        return acc;
      }, {} as Record<string, { present: number, absent: number, late: number, excused: number, total: number }>);
      
      return res.json({
        attendanceRecords,
        statistics: {
          totalStudents: studentIds.length,
          attendanceByDate,
        },
      });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/attendance", isAuthenticated, hasRole(["admin", "teacher"]), validateBody(insertAttendanceSchema), async (req, res) => {
    try {
      const attendance = await storage.createAttendance(req.body);
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "ATTENDANCE_RECORDED",
        description: `Attendance recorded as ${attendance.status}`,
        metadata: { attendanceId: attendance.id, studentId: attendance.studentId, courseId: attendance.courseId },
      });
      
      return res.status(201).json(attendance);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.patch("/api/attendance/:id", isAuthenticated, hasRole(["admin", "teacher"]), async (req, res) => {
    try {
      const updatedAttendance = await storage.updateAttendance(parseInt(req.params.id), req.body);
      if (!updatedAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }
      
      await storage.createActivity({
        userId: (req.user as Express.User).id,
        activityType: "ATTENDANCE_UPDATED",
        description: `Attendance updated to ${updatedAttendance.status}`,
        metadata: { attendanceId: updatedAttendance.id },
      });
      
      return res.json(updatedAttendance);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Activities API
  app.get("/api/activities", isAuthenticated, hasRole(["admin"]), async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const activities = await storage.listRecentActivities(limit);
      
      // Enrich with user data
      const enrichedActivities = await Promise.all(
        activities.map(async (activity) => {
          if (!activity.userId) return activity;
          
          const user = await storage.getUser(activity.userId);
          return {
            ...activity,
            user: user ? { ...user, password: undefined } : undefined,
          };
        })
      );
      
      return res.json(enrichedActivities);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, Student } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {
      studentInfo?: Student;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || 'edu-manage-default-secret';
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        
        // Get student info if the user is a student
        let studentInfo = undefined;
        if (user.role === "student") {
          studentInfo = await storage.getStudentByUserId(user.id);
        }
        
        return done(null, { ...user, studentInfo });
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      
      // Get student info if the user is a student
      let studentInfo = undefined;
      if (user.role === "student") {
        studentInfo = await storage.getStudentByUserId(user.id);
      }
      
      done(null, { ...user, studentInfo });
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const userData = {
        ...req.body,
        password: await hashPassword(req.body.password),
      };
      
      const user = await storage.createUser(userData);
      
      // Create student record if role is student
      let studentInfo = undefined;
      if (user.role === "student") {
        const studentId = `ST${Math.floor(10000 + Math.random() * 90000)}`;
        studentInfo = await storage.createStudent({
          userId: user.id,
          studentId,
          grade: req.body.grade || "Not assigned",
          dateEnrolled: new Date(),
          status: "active",
          parentName: req.body.parentName,
          parentEmail: req.body.parentEmail,
          parentPhone: req.body.parentPhone,
          address: req.body.address,
        });
      }

      // Log activity
      await storage.createActivity({
        userId: user.id,
        activityType: "USER_REGISTERED",
        description: `User ${user.username} registered with role ${user.role}`,
        metadata: { id: user.id, role: user.role },
      });

      req.login({ ...user, studentInfo }, (err) => {
        if (err) return next(err);
        
        return res.status(201).json({ ...user, password: undefined, studentInfo });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error, user: Express.User) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(user, async (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Log activity
        await storage.createActivity({
          userId: user.id,
          activityType: "USER_LOGIN",
          description: `User ${user.username} logged in`,
          metadata: { id: user.id, role: user.role },
        });
        
        return res.status(200).json({ ...user, password: undefined });
      });
    })(req, res, next);
  });

  app.post("/api/logout", async (req, res, next) => {
    if (req.user) {
      const user = req.user as Express.User;
      
      // Log activity
      await storage.createActivity({
        userId: user.id,
        activityType: "USER_LOGOUT",
        description: `User ${user.username} logged out`,
        metadata: { id: user.id, role: user.role },
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    
    const user = req.user as Express.User;
    return res.json({ ...user, password: undefined });
  });
}

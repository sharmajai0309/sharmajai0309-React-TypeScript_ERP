import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "./lib/protected-route";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Students from "@/pages/students";
import Courses from "@/pages/courses";
import Grades from "@/pages/grades";
import Attendance from "@/pages/attendance";
import Assignments from "@/pages/assignments";
import UserManagement from "@/pages/user-management";
import { AuthProvider } from "./hooks/use-auth";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/dashboard" component={Dashboard} /> {/* Added an additional route */}
      <ProtectedRoute path="/students" component={Students} />
      <ProtectedRoute path="/courses" component={Courses} />
      <ProtectedRoute path="/grades" component={Grades} />
      <ProtectedRoute path="/attendance" component={Attendance} />
      <ProtectedRoute path="/assignments" component={Assignments} />
      <ProtectedRoute path="/users" component={UserManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <AuthProvider>
        <Router />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;

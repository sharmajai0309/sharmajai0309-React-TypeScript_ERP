import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, Users, GraduationCap, Award, 
  Calendar, FileText, Settings, LogOut, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  collapsed = false, 
  onToggle, 
  mobile = false,
  onCloseMobile
}: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const getLinkClasses = (path: string) => {
    const isActive = location === path;
    
    return cn(
      "flex items-center px-4 py-2 rounded-md transition-colors", 
      isActive 
        ? "text-white bg-primary hover:bg-primary-light" 
        : "text-neutral-300 hover:bg-sidebar-accent/10 hover:text-white"
    );
  };
  
  const adminLinks = [
    { path: "/", icon: <LayoutDashboard className="h-5 w-5 mr-3" />, label: "Dashboard" },
    { path: "/students", icon: <Users className="h-5 w-5 mr-3" />, label: "Students" },
    { path: "/courses", icon: <GraduationCap className="h-5 w-5 mr-3" />, label: "Courses" },
    { path: "/grades", icon: <Award className="h-5 w-5 mr-3" />, label: "Grades" },
    { path: "/attendance", icon: <Calendar className="h-5 w-5 mr-3" />, label: "Attendance" },
    { path: "/assignments", icon: <FileText className="h-5 w-5 mr-3" />, label: "Assignments" },
    { path: "/users", icon: <ShieldCheck className="h-5 w-5 mr-3" />, label: "User Management" },
  ];
  
  const teacherLinks = [
    { path: "/", icon: <LayoutDashboard className="h-5 w-5 mr-3" />, label: "Dashboard" },
    { path: "/students", icon: <Users className="h-5 w-5 mr-3" />, label: "Students" },
    { path: "/courses", icon: <GraduationCap className="h-5 w-5 mr-3" />, label: "Courses" },
    { path: "/grades", icon: <Award className="h-5 w-5 mr-3" />, label: "Grades" },
    { path: "/attendance", icon: <Calendar className="h-5 w-5 mr-3" />, label: "Attendance" },
    { path: "/assignments", icon: <FileText className="h-5 w-5 mr-3" />, label: "Assignments" },
  ];
  
  const studentLinks = [
    { path: "/", icon: <LayoutDashboard className="h-5 w-5 mr-3" />, label: "Dashboard" },
    { path: "/courses", icon: <GraduationCap className="h-5 w-5 mr-3" />, label: "My Courses" },
    { path: "/grades", icon: <Award className="h-5 w-5 mr-3" />, label: "My Grades" },
    { path: "/attendance", icon: <Calendar className="h-5 w-5 mr-3" />, label: "My Attendance" },
    { path: "/assignments", icon: <FileText className="h-5 w-5 mr-3" />, label: "My Assignments" },
  ];
  
  const links = isAdmin ? adminLinks : isTeacher ? teacherLinks : studentLinks;
  
  return (
    <div className={cn(
      "bg-sidebar h-full flex flex-col text-sidebar-foreground",
      collapsed ? "w-16" : "w-64",
      "transition-all duration-300 ease-in-out"
    )}>
      <div className="p-4 flex items-center border-b border-sidebar-border">
        <div className="bg-primary/20 rounded-full p-2 flex-shrink-0">
          <GraduationCap className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && <h1 className="ml-3 text-xl font-medium truncate">EduManage</h1>}
        
        {mobile && (
          <button 
            onClick={onCloseMobile} 
            className="ml-auto text-sidebar-foreground p-1 hover:bg-sidebar-accent/10 rounded-full"
          >
            <span className="sr-only">Close sidebar</span>
            &times;
          </button>
        )}
      </div>
      
      <div className="py-4 flex-1 overflow-y-auto">
        <p className="px-4 text-xs text-neutral-400 uppercase font-medium mb-2">
          {collapsed ? '' : isStudent ? 'Student Portal' : 'Administration'}
        </p>
        
        <nav className="space-y-1 px-2">
          {links.map((link) => (
            <Link
              key={link.path}
              href={link.path}
              className={getLinkClasses(link.path)}
              onClick={mobile ? onCloseMobile : undefined}
            >
              {link.icon}
              {!collapsed && <span>{link.label}</span>}
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <div className="flex items-center px-2">
          {!collapsed ? (
            <>
              <Link href="/settings" className="flex items-center text-neutral-300 hover:text-white transition-colors">
                <Settings className="h-5 w-5 mr-3" />
                <span>Settings</span>
              </Link>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-auto text-neutral-300 hover:text-white hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center w-full space-y-2">
              <Button variant="ghost" size="icon" className="text-neutral-300 hover:text-white">
                <Settings className="h-5 w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-neutral-300 hover:text-white hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

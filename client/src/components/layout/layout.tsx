import { useState, useEffect, ReactNode } from "react";
import Sidebar from "./sidebar";
import Header from "./header";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";

interface LayoutProps {
  children: ReactNode;
  title: string;
  breadcrumbs?: { label: string; path?: string }[];
}

export default function Layout({ children, title, breadcrumbs = [] }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useMobile();
  
  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileSidebarOpen(false);
    }
  }, [isMobile]);

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <div className={`hidden md:block transition-all duration-300 ease-in-out z-10 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      {/* Mobile Sidebar (Overlay) */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-20 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile Sidebar (Content) */}
      <div className={`fixed inset-y-0 left-0 z-30 md:hidden transform ${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          mobile={true} 
          onCloseMobile={closeMobileSidebar}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onToggleSidebar={toggleSidebar} 
          title={title}
          breadcrumbs={breadcrumbs}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-neutral-100">
          <div className="page-transition">
            {!isMobile && (
              <h1 className="text-2xl font-medium text-neutral-800 mb-6">{title}</h1>
            )}
            {children}
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white py-4 px-6 border-t border-neutral-200 text-center text-neutral-500 text-sm">
          <p>&copy; {new Date().getFullYear()} EduManage School Management System. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

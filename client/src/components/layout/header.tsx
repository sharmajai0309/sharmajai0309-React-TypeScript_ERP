import { useAuth } from "@/hooks/use-auth";
import { Bell, Menu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  breadcrumbs?: { label: string; path?: string }[];
}

export default function Header({ onToggleSidebar, title, breadcrumbs = [] }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    
    return user?.username?.[0]?.toUpperCase() || '?';
  };
  
  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm py-2 px-4 flex justify-between items-center h-16 flex-shrink-0">
      <div className="flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-neutral-600 hover:bg-neutral-100"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        
        <div className="hidden md:flex items-center">
          <ol className="flex text-sm">
            <li className="flex items-center">
              <Link href="/" className="text-primary hover:text-primary-dark">
                Dashboard
              </Link>
              {breadcrumbs.length > 0 && (
                <ChevronDown className="h-4 w-4 text-neutral-400 mx-1 rotate-270" />
              )}
            </li>
            
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {crumb.path ? (
                  <Link href={crumb.path} className="text-primary hover:text-primary-dark">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-neutral-600">{crumb.label}</span>
                )}
                
                {index < breadcrumbs.length - 1 && (
                  <ChevronDown className="h-4 w-4 text-neutral-400 mx-1 rotate-270" />
                )}
              </li>
            ))}
          </ol>
        </div>
        
        <h1 className="text-lg font-medium text-neutral-800 ml-4 md:hidden">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full"></span>
          </Button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center text-sm focus:outline-none hover:bg-neutral-100 transition-colors py-1 px-2">
              <Avatar className="w-8 h-8 mr-2 border-2 border-neutral-200">
                <AvatarImage src={user?.avatarUrl || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="ml-1 hidden sm:block font-medium">
                {user?.firstName || user?.username || "User"}
              </span>
              <ChevronDown className="h-4 w-4 ml-1 text-neutral-500" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                Settings
              </Link>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

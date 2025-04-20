import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Layout from "@/components/layout/layout";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, X, Filter, Plus, UserCog, UserCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Define the form schema for the user form
const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "teacher", "student"], {
    required_error: "Please select a role",
  }),
  avatarUrl: z.string().optional(),
});

export default function UserManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Redirect if not admin
  if (user?.role !== "admin") {
    return (
      <Layout title="Access Denied">
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <UserCog className="h-16 w-16 text-neutral-400 mb-4" />
          <h2 className="text-xl font-medium text-neutral-800 mb-2">Access Denied</h2>
          <p className="text-neutral-600 text-center max-w-md">
            You don't have permission to access the user management section.
            This area is restricted to administrators only.
          </p>
        </div>
      </Layout>
    );
  }
  
  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Form setup
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "student",
      avatarUrl: "",
    },
  });
  
  // Create or update user mutation
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof userSchema>) => {
      // If editing and password is empty, remove it from the payload
      if (selectedUser && (!values.password || values.password.trim() === "")) {
        const { password, ...restValues } = values;
        const res = await apiRequest("PATCH", `/api/users/${selectedUser.id}`, restValues);
        return await res.json();
      } else {
        // For new users or when password is provided
        const res = selectedUser
          ? await apiRequest("PATCH", `/api/users/${selectedUser.id}`, values)
          : await apiRequest("POST", "/api/users", values);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: selectedUser ? "User Updated" : "User Created",
        description: selectedUser 
          ? "The user has been updated successfully." 
          : "A new user has been created successfully.",
      });
      setIsFormOpen(false);
      setSelectedUser(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save user data",
        variant: "destructive",
      });
    },
  });
  
  const handleOpenForm = (user: User | null = null) => {
    if (user) {
      form.reset({
        username: user.username,
        password: "", // Don't populate password for existing users
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role as "admin" | "teacher" | "student",
        avatarUrl: user.avatarUrl || "",
      });
      setSelectedUser(user);
    } else {
      form.reset({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "student",
        avatarUrl: "",
      });
      setSelectedUser(null);
    }
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedUser(null);
    form.reset();
  };
  
  const onSubmit = (values: z.infer<typeof userSchema>) => {
    mutation.mutate(values);
  };
  
  // Filter users based on search query, role filter, and active tab
  const filteredUsers = users?.filter((user: User) => {
    const matchesSearch = searchQuery
      ? (user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
         user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesRole = roleFilter
      ? user.role === roleFilter
      : true;
      
    const matchesTab = activeTab !== "all"
      ? user.role === activeTab
      : true;
      
    return matchesSearch && matchesRole && matchesTab;
  }) || [];
  
  // Get initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0]}${lastName[0]}`;
  };
  
  // Get role badge color
  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "teacher":
        return "bg-blue-100 text-blue-800";
      case "student":
        return "bg-green-100 text-green-800";
      default:
        return "bg-neutral-100 text-neutral-800";
    }
  };
  
  // Columns for the users table
  const userColumns = [
    {
      header: "User",
      accessor: (row: User) => (
        <div className="flex items-center">
          <Avatar className="w-8 h-8 mr-3">
            <AvatarImage src={row.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(row.firstName, row.lastName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-neutral-500">@{row.username}</p>
          </div>
        </div>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Email",
      accessor: (row: User) => <span className="text-sm">{row.email}</span>,
      className: "py-3 px-4",
    },
    {
      header: "Role",
      accessor: (row: User) => (
        <Badge 
          className={getRoleBadgeClass(row.role)}
          variant="outline"
        >
          {row.role.charAt(0).toUpperCase() + row.role.slice(1)}
        </Badge>
      ),
      className: "py-3 px-4 w-28",
    },
    {
      header: "Created",
      accessor: (row: User) => (
        <span className="text-sm text-neutral-500">
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
      className: "py-3 px-4",
    },
  ];
  
  const userActions = [
    { 
      label: "Edit User", 
      onClick: (row: User) => {
        handleOpenForm(row);
      }
    },
    { 
      label: "View Profile", 
      onClick: (row: User) => {
        // Navigate to user profile
        window.location.href = `/users/${row.id}`;
      }
    },
  ];
  
  const userCount = users?.length || 0;
  const adminCount = users?.filter((user: User) => user.role === "admin").length || 0;
  const teacherCount = users?.filter((user: User) => user.role === "teacher").length || 0;
  const studentCount = users?.filter((user: User) => user.role === "student").length || 0;
  
  return (
    <Layout 
      title="User Management" 
      breadcrumbs={[{ label: "User Management" }]}
    >
      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 lg:w-1/3">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-neutral-800 mb-2">User Overview</h2>
            <p className="text-sm text-neutral-600">
              Manage all user accounts in the system. Create, edit, and view detailed information.
            </p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-neutral-100 rounded-full p-2 mr-3">
                  <UserCircle className="h-5 w-5 text-neutral-600" />
                </div>
                <span className="text-sm text-neutral-600">Total Users</span>
              </div>
              <span className="text-xl font-medium">{userCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-red-50 rounded-full p-2 mr-3">
                  <UserCog className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-sm text-neutral-600">Administrators</span>
              </div>
              <span className="text-xl font-medium">{adminCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-50 rounded-full p-2 mr-3">
                  <UserCircle className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm text-neutral-600">Teachers</span>
              </div>
              <span className="text-xl font-medium">{teacherCount}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-green-50 rounded-full p-2 mr-3">
                  <UserCircle className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm text-neutral-600">Students</span>
              </div>
              <span className="text-xl font-medium">{studentCount}</span>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <Button className="w-full" onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add New User
          </Button>
        </div>
        
        <div className="lg:w-2/3">
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Select
                value={roleFilter || ""}
                onValueChange={(value) => setRoleFilter(value || null)}
              >
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>{roleFilter ? roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1) + "s" : "Filter by Role"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="admin">Administrators</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="student">Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="admin">Admins</TabsTrigger>
                <TabsTrigger value="teacher">Teachers</TabsTrigger>
                <TabsTrigger value="student">Students</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <DataTable
                    data={filteredUsers}
                    columns={userColumns}
                    actions={userActions}
                    keyField="id"
                    emptyState={
                      <div className="text-center py-8">
                        <p className="text-lg font-medium text-neutral-600 mb-2">No users found</p>
                        <p className="text-neutral-500 mb-4">
                          {searchQuery || roleFilter
                            ? "Try adjusting your search or filters"
                            : "Get started by adding your first user"}
                        </p>
                        <Button onClick={() => handleOpenForm()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      </div>
                    }
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* User Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {selectedUser 
                ? "Update the user's details." 
                : "Fill in the details to create a new user."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem className={selectedUser ? "col-span-2" : ""}>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter username" 
                          {...field} 
                          disabled={!!selectedUser} // Disable editing username for existing users
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {!selectedUser && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {selectedUser && (
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Password (leave blank to keep unchanged)</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter new password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="user@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="teacher">Teacher</SelectItem>
                          <SelectItem value="admin">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar URL (optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://example.com/avatar.jpg" 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : selectedUser ? "Update User" : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

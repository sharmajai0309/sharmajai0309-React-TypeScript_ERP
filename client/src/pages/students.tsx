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
  DialogTrigger,
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Student, InsertStudent } from "@shared/schema";
import { Plus, Search, X, ChevronDown, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the form schema for the student form
const studentSchema = z.object({
  userId: z.number(),
  studentId: z.string().min(3, "Student ID must be at least 3 characters"),
  grade: z.string().min(1, "Grade is required"),
  status: z.enum(["active", "inactive", "pending"]),
  parentName: z.string().optional(),
  parentEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  parentPhone: z.string().optional(),
  address: z.string().optional(),
});

export default function Students() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  
  // Fetch students
  const { data: students, isLoading } = useQuery({
    queryKey: ["/api/students"],
  });
  
  // Fetch users for dropdown (if admin)
  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAdmin,
  });
  
  // Form setup
  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      userId: 0,
      studentId: "",
      grade: "",
      status: "active",
      parentName: "",
      parentEmail: "",
      parentPhone: "",
      address: "",
    },
  });
  
  // Create or update student mutation
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof studentSchema>) => {
      if (selectedStudent) {
        const res = await apiRequest("PATCH", `/api/students/${selectedStudent.id}`, values);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/students", values);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      toast({
        title: selectedStudent ? "Student Updated" : "Student Created",
        description: selectedStudent 
          ? "The student record has been updated successfully." 
          : "A new student record has been created successfully.",
      });
      setIsFormOpen(false);
      setSelectedStudent(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save student data",
        variant: "destructive",
      });
    },
  });
  
  const handleOpenForm = (student: Student | null = null) => {
    if (student) {
      form.reset({
        userId: student.userId,
        studentId: student.studentId,
        grade: student.grade,
        status: student.status as "active" | "inactive" | "pending",
        parentName: student.parentName || "",
        parentEmail: student.parentEmail || "",
        parentPhone: student.parentPhone || "",
        address: student.address || "",
      });
      setSelectedStudent(student);
    } else {
      form.reset({
        userId: 0,
        studentId: "",
        grade: "",
        status: "active",
        parentName: "",
        parentEmail: "",
        parentPhone: "",
        address: "",
      });
      setSelectedStudent(null);
    }
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedStudent(null);
    form.reset();
  };
  
  const onSubmit = (values: z.infer<typeof studentSchema>) => {
    mutation.mutate(values);
  };
  
  // Filter students based on search query and status filter
  const filteredStudents = students?.filter((student: any) => {
    const matchesSearch = searchQuery
      ? (student.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         student.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
         student.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesStatus = statusFilter
      ? student.status === statusFilter
      : true;
      
    return matchesSearch && matchesStatus;
  }) || [];
  
  // Columns for the students table
  const studentColumns = [
    {
      header: "Student ID",
      accessor: (row: any) => <span className="text-sm">{row.studentId}</span>,
      className: "py-3 px-4",
    },
    {
      header: "Name",
      accessor: (row: any) => (
        <div className="flex items-center">
          <Avatar className="w-8 h-8 mr-3">
            <AvatarImage src={row.user?.avatarUrl || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {row.user?.firstName?.[0]}{row.user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{row.user?.firstName} {row.user?.lastName}</p>
            <p className="text-xs text-neutral-500">{row.user?.email}</p>
          </div>
        </div>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Grade",
      accessor: (row: any) => <span className="text-sm">{row.grade}</span>,
      className: "py-3 px-4",
    },
    {
      header: "Date Enrolled",
      accessor: (row: any) => (
        <span className="text-sm">
          {new Date(row.dateEnrolled).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const statusStyles = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-neutral-100 text-neutral-800",
          pending: "bg-yellow-100 text-yellow-800",
        };
        return (
          <Badge 
            className={
              statusStyles[row.status as keyof typeof statusStyles] || 
              statusStyles.active
            }
            variant="outline"
          >
            {row.status}
          </Badge>
        );
      },
      className: "py-3 px-4",
    },
    {
      header: "Parent",
      accessor: (row: any) => (
        <div>
          <p className="text-sm">{row.parentName || "—"}</p>
          {row.parentEmail && (
            <p className="text-xs text-neutral-500">{row.parentEmail}</p>
          )}
        </div>
      ),
      className: "py-3 px-4",
    },
  ];
  
  const studentActions = [
    { 
      label: "View Details", 
      onClick: (row: any) => {
        window.location.href = `/students/${row.id}`;
      }
    },
    { 
      label: "Edit", 
      onClick: (row: any) => {
        handleOpenForm(row);
      },
      disabled: !isAdmin
    },
  ];
  
  return (
    <Layout 
      title="Students" 
      breadcrumbs={[{ label: "Students" }]}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
          <Input
            placeholder="Search students..."
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
        
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter || ""}
            onValueChange={(value) => setStatusFilter(value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>{statusFilter || "Filter by Status"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
          
          {isAdmin && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          )}
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-80 w-full" />
          </div>
        ) : (
          <DataTable
            data={filteredStudents}
            columns={studentColumns}
            actions={studentActions}
            keyField="id"
            emptyState={
              <div className="text-center py-8">
                <p className="text-lg font-medium text-neutral-600 mb-2">No students found</p>
                <p className="text-neutral-500 mb-4">
                  {searchQuery || statusFilter 
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first student"}
                </p>
                {isAdmin && (
                  <Button onClick={() => handleOpenForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>
      
      {/* Student Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
            <DialogDescription>
              {selectedStudent 
                ? "Update the details for this student." 
                : "Fill in the details to register a new student."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>User Account</FormLabel>
                      <Select
                        disabled={!!selectedStudent || users === undefined}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.filter((u: any) => u.role === "student").map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.firstName} {user.lastName} ({user.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student ID</FormLabel>
                      <FormControl>
                        <Input placeholder="ST12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade/Class</FormLabel>
                      <FormControl>
                        <Input placeholder="10th Grade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentName"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Parent/Guardian Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="parent@example.com"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="parentPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parent Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(123) 456-7890"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123 Main St, City, State, ZIP"
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
                  {mutation.isPending ? "Saving..." : "Save Student"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

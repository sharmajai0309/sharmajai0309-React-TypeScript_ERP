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
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Course } from "@shared/schema";
import { Plus, Search, X, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the form schema for the course form
const courseSchema = z.object({
  code: z.string().min(2, "Course code must be at least 2 characters"),
  name: z.string().min(3, "Course name must be at least 3 characters"),
  description: z.string().optional(),
  teacherId: z.number().nullable(),
  credits: z.number().min(1, "Credits must be at least 1"),
  semester: z.string().optional(),
  status: z.enum(["active", "inactive", "completed"]),
});

export default function Courses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  
  // Fetch courses
  const { data: courses, isLoading } = useQuery({
    queryKey: ["/api/courses"],
  });
  
  // Fetch teachers for dropdown
  const { data: teachers } = useQuery({
    queryKey: ["/api/users"],
    select: (data) => data.filter((user: any) => user.role === "teacher"),
    enabled: isAdmin || isTeacher,
  });
  
  // Form setup
  const form = useForm<z.infer<typeof courseSchema>>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      teacherId: null,
      credits: 3,
      semester: "",
      status: "active",
    },
  });
  
  // Create or update course mutation
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof courseSchema>) => {
      if (selectedCourse) {
        const res = await apiRequest("PATCH", `/api/courses/${selectedCourse.id}`, values);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/courses", values);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({
        title: selectedCourse ? "Course Updated" : "Course Created",
        description: selectedCourse 
          ? "The course has been updated successfully." 
          : "A new course has been created successfully.",
      });
      setIsFormOpen(false);
      setSelectedCourse(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save course data",
        variant: "destructive",
      });
    },
  });
  
  const handleOpenForm = (course: Course | null = null) => {
    if (course) {
      form.reset({
        code: course.code,
        name: course.name,
        description: course.description || "",
        teacherId: course.teacherId,
        credits: course.credits,
        semester: course.semester || "",
        status: course.status as "active" | "inactive" | "completed",
      });
      setSelectedCourse(course);
    } else {
      form.reset({
        code: "",
        name: "",
        description: "",
        teacherId: null,
        credits: 3,
        semester: "",
        status: "active",
      });
      setSelectedCourse(null);
    }
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCourse(null);
    form.reset();
  };
  
  const onSubmit = (values: z.infer<typeof courseSchema>) => {
    mutation.mutate(values);
  };
  
  // Filter courses based on search query and status filter
  const filteredCourses = courses?.filter((course: any) => {
    const matchesSearch = searchQuery
      ? (course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
         course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         course.teacher?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         course.teacher?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesStatus = statusFilter
      ? course.status === statusFilter
      : true;
      
    return matchesSearch && matchesStatus;
  }) || [];
  
  // Columns for the courses table
  const courseColumns = [
    {
      header: "Code",
      accessor: (row: any) => <span className="text-sm font-medium">{row.code}</span>,
      className: "py-3 px-4 w-24",
    },
    {
      header: "Course Name",
      accessor: (row: any) => (
        <div>
          <p className="text-sm font-medium">{row.name}</p>
          {row.description && (
            <p className="text-xs text-neutral-500 truncate max-w-md">{row.description}</p>
          )}
        </div>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Instructor",
      accessor: (row: any) => (
        row.teacher ? (
          <div className="flex items-center">
            <Avatar className="w-8 h-8 mr-2">
              <AvatarImage src={row.teacher?.avatarUrl || ""} />
              <AvatarFallback className="bg-secondary/10 text-secondary">
                {row.teacher?.firstName?.[0]}{row.teacher?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.teacher?.firstName} {row.teacher?.lastName}</span>
          </div>
        ) : (
          <span className="text-sm text-neutral-500">Not assigned</span>
        )
      ),
      className: "py-3 px-4",
    },
    {
      header: "Credits",
      accessor: (row: any) => <span className="text-sm">{row.credits}</span>,
      className: "py-3 px-4 w-20 text-center",
    },
    {
      header: "Semester",
      accessor: (row: any) => (
        <span className="text-sm">{row.semester || "—"}</span>
      ),
      className: "py-3 px-4 w-32",
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const statusStyles = {
          active: "bg-green-100 text-green-800",
          inactive: "bg-neutral-100 text-neutral-800",
          completed: "bg-blue-100 text-blue-800",
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
      className: "py-3 px-4 w-28",
    },
  ];
  
  const courseActions = [
    { 
      label: "View Details", 
      onClick: (row: any) => {
        window.location.href = `/courses/${row.id}`;
      }
    },
    { 
      label: "Edit", 
      onClick: (row: any) => {
        handleOpenForm(row);
      },
      disabled: !isAdmin && (!isTeacher || user?.id !== row.teacherId)
    },
  ];
  
  if (isAdmin || isTeacher) {
    courseActions.push({
      label: "Manage Students",
      onClick: (row: any) => {
        window.location.href = `/courses/${row.id}/students`;
      }
    });
    
    courseActions.push({
      label: "Manage Assignments",
      onClick: (row: any) => {
        window.location.href = `/courses/${row.id}/assignments`;
      }
    });
  }
  
  if (isStudent) {
    courseActions.push({
      label: "View Assignments",
      onClick: (row: any) => {
        window.location.href = `/courses/${row.id}/assignments`;
      }
    });
  }
  
  return (
    <Layout 
      title="Courses" 
      breadcrumbs={[{ label: "Courses" }]}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
          <Input
            placeholder="Search courses..."
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
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          {(isAdmin || isTeacher) && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Course
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
            data={filteredCourses}
            columns={courseColumns}
            actions={courseActions}
            keyField="id"
            emptyState={
              <div className="text-center py-8">
                <p className="text-lg font-medium text-neutral-600 mb-2">No courses found</p>
                <p className="text-neutral-500 mb-4">
                  {searchQuery || statusFilter 
                    ? "Try adjusting your search or filters"
                    : "Get started by adding your first course"}
                </p>
                {(isAdmin || isTeacher) && (
                  <Button onClick={() => handleOpenForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Course
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>
      
      {/* Course Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedCourse ? "Edit Course" : "Add New Course"}</DialogTitle>
            <DialogDescription>
              {selectedCourse 
                ? "Update the details for this course." 
                : "Fill in the details to create a new course."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Code</FormLabel>
                      <FormControl>
                        <Input placeholder="CS101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Introduction to Computer Science" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credits</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <FormControl>
                        <Input placeholder="Fall 2023" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="teacherId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructor</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an instructor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {teachers?.map((teacher: any) => (
                            <SelectItem key={teacher.id} value={teacher.id.toString()}>
                              {teacher.firstName} {teacher.lastName}
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
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Course description"
                          className="resize-none"
                          rows={4}
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
                  {mutation.isPending ? "Saving..." : "Save Course"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

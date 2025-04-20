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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Assignment } from "@shared/schema";
import { CalendarIcon, Filter, Plus, Search, X, FileText, Clock, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the form schema for the assignment form
const assignmentSchema = z.object({
  courseId: z.number(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  dueDate: z.date(),
  maxScore: z.number().min(1, "Max score must be at least 1"),
  weight: z.number().min(1, "Weight must be at least 1"),
  status: z.enum(["draft", "published", "graded"]),
});

// Define the form schema for the submission form
const submissionSchema = z.object({
  assignmentId: z.number(),
  studentId: z.number(),
  content: z.string().min(1, "Submission content is required"),
});

export default function Assignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [isSubmissionFormOpen, setIsSubmissionFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  
  // Fetch assignments
  const { data: assignmentsData, isLoading } = useQuery({
    queryKey: [courseFilter ? `/api/courses/${courseFilter}/assignments` : "/api/assignments"],
  });
  
  const assignments = assignmentsData || [];
  
  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ["/api/courses"],
  });
  
  // Assignment form setup
  const assignmentForm = useForm<z.infer<typeof assignmentSchema>>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      courseId: 0,
      title: "",
      description: "",
      dueDate: new Date(),
      maxScore: 100,
      weight: 1,
      status: "draft",
    },
  });
  
  // Submission form setup
  const submissionForm = useForm<z.infer<typeof submissionSchema>>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      assignmentId: 0,
      studentId: isStudent && user?.studentInfo ? user.studentInfo.id : 0,
      content: "",
    },
  });
  
  // Create or update assignment mutation
  const assignmentMutation = useMutation({
    mutationFn: async (values: z.infer<typeof assignmentSchema>) => {
      if (selectedAssignment) {
        const res = await apiRequest("PATCH", `/api/assignments/${selectedAssignment.id}`, values);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/assignments", values);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      if (courseFilter) {
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseFilter}/assignments`] });
      }
      toast({
        title: selectedAssignment ? "Assignment Updated" : "Assignment Created",
        description: selectedAssignment 
          ? "The assignment has been updated successfully." 
          : "A new assignment has been created successfully.",
      });
      setIsAssignmentFormOpen(false);
      setSelectedAssignment(null);
      assignmentForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save assignment data",
        variant: "destructive",
      });
    },
  });
  
  // Submit assignment mutation
  const submissionMutation = useMutation({
    mutationFn: async (values: z.infer<typeof submissionSchema>) => {
      const res = await apiRequest("POST", "/api/submissions", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Submission Sent",
        description: "Your assignment has been submitted successfully.",
      });
      setIsSubmissionFormOpen(false);
      submissionForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit assignment",
        variant: "destructive",
      });
    },
  });
  
  const handleOpenAssignmentForm = (assignment: Assignment | null = null) => {
    if (assignment) {
      assignmentForm.reset({
        courseId: assignment.courseId,
        title: assignment.title,
        description: assignment.description || "",
        dueDate: new Date(assignment.dueDate),
        maxScore: assignment.maxScore,
        weight: assignment.weight,
        status: assignment.status as "draft" | "published" | "graded",
      });
      setSelectedAssignment(assignment);
    } else {
      assignmentForm.reset({
        courseId: parseInt(courseFilter || "0") || 0,
        title: "",
        description: "",
        dueDate: new Date(),
        maxScore: 100,
        weight: 1,
        status: "draft",
      });
      setSelectedAssignment(null);
    }
    setIsAssignmentFormOpen(true);
  };
  
  const handleCloseAssignmentForm = () => {
    setIsAssignmentFormOpen(false);
    setSelectedAssignment(null);
    assignmentForm.reset();
  };
  
  const handleOpenSubmissionForm = (assignment: Assignment) => {
    submissionForm.reset({
      assignmentId: assignment.id,
      studentId: isStudent && user?.studentInfo ? user.studentInfo.id : 0,
      content: "",
    });
    setSelectedAssignment(assignment);
    setIsSubmissionFormOpen(true);
  };
  
  const handleCloseSubmissionForm = () => {
    setIsSubmissionFormOpen(false);
    submissionForm.reset();
  };
  
  const onAssignmentSubmit = (values: z.infer<typeof assignmentSchema>) => {
    assignmentMutation.mutate(values);
  };
  
  const onSubmissionSubmit = (values: z.infer<typeof submissionSchema>) => {
    submissionMutation.mutate(values);
  };
  
  // Filter assignments based on search query, course filter, and status filter
  const filteredAssignments = assignments.filter((assignment: any) => {
    const matchesSearch = searchQuery
      ? (assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         assignment.course?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         assignment.course?.code?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesCourse = courseFilter
      ? assignment.courseId.toString() === courseFilter
      : true;
      
    const matchesStatus = statusFilter
      ? assignment.status === statusFilter
      : true;
      
    return matchesSearch && matchesCourse && matchesStatus;
  });
  
  // Function to format the due date relative to now
  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let color = "text-neutral-500";
    if (diffDays < 0) color = "text-red-500";
    else if (diffDays <= 2) color = "text-orange-500";
    else if (diffDays <= 7) color = "text-yellow-600";
    
    return {
      formatted: format(date, "PPP"),
      relative: diffDays < 0 
        ? `${Math.abs(diffDays)} days overdue` 
        : diffDays === 0 
          ? "Due today" 
          : diffDays === 1 
            ? "Due tomorrow" 
            : `${diffDays} days left`,
      color
    };
  };
  
  // Columns for the assignments table
  const assignmentColumns = [
    {
      header: "Assignment",
      accessor: (row: any) => (
        <div className="flex items-start">
          <div className="bg-primary-light bg-opacity-10 p-2 rounded-full mr-3">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{row.title}</p>
            {row.description && (
              <p className="text-xs text-neutral-500 truncate max-w-md">{row.description}</p>
            )}
          </div>
        </div>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Course",
      accessor: (row: any) => (
        <div>
          <p className="text-sm font-medium">{row.course?.name}</p>
          <p className="text-xs text-neutral-500">{row.course?.code}</p>
        </div>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Due Date",
      accessor: (row: any) => {
        const due = formatDueDate(row.dueDate);
        return (
          <div>
            <p className="text-sm">{due.formatted}</p>
            <p className={`text-xs font-medium ${due.color}`}>{due.relative}</p>
          </div>
        );
      },
      className: "py-3 px-4",
    },
    {
      header: "Weight",
      accessor: (row: any) => (
        <div className="text-center">
          <p className="text-sm font-medium">{row.maxScore} pts</p>
          <p className="text-xs text-neutral-500">Weight: {row.weight}x</p>
        </div>
      ),
      className: "py-3 px-4 text-center w-24",
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const statusStyles = {
          draft: "bg-neutral-100 text-neutral-800",
          published: "bg-blue-100 text-blue-800",
          graded: "bg-green-100 text-green-800",
        };
        return (
          <Badge 
            className={
              statusStyles[row.status as keyof typeof statusStyles] || 
              statusStyles.draft
            }
            variant="outline"
          >
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
        );
      },
      className: "py-3 px-4",
    },
  ];
  
  // Define actions based on user role
  const assignmentActions = [
    { 
      label: "View Details", 
      onClick: (row: any) => {
        handleOpenAssignmentForm(row);
      }
    },
  ];
  
  if (isAdmin || isTeacher) {
    assignmentActions.push({ 
      label: "Edit", 
      onClick: (row: any) => {
        handleOpenAssignmentForm(row);
      }
    });
    
    assignmentActions.push({ 
      label: "View Submissions", 
      onClick: (row: any) => {
        window.location.href = `/assignments/${row.id}/submissions`;
      }
    });
  }
  
  if (isStudent) {
    assignmentActions.push({ 
      label: "Submit Assignment", 
      onClick: (row: any) => {
        handleOpenSubmissionForm(row);
      },
      disabled: row => row.status === "graded" || new Date(row.dueDate) < new Date()
    });
  }
  
  return (
    <Layout 
      title={isStudent ? "My Assignments" : "Assignments"} 
      breadcrumbs={[{ label: isStudent ? "My Assignments" : "Assignments" }]}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
          <Input
            placeholder="Search assignments..."
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
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={courseFilter || ""}
            onValueChange={(value) => setCourseFilter(value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>{courseFilter ? (courses?.find((c: any) => c.id.toString() === courseFilter)?.name || "Course") : "Filter by Course"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Courses</SelectItem>
              {courses?.map((course: any) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={statusFilter || ""}
            onValueChange={(value) => setStatusFilter(value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>{statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : "Filter by Status"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
            </SelectContent>
          </Select>
          
          {(isAdmin || isTeacher) && (
            <Button onClick={() => handleOpenAssignmentForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
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
            data={filteredAssignments}
            columns={assignmentColumns}
            actions={assignmentActions}
            keyField="id"
            emptyState={
              <div className="text-center py-8">
                <p className="text-lg font-medium text-neutral-600 mb-2">No assignments found</p>
                <p className="text-neutral-500 mb-4">
                  {searchQuery || courseFilter || statusFilter
                    ? "Try adjusting your search or filters"
                    : isStudent 
                      ? "You don't have any assignments yet" 
                      : "Get started by creating your first assignment"}
                </p>
                {(isAdmin || isTeacher) && (
                  <Button onClick={() => handleOpenAssignmentForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Assignment
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>
      
      {/* Assignment Form Dialog */}
      <Dialog open={isAssignmentFormOpen} onOpenChange={setIsAssignmentFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment
                ? isStudent 
                  ? "Assignment Details" 
                  : "Edit Assignment"
                : "Create New Assignment"}
            </DialogTitle>
            <DialogDescription>
              {selectedAssignment
                ? isStudent 
                  ? "View assignment details" 
                  : "Update the assignment details"
                : "Fill in the details to create a new assignment"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...assignmentForm}>
            <form onSubmit={assignmentForm.handleSubmit(onAssignmentSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={assignmentForm.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Course</FormLabel>
                      <Select
                        disabled={isStudent || !!selectedAssignment}
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courses?.map((course: any) => (
                            <SelectItem key={course.id} value={course.id.toString()}>
                              {course.name} ({course.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Assignment Title" 
                          {...field} 
                          disabled={isStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Due Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={`w-full pl-3 text-left font-normal ${
                                !field.value ? "text-muted-foreground" : ""
                              }`}
                              disabled={isStudent}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={isStudent}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        disabled={isStudent}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="graded">Graded</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="maxScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Score</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          disabled={isStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="10" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))} 
                          disabled={isStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={assignmentForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the assignment..."
                          className="resize-none"
                          rows={4}
                          {...field}
                          value={field.value || ""}
                          disabled={isStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseAssignmentForm}>
                  {isStudent ? "Close" : "Cancel"}
                </Button>
                {!isStudent && (
                  <Button type="submit" disabled={assignmentMutation.isPending}>
                    {assignmentMutation.isPending ? "Saving..." : selectedAssignment ? "Update Assignment" : "Create Assignment"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Submission Form Dialog */}
      <Dialog open={isSubmissionFormOpen} onOpenChange={setIsSubmissionFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              Submit your work for "{selectedAssignment?.title}"
            </DialogDescription>
          </DialogHeader>
          
          <Form {...submissionForm}>
            <form onSubmit={submissionForm.handleSubmit(onSubmissionSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div className="bg-neutral-50 p-4 rounded-md mb-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-neutral-500" />
                    Due: {selectedAssignment?.dueDate && format(new Date(selectedAssignment.dueDate), "PPP")}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {selectedAssignment?.description || "No description provided."}
                  </p>
                </div>
                
                <FormField
                  control={submissionForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Submission</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Type your submission here..."
                          className="resize-none"
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center gap-2 text-neutral-500 text-sm">
                  <Paperclip className="h-4 w-4" />
                  <p>Note: File uploads are not supported in this version.</p>
                </div>
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseSubmissionForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submissionMutation.isPending}>
                  {submissionMutation.isPending ? "Submitting..." : "Submit Assignment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

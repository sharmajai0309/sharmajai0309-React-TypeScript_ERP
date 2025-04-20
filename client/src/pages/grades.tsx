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
import { Grade } from "@shared/schema";
import { Plus, Search, X, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the form schema for the grade form
const gradeSchema = z.object({
  studentId: z.number(),
  courseId: z.number(),
  score: z.number().min(0, "Score must be a positive number"),
  grade: z.string().min(1, "Grade is required"),
  semester: z.string().min(1, "Semester is required"),
  notes: z.string().optional(),
});

export default function Grades() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  
  // Fetch grades based on user role
  const { data, isLoading } = useQuery({
    queryKey: [isStudent ? `/api/students/${user?.studentInfo?.id}/grades` : "/api/grades"],
  });
  
  const grades = data || [];
  
  // Fetch students for dropdown (if admin/teacher)
  const { data: students } = useQuery({
    queryKey: ["/api/students"],
    enabled: isAdmin || isTeacher,
  });
  
  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ["/api/courses"],
  });
  
  // Form setup
  const form = useForm<z.infer<typeof gradeSchema>>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      studentId: 0,
      courseId: 0,
      score: 0,
      grade: "",
      semester: "",
      notes: "",
    },
  });
  
  // Create or update grade mutation
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof gradeSchema>) => {
      if (selectedGrade) {
        const res = await apiRequest("PATCH", `/api/grades/${selectedGrade.id}`, values);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/grades", values);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grades"] });
      if (isStudent && user?.studentInfo?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/students/${user.studentInfo.id}/grades`] });
      }
      toast({
        title: selectedGrade ? "Grade Updated" : "Grade Created",
        description: selectedGrade 
          ? "The grade has been updated successfully." 
          : "A new grade has been added successfully.",
      });
      setIsFormOpen(false);
      setSelectedGrade(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save grade data",
        variant: "destructive",
      });
    },
  });
  
  const handleOpenForm = (grade: Grade | null = null) => {
    if (grade) {
      form.reset({
        studentId: grade.studentId,
        courseId: grade.courseId,
        score: grade.score,
        grade: grade.grade,
        semester: grade.semester,
        notes: grade.notes || "",
      });
      setSelectedGrade(grade);
    } else {
      form.reset({
        studentId: 0,
        courseId: 0,
        score: 0,
        grade: "",
        semester: "",
        notes: "",
      });
      setSelectedGrade(null);
    }
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedGrade(null);
    form.reset();
  };
  
  const onSubmit = (values: z.infer<typeof gradeSchema>) => {
    mutation.mutate(values);
  };
  
  // Extract unique semesters for filtering
  const uniqueSemesters = [...new Set(grades.map((grade: any) => grade.semester))];
  
  // Filter grades based on search query, course filter, and semester filter
  const filteredGrades = grades.filter((grade: any) => {
    const matchesSearch = searchQuery
      ? (grade.course?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         grade.course?.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         grade.student?.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         grade.grade.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
      
    const matchesCourse = courseFilter
      ? grade.courseId.toString() === courseFilter
      : true;
      
    const matchesSemester = semesterFilter
      ? grade.semester === semesterFilter
      : true;
      
    return matchesSearch && matchesCourse && matchesSemester;
  });
  
  // Determine the correct grade color
  const getGradeColor = (grade: string) => {
    const firstChar = grade.charAt(0).toUpperCase();
    if (firstChar === 'A') return "text-green-600 font-bold";
    if (firstChar === 'B') return "text-blue-600 font-bold";
    if (firstChar === 'C') return "text-yellow-600 font-bold";
    if (firstChar === 'D') return "text-orange-600 font-bold";
    if (firstChar === 'F') return "text-red-600 font-bold";
    return "font-bold";
  };
  
  // Columns for the grades table
  const gradeColumns = [
    ...(isStudent ? [] : [
      {
        header: "Student",
        accessor: (row: any) => (
          <div className="flex items-center">
            <Avatar className="w-8 h-8 mr-3">
              <AvatarImage src={row.student?.user?.avatarUrl || ""} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {row.student?.user?.firstName?.[0]}{row.student?.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{row.student?.user?.firstName} {row.student?.user?.lastName}</p>
              <p className="text-xs text-neutral-500">{row.student?.studentId}</p>
            </div>
          </div>
        ),
        className: "py-3 px-4",
      }
    ]),
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
      header: "Semester",
      accessor: (row: any) => (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 font-medium">
          {row.semester}
        </Badge>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Score",
      accessor: (row: any) => <span className="text-sm font-medium">{row.score}/100</span>,
      className: "py-3 px-4 text-center",
    },
    {
      header: "Grade",
      accessor: (row: any) => (
        <span className={`text-sm ${getGradeColor(row.grade)}`}>
          {row.grade}
        </span>
      ),
      className: "py-3 px-4 text-center",
    },
    {
      header: "Notes",
      accessor: (row: any) => (
        <span className="text-sm text-neutral-600 truncate max-w-xs block">
          {row.notes || "—"}
        </span>
      ),
      className: "py-3 px-4",
    },
  ];
  
  const gradeActions = [
    { 
      label: "View Details", 
      onClick: (row: any) => {
        // View grade details (could show a modal with more info)
        handleOpenForm(row);
      }
    },
    { 
      label: "Edit", 
      onClick: (row: any) => {
        handleOpenForm(row);
      },
      disabled: isStudent
    },
  ];
  
  return (
    <Layout 
      title={isStudent ? "My Grades" : "Grades"} 
      breadcrumbs={[{ label: isStudent ? "My Grades" : "Grades" }]}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500 h-4 w-4" />
          <Input
            placeholder="Search grades..."
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
            value={semesterFilter || ""}
            onValueChange={(value) => setSemesterFilter(value || null)}
          >
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                <span>{semesterFilter || "Filter by Semester"}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Semesters</SelectItem>
              {uniqueSemesters.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(isAdmin || isTeacher) && (
            <Button onClick={() => handleOpenForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Grade
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
            data={filteredGrades}
            columns={gradeColumns}
            actions={gradeActions}
            keyField="id"
            emptyState={
              <div className="text-center py-8">
                <p className="text-lg font-medium text-neutral-600 mb-2">No grades found</p>
                <p className="text-neutral-500 mb-4">
                  {searchQuery || courseFilter || semesterFilter
                    ? "Try adjusting your search or filters"
                    : isStudent 
                      ? "You don't have any grades recorded yet" 
                      : "Get started by adding your first grade"}
                </p>
                {(isAdmin || isTeacher) && (
                  <Button onClick={() => handleOpenForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Grade
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>
      
      {/* Grade Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedGrade ? "Edit Grade" : "Add New Grade"}</DialogTitle>
            <DialogDescription>
              {selectedGrade 
                ? isStudent 
                  ? "View grade details" 
                  : "Update the grade information"
                : "Add a new grade record for a student"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {!isStudent && (
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select
                          disabled={!!selectedGrade || isStudent}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students?.map((student: any) => (
                              <SelectItem key={student.id} value={student.id.toString()}>
                                {student.user?.firstName} {student.user?.lastName} ({student.studentId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem className={isStudent ? "col-span-2" : ""}>
                      <FormLabel>Course</FormLabel>
                      <Select
                        disabled={isStudent && !!selectedGrade}
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
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Fall 2023" 
                          {...field} 
                          disabled={isStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Score (out of 100)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
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
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="A, B, C, etc." 
                          {...field}
                          disabled={isStudent}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional comments"
                          className="resize-none"
                          rows={3}
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
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  {isStudent ? "Close" : "Cancel"}
                </Button>
                {!isStudent && (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : "Save Grade"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle, Filter, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Attendance } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Define the form schema for the attendance form
const attendanceSchema = z.object({
  studentId: z.number(),
  courseId: z.number(),
  date: z.date(),
  status: z.enum(["present", "absent", "late", "excused"]),
  notes: z.string().optional(),
});

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  
  // Fetch attendance records based on user role
  const { data, isLoading } = useQuery({
    queryKey: [
      isStudent 
        ? `/api/students/${user?.studentInfo?.id}/attendance` 
        : courseFilter 
          ? `/api/courses/${courseFilter}/attendance` 
          : "/api/attendance"
    ],
  });
  
  const attendanceRecords = data?.attendanceRecords || [];
  
  // Fetch students for dropdown
  const { data: students } = useQuery({
    queryKey: ["/api/students"],
    enabled: isAdmin || isTeacher,
  });
  
  // Fetch courses for dropdown
  const { data: courses } = useQuery({
    queryKey: ["/api/courses"],
  });
  
  // Form setup
  const form = useForm<z.infer<typeof attendanceSchema>>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      studentId: 0,
      courseId: 0,
      date: new Date(),
      status: "present",
      notes: "",
    },
  });
  
  // Create or update attendance mutation
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof attendanceSchema>) => {
      if (selectedAttendance) {
        const res = await apiRequest("PATCH", `/api/attendance/${selectedAttendance.id}`, values);
        return await res.json();
      } else {
        const res = await apiRequest("POST", "/api/attendance", values);
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      if (courseFilter) {
        queryClient.invalidateQueries({ queryKey: [`/api/courses/${courseFilter}/attendance`] });
      }
      if (isStudent && user?.studentInfo?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/students/${user.studentInfo.id}/attendance`] });
      }
      toast({
        title: selectedAttendance ? "Attendance Updated" : "Attendance Recorded",
        description: selectedAttendance 
          ? "The attendance record has been updated successfully." 
          : "Attendance has been recorded successfully.",
      });
      setIsFormOpen(false);
      setSelectedAttendance(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance data",
        variant: "destructive",
      });
    },
  });
  
  const handleOpenForm = (attendance: Attendance | null = null) => {
    if (attendance) {
      form.reset({
        studentId: attendance.studentId,
        courseId: attendance.courseId,
        date: new Date(attendance.date),
        status: attendance.status as "present" | "absent" | "late" | "excused",
        notes: attendance.notes || "",
      });
      setSelectedAttendance(attendance);
    } else {
      form.reset({
        studentId: 0,
        courseId: parseInt(courseFilter || "0") || 0,
        date: new Date(),
        status: "present",
        notes: "",
      });
      setSelectedAttendance(null);
    }
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAttendance(null);
    form.reset();
  };
  
  const onSubmit = (values: z.infer<typeof attendanceSchema>) => {
    mutation.mutate(values);
  };
  
  // Filter attendance records based on course, status, and date filters
  const filteredAttendance = attendanceRecords.filter((record: any) => {
    const matchesCourse = courseFilter
      ? record.courseId.toString() === courseFilter
      : true;
      
    const matchesStatus = statusFilter
      ? record.status === statusFilter
      : true;
      
    const matchesDate = dateFilter
      ? new Date(record.date).toDateString() === dateFilter.toDateString()
      : true;
      
    return matchesCourse && matchesStatus && matchesDate;
  });
  
  // Get icon and color for attendance status
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "present":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-600 mr-1" />,
          label: "Present",
          class: "bg-green-100 text-green-800"
        };
      case "absent":
        return {
          icon: <XCircle className="h-4 w-4 text-red-600 mr-1" />,
          label: "Absent",
          class: "bg-red-100 text-red-800"
        };
      case "late":
        return {
          icon: <Clock className="h-4 w-4 text-yellow-600 mr-1" />,
          label: "Late",
          class: "bg-yellow-100 text-yellow-800"
        };
      case "excused":
        return {
          icon: <AlertCircle className="h-4 w-4 text-blue-600 mr-1" />,
          label: "Excused",
          class: "bg-blue-100 text-blue-800"
        };
      default:
        return {
          icon: null,
          label: status,
          class: "bg-gray-100 text-gray-800"
        };
    }
  };
  
  // Columns for the attendance table
  const attendanceColumns = [
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
      header: "Date",
      accessor: (row: any) => (
        <span className="text-sm">
          {format(new Date(row.date), "MMMM d, yyyy")}
        </span>
      ),
      className: "py-3 px-4",
    },
    {
      header: "Status",
      accessor: (row: any) => {
        const status = getStatusDisplay(row.status);
        return (
          <Badge 
            variant="outline" 
            className={`flex items-center ${status.class}`}
          >
            {status.icon}
            {status.label}
          </Badge>
        );
      },
      className: "py-3 px-4",
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
  
  const attendanceActions = [
    { 
      label: "View Details", 
      onClick: (row: any) => {
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
      title={isStudent ? "My Attendance" : "Attendance"} 
      breadcrumbs={[{ label: isStudent ? "My Attendance" : "Attendance" }]}
    >
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 flex-wrap">
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
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="excused">Excused</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateFilter ? "default" : "outline"}
                className="w-[180px] justify-start"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFilter ? format(dateFilter, "PPP") : "Filter by Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFilter || undefined}
                onSelect={(date) => setDateFilter(date)}
                initialFocus
              />
              {dateFilter && (
                <div className="p-2 border-t border-neutral-200">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => setDateFilter(null)}
                  >
                    Clear Date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
        
        {(isAdmin || isTeacher) && (
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Record Attendance
          </Button>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-80 w-full" />
          </div>
        ) : (
          <DataTable
            data={filteredAttendance}
            columns={attendanceColumns}
            actions={attendanceActions}
            keyField="id"
            emptyState={
              <div className="text-center py-8">
                <p className="text-lg font-medium text-neutral-600 mb-2">No attendance records found</p>
                <p className="text-neutral-500 mb-4">
                  {courseFilter || statusFilter || dateFilter
                    ? "Try adjusting your filters"
                    : isStudent 
                      ? "You don't have any attendance records yet" 
                      : "Get started by recording attendance"}
                </p>
                {(isAdmin || isTeacher) && (
                  <Button onClick={() => handleOpenForm()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Attendance
                  </Button>
                )}
              </div>
            }
          />
        )}
      </div>
      
      {/* Attendance Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAttendance 
                ? isStudent 
                  ? "Attendance Details" 
                  : "Edit Attendance Record" 
                : "Record Attendance"}
            </DialogTitle>
            <DialogDescription>
              {selectedAttendance 
                ? isStudent 
                  ? "View your attendance details" 
                  : "Update the attendance record"
                : "Mark student attendance for a course"}
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
                          disabled={isStudent}
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
                        disabled={isStudent}
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
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
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
                  control={form.control}
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
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                          <SelectItem value="excused">Excused</SelectItem>
                        </SelectContent>
                      </Select>
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
                    {mutation.isPending ? "Saving..." : selectedAttendance ? "Update" : "Save Record"}
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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Layout from "@/components/layout/layout";
import StatCard from "@/components/ui/stat-card";
import ActivityTimeline from "@/components/dashboard/activity-timeline";
import DeadlineCard from "@/components/dashboard/deadline-card";
import DataTable from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, CalendarCheck, FileText, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState<string>("all");
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
    staleTime: 60000, // 1 minute
  });
  
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";
  
  // Columns for the recent students table
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
  ];
  
  const studentActions = [
    { 
      label: "View Profile", 
      onClick: (row: any) => {
        window.location.href = `/students/${row.id}`;
      }
    },
    { 
      label: "Edit", 
      onClick: (row: any) => {
        console.log("Edit student:", row);
      }
    },
  ];
  
  // Sample deadlines (in a real app, these would come from the API)
  const mockDeadlines = data?.upcomingDeadlines || [];
  
  const renderStatCards = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-10 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    
    if (error || !data) {
      return (
        <div className="bg-destructive/10 p-4 rounded-lg text-destructive mb-8">
          Failed to load dashboard data. Please try again.
        </div>
      );
    }
    
    const { stats } = data;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          trend={{
            value: "4.5% increase",
            direction: "up",
          }}
          icon={<Users />}
          iconBgClass="bg-primary-light bg-opacity-10"
          iconClass="text-primary"
        />
        
        <StatCard
          title="Active Courses"
          value={stats.activeCourses}
          trend={{
            value: "2.1% increase",
            direction: "up",
          }}
          icon={<GraduationCap />}
          iconBgClass="bg-secondary-light bg-opacity-10"
          iconClass="text-secondary"
        />
        
        <StatCard
          title="Avg. Attendance"
          value={`${stats.attendancePercentage}%`}
          trend={{
            value: "1.2% decrease",
            direction: "down",
          }}
          icon={<CalendarCheck />}
          iconBgClass="bg-accent-light bg-opacity-10"
          iconClass="text-accent"
        />
        
        <StatCard
          title="Pending Assignments"
          value={stats.pendingAssignments}
          trend={{
            value: "8.3% increase",
            direction: "up",
          }}
          icon={<FileText />}
          iconBgClass="bg-info bg-opacity-10"
          iconClass="text-info"
        />
      </div>
    );
  };
  
  const renderStudentsTable = () => {
    if (isLoading) {
      return (
        <div className="col-span-2 bg-white rounded-lg shadow-sm border border-neutral-200 p-4">
          <Skeleton className="h-6 w-1/4 mb-4" />
          <Skeleton className="h-80 w-full" />
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 lg:col-span-2">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
          <h2 className="font-medium text-lg text-neutral-800">Recently Enrolled Students</h2>
          <Button 
            variant="link" 
            size="sm" 
            className="text-primary hover:text-primary-dark text-sm font-medium"
            onClick={() => window.location.href = '/students'}
          >
            View All
          </Button>
        </div>
        <div>
          <DataTable
            data={data?.recentStudents || []}
            columns={studentColumns}
            actions={studentActions}
            keyField="id"
            emptyState={
              <div className="text-center py-8">
                <p className="text-neutral-500">No students found</p>
              </div>
            }
          />
        </div>
      </div>
    );
  };
  
  return (
    <Layout title={`${isAdmin ? 'Administrator' : isTeacher ? 'Teacher' : 'Student'} Dashboard`}>
      {/* Quick Stats */}
      {renderStatCards()}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Students */}
        {renderStudentsTable()}
        
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
          <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
            <h2 className="font-medium text-lg text-neutral-800">Upcoming Deadlines</h2>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary hover:text-primary-dark text-sm font-medium"
            >
              View All
            </Button>
          </div>
          
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : mockDeadlines.length > 0 ? (
              <div className="space-y-4">
                {mockDeadlines.map((deadline) => (
                  <DeadlineCard
                    key={deadline.id}
                    id={deadline.id}
                    title={deadline.title}
                    subtitle={deadline.course}
                    dueDate={new Date(deadline.dueDate)}
                    priority={deadline.priority}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-neutral-500">
                No upcoming deadlines
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="p-4 border-b border-neutral-200 flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-medium text-lg text-neutral-800">Recent Activities</h2>
          <div className="flex space-x-2 flex-wrap">
            <Button
              variant={activityFilter === "all" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActivityFilter("all")}
            >
              All
            </Button>
            <Button
              variant={activityFilter === "assignments" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActivityFilter("assignments")}
            >
              Assignments
            </Button>
            <Button
              variant={activityFilter === "grades" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActivityFilter("grades")}
            >
              Grades
            </Button>
            <Button
              variant={activityFilter === "system" ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setActivityFilter("system")}
            >
              System
            </Button>
          </div>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-6 pl-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="relative">
                  <Skeleton className="absolute -left-6 w-4 h-4 rounded-full" />
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <ActivityTimeline 
              activities={data?.activities || []} 
              filter={activityFilter}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}

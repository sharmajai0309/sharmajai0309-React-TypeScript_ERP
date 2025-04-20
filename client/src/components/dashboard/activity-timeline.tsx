import { Activity } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

type ActivityWithUser = Activity & {
  user?: {
    firstName: string;
    lastName: string;
    username: string;
  };
};

interface ActivityTimelineProps {
  activities: ActivityWithUser[];
  filter?: string;
  className?: string;
}

export default function ActivityTimeline({ 
  activities, 
  filter = "all",
  className
}: ActivityTimelineProps) {
  
  // Filter activities based on the selected filter
  const filteredActivities = filter === "all" 
    ? activities 
    : activities.filter(activity => {
        if (filter === "assignments") return activity.activityType.includes("ASSIGNMENT");
        if (filter === "grades") return activity.activityType.includes("GRADE");
        if (filter === "system") return activity.activityType.includes("SYSTEM");
        return true;
      });

  // Function to determine the dot color based on activity type
  const getDotColorClass = (activityType: string): string => {
    if (activityType.includes("GRADE")) return "bg-primary";
    if (activityType.includes("ASSIGNMENT")) return "bg-secondary";
    if (activityType.includes("SYSTEM")) return "bg-info";
    if (activityType.includes("STUDENT") || activityType.includes("USER")) return "bg-accent";
    return "bg-neutral-400";
  };
  
  // Function to get activity title based on type
  const getActivityTitle = (activity: ActivityWithUser): string => {
    const type = activity.activityType;
    
    if (type.includes("GRADE")) return "Grade Updated";
    if (type.includes("ASSIGNMENT")) return "New Assignment";
    if (type.includes("SYSTEM")) return "System Update";
    if (type.includes("STUDENT") && type.includes("CREATED")) return "Student Enrolled";
    if (type.includes("USER") && type.includes("LOGIN")) return "User Login";
    
    // Fallback to a default title from the description
    return activity.description.split(' ').slice(0, 2).join(' ');
  };

  return (
    <div className={cn("relative pl-6 before:content-[''] before:absolute before:left-2 before:top-0 before:h-full before:w-px before:bg-neutral-200", className)}>
      {filteredActivities.length === 0 ? (
        <div className="py-8 text-center text-neutral-500">
          No recent activities to display
        </div>
      ) : (
        filteredActivities.map((activity) => (
          <div key={activity.id} className="mb-6 relative">
            <div 
              className={cn(
                "absolute -left-6 w-4 h-4 rounded-full", 
                getDotColorClass(activity.activityType)
              )}
            />
            <div className="flex justify-between">
              <p className="text-sm font-medium">{getActivityTitle(activity)}</p>
              <p className="text-xs text-neutral-500">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
            <p className="text-sm text-neutral-600 mt-1">
              {activity.user && (
                <span>
                  <span className="font-medium">
                    {activity.user.firstName} {activity.user.lastName}
                  </span>{' '}
                </span>
              )}
              {activity.description}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DeadlineProps {
  id: number;
  title: string;
  subtitle: string;
  dueDate: Date;
  priority: "urgent" | "medium" | "standard";
  onClick?: (id: number) => void;
}

export default function DeadlineCard({
  id,
  title,
  subtitle,
  dueDate,
  priority,
  onClick
}: DeadlineProps) {
  // Calculate days remaining
  const now = new Date();
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Determine priority styles
  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          badge: "bg-red-100 text-red-800",
          text: "text-error",
          label: "Urgent"
        };
      case "medium":
        return {
          badge: "bg-yellow-100 text-yellow-800",
          text: "text-warning",
          label: "Medium"
        };
      default:
        return {
          badge: "bg-blue-100 text-blue-800",
          text: "text-info",
          label: "Standard"
        };
    }
  };
  
  const priorityStyles = getPriorityStyles(priority);
  
  return (
    <div 
      className="p-3 border border-neutral-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
      onClick={() => onClick && onClick(id)}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium">{title}</p>
        <Badge className={priorityStyles.badge} variant="outline">
          {priorityStyles.label}
        </Badge>
      </div>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-neutral-500">
          Due: {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
        <p className={cn("text-xs font-medium", priorityStyles.text)}>
          {diffDays} days left
        </p>
      </div>
    </div>
  );
}

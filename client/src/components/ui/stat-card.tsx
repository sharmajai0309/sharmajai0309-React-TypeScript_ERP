import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: string | number;
    direction: "up" | "down";
  };
  icon?: ReactNode;
  iconBgClass?: string;
  iconClass?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  trend,
  icon,
  iconBgClass = "bg-primary-light bg-opacity-10",
  iconClass = "text-primary",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-neutral-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-medium mt-1">{value}</h3>
            
            {trend && (
              <p className={cn(
                "text-sm mt-1 flex items-center",
                trend.direction === "up" ? "text-accent" : "text-destructive"
              )}>
                {trend.direction === "up" ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                <span>{trend.value}</span>
              </p>
            )}
          </div>
          
          {icon && (
            <div className={cn("p-2 rounded-full", iconBgClass)}>
              <div className={cn("h-5 w-5", iconClass)}>
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

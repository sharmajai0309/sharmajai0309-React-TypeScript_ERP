import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
}

interface Action<T> {
  label: string;
  onClick: (row: T) => void;
  disabled?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: Action<T>[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyState?: ReactNode;
  rowClassName?: string | ((row: T) => string);
}

export default function DataTable<T>({
  data,
  columns,
  actions,
  keyField,
  isLoading = false,
  emptyState,
  rowClassName,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const start = (page - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const currentData = data.slice(start, end);
  
  const handlePageChange = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages)));
  };
  
  const getRowClassName = (row: T) => {
    if (!rowClassName) return "";
    return typeof rowClassName === "function" ? rowClassName(row) : rowClassName;
  };
  
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (data.length === 0 && emptyState) {
    return (
      <div className="w-full py-8">
        {emptyState}
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-neutral-50">
              {columns.map((column, index) => (
                <TableHead 
                  key={index} 
                  className={cn("text-neutral-500 text-xs uppercase font-medium", column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
              
              {actions && actions.length > 0 && (
                <TableHead className="w-10 text-right pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {currentData.map((row) => (
              <TableRow 
                key={String(row[keyField])} 
                className={cn("hover:bg-neutral-50", getRowClassName(row))}
              >
                {columns.map((column, index) => (
                  <TableCell key={index} className={column.className}>
                    {typeof column.accessor === "function" 
                      ? column.accessor(row)
                      : row[column.accessor] as ReactNode}
                  </TableCell>
                ))}
                
                {actions && actions.length > 0 && (
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-primary">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      
                      <DropdownMenuContent align="end">
                        {actions.map((action, index) => (
                          <DropdownMenuItem
                            key={index}
                            onClick={() => action.onClick(row)}
                            disabled={action.disabled}
                          >
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          
          <div className="text-sm text-neutral-600">
            Page {page} of {totalPages}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      )}
    </div>
  );
}

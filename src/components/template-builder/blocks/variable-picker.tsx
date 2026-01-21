"use client";

import { useState } from "react";
import { STANDARD_VARIABLES, TemplateVariable } from "@/types/template";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Variable, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariablePickerProps {
  value?: string;
  onChange: (variable: string | undefined) => void;
  trigger?: React.ReactNode;
}

const categoryLabels: Record<string, string> = {
  employee: "Employee",
  period: "Period",
  company: "Company",
  earnings: "Earnings",
  deductions: "Deductions",
  computed: "Computed",
};

const categoryColors: Record<string, string> = {
  employee: "bg-blue-100 text-blue-800",
  period: "bg-purple-100 text-purple-800",
  company: "bg-green-100 text-green-800",
  earnings: "bg-emerald-100 text-emerald-800",
  deductions: "bg-red-100 text-red-800",
  computed: "bg-orange-100 text-orange-800",
};

export function VariablePicker({ value, onChange, trigger }: VariablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredVariables = STANDARD_VARIABLES.filter(
    (v) =>
      v.label.toLowerCase().includes(search.toLowerCase()) ||
      v.key.toLowerCase().includes(search.toLowerCase())
  );

  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, TemplateVariable[]>);

  const selectedVariable = STANDARD_VARIABLES.find((v) => v.key === value);

  const handleSelect = (variable: TemplateVariable) => {
    onChange(variable.key);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs justify-start font-normal",
              value && "bg-primary/10 border-primary/30"
            )}
          >
            <Variable className="h-3 w-3 mr-1" />
            {selectedVariable ? (
              <>
                <span className="truncate max-w-[100px]">{selectedVariable.label}</span>
                <X
                  className="h-3 w-3 ml-1 hover:text-destructive"
                  onClick={handleClear}
                />
              </>
            ) : (
              "Bind variable"
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search variables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category} className="mb-2">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                {categoryLabels[category] || category}
              </div>
              {variables.map((variable) => (
                <button
                  key={variable.key}
                  onClick={() => handleSelect(variable)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted text-left",
                    value === variable.key && "bg-primary/10"
                  )}
                >
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-xs font-mono",
                      categoryColors[variable.category]
                    )}
                  >
                    {variable.key.replace(/[{}]/g, "")}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {variable.label}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {filteredVariables.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No variables found
            </div>
          )}
        </div>
        {value && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Remove variable binding
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

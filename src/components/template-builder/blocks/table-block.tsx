"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Block, TableBlockProperties, TableCell, STANDARD_VARIABLES, TemplateVariable } from "@/types/template";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Variable, Tag, Sparkles, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

const categoryLabels: Record<string, string> = {
  employee: "Employee",
  period: "Period",
  company: "Company",
  earnings: "Earnings",
  deductions: "Deductions",
  computed: "Computed",
  custom: "Custom (Row Labels)",
};

// Score how well a variable matches the cell content
function getMatchScore(cellContent: string, variable: { key: string; label: string }): number {
  if (!cellContent) return 0;

  const content = cellContent.toLowerCase().trim();
  const label = variable.label.toLowerCase();
  const keyParts = variable.key.replace(/[{}]/g, "").toLowerCase().split(".");
  const keyName = keyParts[keyParts.length - 1];

  if (label === content) return 100;
  if (keyName === content) return 95;
  if (label.startsWith(content)) return 80;
  if (keyName.toLowerCase().startsWith(content)) return 75;
  if (label.includes(content)) return 60;
  if (keyName.toLowerCase().includes(content)) return 55;

  const contentWords = content.split(/\s+/);
  const labelWords = label.split(/\s+/);
  const matchingWords = contentWords.filter(w =>
    labelWords.some(lw => lw.includes(w) || w.includes(lw))
  );
  if (matchingWords.length > 0) {
    return 30 + (matchingWords.length / contentWords.length) * 20;
  }

  return 0;
}

// Generate a camelCase ID from content
function generateLabelId(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join("");
}

// Common field suffixes for row-based variables
const FIELD_SUFFIXES = [
  { suffix: "", label: "(Value)" }, // Primary value without suffix
  { suffix: "hours", label: "Hours" },
  { suffix: "rate", label: "Rate" },
  { suffix: "amount", label: "Amount" },
  { suffix: "total", label: "Total" },
  { suffix: "quantity", label: "Quantity" },
  { suffix: "days", label: "Days" },
];

export function TableBlock({ block, isPreview, data }: TableBlockProps) {
  const props = block.properties as TableBlockProperties;
  const {
    selectedBlockId,
    updateTableCell,
    addTableRow,
    removeTableRow,
    addTableColumn,
    removeTableColumn,
  } = useTemplateBuilderStore();

  const isSelected = selectedBlockId === block.id;
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Label ID dialog state
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [labelDialogCell, setLabelDialogCell] = useState<{ row: number; col: number } | null>(null);
  const [labelIdInput, setLabelIdInput] = useState("");

  // Custom Variable Dialog state
  const [customVarDialogOpen, setCustomVarDialogOpen] = useState(false);
  const [customVarCell, setCustomVarCell] = useState<{ row: number; col: number } | null>(null);
  const [customVarInput, setCustomVarInput] = useState("");

  const handleOpenCustomVarDialog = (rowIndex: number, colIndex: number) => {
    const cell = props.rows[rowIndex].cells[colIndex];
    setCustomVarCell({ row: rowIndex, col: colIndex });
    // Pre-fill if it already has a variable? Maybe.
    setCustomVarInput(cell.variable ? cell.variable.replace(/[{}]/g, "") : "");
    setCustomVarDialogOpen(true);
  };

  const handleSaveCustomVar = () => {
    if (customVarCell && customVarInput.trim()) {
      const cleanKey = customVarInput.trim().replace(/[{}]/g, "");
      const fullKey = `{{${cleanKey}}}`;
      updateTableCell(block.id, customVarCell.row, customVarCell.col, {
        variable: fullKey,
        content: fullKey, // Use key as content initially, user can rename content if they want, or maybe keep content?
        // Actually, usually we set content to something readable. Let's stick to key for now or just don't touch content if it has text?
        // Standard behavior: handleBindVariable sets content to label or key.
        // Let's set content to key for clarity, user can edit it.
        // Wait, existing handleBindVariable sets content to variable.label || variableKey.
        // So here we should probably set it to the key.
        isLabel: false,
        labelId: undefined,
      });
      // Allow user to keep existing content if they prefer?
      // Logic: if cell is empty, set content. If not, maybe ask?
      // Simpler: Set content to `{{key}}` visual style or just the key string.
      // Let's match standard behavior: update content.
    }
    setCustomVarDialogOpen(false);
    setCustomVarCell(null);
    setCustomVarInput("");
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Generate dynamic variables from row labels
  const dynamicVariables = useMemo(() => {
    const variables: TemplateVariable[] = [];

    props.rows.forEach((row) => {
      row.cells.forEach((cell) => {
        if (cell.isLabel && cell.labelId) {
          // Create variables for this label
          FIELD_SUFFIXES.forEach(({ suffix, label }) => {
            const key = suffix
              ? `{{${cell.labelId}.${suffix}}}`
              : `{{${cell.labelId}}}`;
            const displayLabel = suffix
              ? `${cell.content} - ${label}`
              : cell.content;
            variables.push({
              key,
              label: displayLabel,
              category: "custom" as TemplateVariable["category"],
            });
          });
        }
      });
    });

    return variables;
  }, [props.rows]);

  // Combine standard and dynamic variables
  const allVariables = useMemo(() => {
    return [...STANDARD_VARIABLES, ...dynamicVariables];
  }, [dynamicVariables]);

  // Group all variables by category
  const variablesByCategory = useMemo(() => {
    return allVariables.reduce((acc, variable) => {
      const category = variable.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(variable);
      return acc;
    }, {} as Record<string, TemplateVariable[]>);
  }, [allVariables]);

  const startEditing = (rowIndex: number, colIndex: number, cell: TableCell) => {
    if (!isPreview && !cell.variable) {
      setEditingCell({ row: rowIndex, col: colIndex });
      setEditValue(cell.content);
    }
  };

  const finishEditing = () => {
    if (editingCell) {
      updateTableCell(block.id, editingCell.row, editingCell.col, { content: editValue });
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      finishEditing();
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const handleBindVariable = (rowIndex: number, colIndex: number, variableKey: string) => {
    const variable = allVariables.find((v) => v.key === variableKey);
    updateTableCell(block.id, rowIndex, colIndex, {
      variable: variableKey,
      content: variable?.label || variableKey,
      isLabel: false,
      labelId: undefined,
    });
  };

  const handleClearVariable = (rowIndex: number, colIndex: number) => {
    updateTableCell(block.id, rowIndex, colIndex, {
      variable: undefined,
      isLabel: false,
    });
  };

  const handleOpenLabelDialog = (rowIndex: number, colIndex: number) => {
    const cell = props.rows[rowIndex].cells[colIndex];
    setLabelDialogCell({ row: rowIndex, col: colIndex });
    setLabelIdInput(cell.labelId || generateLabelId(cell.content));
    setLabelDialogOpen(true);
  };

  const handleSaveLabelId = () => {
    if (labelDialogCell && labelIdInput.trim()) {
      updateTableCell(block.id, labelDialogCell.row, labelDialogCell.col, {
        isLabel: true,
        labelId: labelIdInput.trim(),
        variable: undefined,
      });
    }
    setLabelDialogOpen(false);
    setLabelDialogCell(null);
    setLabelIdInput("");
  };

  const handleRemoveLabel = (rowIndex: number, colIndex: number) => {
    updateTableCell(block.id, rowIndex, colIndex, {
      isLabel: false,
      labelId: undefined,
    });
  };

  // Get cell display value - use data if available
  const getCellDisplayValue = (cell: TableCell): string => {
    if (cell.variable && data) {
      const path = cell.variable.replace(/[{}]/g, "").split(".");
      let value: unknown = data;
      for (const key of path) {
        value = (value as Record<string, unknown>)?.[key];
      }
      return value?.toString() || cell.content;
    }
    return cell.content;
  };

  return (
    <>
      <div className="relative group h-full">
        {/* ... table ... */}
        <table
          className={cn(
            "w-full h-full border-collapse",
            props.showBorders && "border"
          )}
          style={{ borderColor: "#e5e7eb" }}
        >
          <tbody>
            {props.rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={cn(
                  props.stripedRows && rowIndex % 2 === 1 && "bg-muted/50",
                  row.isHeader && "font-semibold"
                )}
                style={row.isHeader ? { backgroundColor: props.headerBackground } : undefined}
              >
                {row.cells.map((cell, colIndex) => {
                  const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                  const CellTag = row.isHeader ? "th" : "td";
                  const hasVariable = !!cell.variable;
                  const hasLabelId = cell.isLabel && cell.labelId;
                  const displayValue = getCellDisplayValue(cell);

                  const cellContent = (
                    <CellTag
                      /* ... existing CellTag props ... */
                      key={colIndex}
                      className={cn(
                        "px-3 py-2 text-left relative",
                        props.showBorders && "border",
                        !isPreview && "cursor-text hover:bg-muted/30",
                        hasVariable && !isPreview && "bg-primary/5",
                        hasLabelId && !isPreview && "bg-orange-50",
                        cell.isLabel && "font-medium"
                      )}
                      style={{ borderColor: "#e5e7eb" }}
                      colSpan={cell.colSpan}
                      rowSpan={cell.rowSpan}
                      onDoubleClick={() => startEditing(rowIndex, colIndex, cell)}
                    >
                      {/* ... content ... */}
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={finishEditing}
                          onKeyDown={handleKeyDown}
                          className="w-full bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                          style={{ fontSize: "inherit", fontWeight: "inherit" }}
                        />
                      ) : (
                        <>
                          {hasVariable && !isPreview && (
                            <Variable className="inline h-3 w-3 mr-1 text-primary" />
                          )}
                          {hasLabelId && !isPreview && (
                            <span className="inline-flex items-center gap-0.5 mr-1 px-1 py-0.5 text-[10px] font-mono bg-orange-100 text-orange-700 rounded">
                              <Hash className="h-2.5 w-2.5" />
                              {cell.labelId}
                            </span>
                          )}
                          {displayValue || (
                            <span className="text-muted-foreground/50">
                              {hasVariable ? cell.variable : "..."}
                            </span>
                          )}
                        </>
                      )}
                    </CellTag>
                  );

                  if (isPreview) {
                    return cellContent;
                  }

                  // Get suggested variables based on cell content
                  const suggestedVariables = allVariables
                    .map(v => ({ ...v, score: getMatchScore(cell.content, v) }))
                    .filter(v => v.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                  return (
                    <ContextMenu key={colIndex}>
                      <ContextMenuTrigger asChild>{cellContent}</ContextMenuTrigger>
                      <ContextMenuContent className="w-72">
                        {/* Bind to variable submenu */}
                        <ContextMenuSub>
                          <ContextMenuSubTrigger>
                            <Variable className="h-4 w-4 mr-2" />
                            Bind to variable
                            {suggestedVariables.length > 0 && (
                              <span className="ml-auto text-xs text-primary">
                                {suggestedVariables.length} match{suggestedVariables.length > 1 ? "es" : ""}
                              </span>
                            )}
                          </ContextMenuSubTrigger>
                          <ContextMenuSubContent className="w-72 max-h-80 overflow-y-auto">

                            {/* NEW: Custom Variable Option */}
                            <ContextMenuItem onClick={() => handleOpenCustomVarDialog(rowIndex, colIndex)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Custom Dictionary Key...
                            </ContextMenuItem>
                            <ContextMenuSeparator />

                            {/* Suggested matches */}
                            {suggestedVariables.length > 0 && (
                              <>
                                <div className="px-2 py-1 text-xs font-semibold text-primary flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  Suggested for "{cell.content}"
                                </div>
                                {suggestedVariables.map((variable) => (
                                  <ContextMenuItem
                                    key={`suggested-${variable.key}`}
                                    onClick={() => handleBindVariable(rowIndex, colIndex, variable.key)}
                                    className="text-sm bg-primary/5"
                                  >
                                    <span className="font-mono text-xs text-primary mr-2">
                                      {variable.key.replace(/[{}]/g, "")}
                                    </span>
                                    <span className="truncate">{variable.label}</span>
                                  </ContextMenuItem>
                                ))}
                                <ContextMenuSeparator />
                              </>
                            )}

                            {/* All variables by category */}
                            {Object.entries(variablesByCategory).map(([category, variables]) => (
                              /* ... existing category map ... */
                              <div key={category}>
                                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                  {categoryLabels[category] || category}
                                </div>
                                {variables.map((variable) => {
                                  const isSuggested = suggestedVariables.some(s => s.key === variable.key);
                                  return (
                                    <ContextMenuItem
                                      key={variable.key}
                                      onClick={() => handleBindVariable(rowIndex, colIndex, variable.key)}
                                      className={cn("text-sm", isSuggested && "text-primary")}
                                    >
                                      <span className={cn(
                                        "font-mono text-xs mr-2",
                                        isSuggested ? "text-primary" : "text-muted-foreground"
                                      )}>
                                        {variable.key.replace(/[{}]/g, "")}
                                      </span>
                                      <span className="truncate">{variable.label}</span>
                                      {isSuggested && (
                                        <Sparkles className="h-3 w-3 ml-auto text-primary" />
                                      )}
                                    </ContextMenuItem>
                                  );
                                })}
                              </div>
                            ))}
                          </ContextMenuSubContent>
                        </ContextMenuSub>

                        {/* ... rest of menu ... */}
                        {hasVariable && (
                          <ContextMenuItem onClick={() => handleClearVariable(rowIndex, colIndex)}>
                            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                            Remove variable
                          </ContextMenuItem>
                        )}

                        <ContextMenuSeparator />

                        {/* Label options */}
                        <ContextMenuItem onClick={() => handleOpenLabelDialog(rowIndex, colIndex)}>
                          <Tag className="h-4 w-4 mr-2" />
                          {hasLabelId ? "Edit label ID" : "Set as label with ID"}
                        </ContextMenuItem>

                        {/* ... rest ... */}
                        {hasLabelId && (
                          <ContextMenuItem onClick={() => handleRemoveLabel(rowIndex, colIndex)}>
                            <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                            Remove label
                          </ContextMenuItem>
                        )}

                        <ContextMenuSeparator />

                        <ContextMenuItem onClick={() => addTableRow(block.id, rowIndex)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add row below
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => addTableColumn(block.id, colIndex)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add column right
                        </ContextMenuItem>

                        {props.rows.length > 1 && (
                          <ContextMenuItem
                            onClick={() => removeTableRow(block.id, rowIndex)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete row
                          </ContextMenuItem>
                        )}
                        {row.cells.length > 1 && (
                          <ContextMenuItem
                            onClick={() => removeTableColumn(block.id, colIndex)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete column
                          </ContextMenuItem>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
                {/* ... row actions ... */}
                {!isPreview && isSelected && (
                  <td className="w-8 p-0 border-none">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeTableRow(block.id, rowIndex)}
                      disabled={props.rows.length <= 1}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ... buttons ... */}
        {!isPreview && isSelected && (
          <>
            {/* ... */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTableRow(block.id)}>
                <Plus className="h-3 w-3 mr-1" /> Row
              </Button>
            </div>
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addTableColumn(block.id)}>
                <Plus className="h-3 w-3 mr-1" /> Col
              </Button>
            </div>
          </>
        )}

      </div>

      {/* Label ID Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        {/* ... existing dialog ... */}
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Label ID</DialogTitle>
            <DialogDescription>
              Create a unique ID for this label. This will generate variables like{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {labelIdInput || "labelId"}.hours
              </code>,{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {labelIdInput || "labelId"}.amount
              </code>, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="labelId">Label ID</Label>
              <Input
                id="labelId"
                value={labelIdInput}
                onChange={(e) => setLabelIdInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))}
                placeholder="e.g., regularHours, overtime, sss"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use camelCase (e.g., regularHours, overtimePay)
              </p>
            </div>
            {/* ... rest of label dialog ... */}
            <div className="space-y-2">
              <Label>Generated variables:</Label>
              <div className="flex flex-wrap gap-1">
                {FIELD_SUFFIXES.map(({ suffix, label }) => (
                  <span
                    key={suffix || "primary"}
                    className={`text-xs px-2 py-1 rounded font-mono ${suffix === "" ? "bg-primary/20 text-primary font-semibold" : "bg-muted"
                      }`}
                  >
                    {suffix
                      ? `${labelIdInput || "labelId"}.${suffix}`
                      : labelIdInput || "labelId"}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{labelIdInput || "labelId"}</code> for simple value,
                or add suffix for specific fields (hours, amount, etc.)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLabelId} disabled={!labelIdInput.trim()}>
              Save Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NEW: Custom Variable Key Dialog */}
      <Dialog open={customVarDialogOpen} onOpenChange={setCustomVarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bind Custom Variable</DialogTitle>
            <DialogDescription>
              Enter a custom unique key for this field. This will be used as the column header in your Excel file/Data Grid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customKey">Variable Key</Label>
              <Input
                id="customKey"
                value={customVarInput}
                onChange={(e) => setCustomVarInput(e.target.value)}
                placeholder="e.g., projectCode, employee.grade"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Matches syntax <code>{`{{key}}`}</code>. You can enter just the key name.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomVarDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCustomVar} disabled={!customVarInput.trim()}>
              Bind Variable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

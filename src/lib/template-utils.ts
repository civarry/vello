import {
    Block,
    TableBlockProperties,
    ContainerBlockProperties,
    STANDARD_VARIABLES,
    TemplateVariable
} from "@/types/template";

export interface VariableInfo {
    key: string;
    label: string;
    category: string;
}

// Extract all variables used in a template (both standard and custom)
// Logical order for suffixes
const SUFFIX_ORDER = ["days", "quantity", "hours", "rate", "amount", "total"];

function getSortIndex(key: string) {
    const suffix = key.split('.').pop()?.toLowerCase();
    const index = SUFFIX_ORDER.indexOf(suffix || "");
    return index === -1 ? 999 : index;
}

// Extract all variables used in a template (both standard and custom)
export function extractUsedVariables(blocks: Block[]): VariableInfo[] {
    const usedVariables = new Set<string>();
    const labelMap = new Map<string, string>(); // labelId -> label content
    const variableLabelOverride = new Map<string, string>(); // variable key -> inferred label from adjacent cell
    const variableAppearanceOrder: string[] = []; // Track order of first appearance

    function processBlock(block: Block) {
        if (block.type === "table") {
            const props = block.properties as TableBlockProperties;
            props.rows.forEach((row) => {
                row.cells.forEach((cell, index) => {
                    // Collect bound variables
                    if (cell.variable) {
                        if (!usedVariables.has(cell.variable)) {
                            usedVariables.add(cell.variable);
                            variableAppearanceOrder.push(cell.variable);
                        }

                        // heuristic: check previous cell for label
                        if (index > 0) {
                            const prevCell = row.cells[index - 1];
                            // If previous cell has content and is NOT a variable itself
                            if (prevCell.content && !prevCell.variable) {
                                // Clean up the label (remove colons, trim)
                                const cleanLabel = prevCell.content.replace(/[:：]/g, "").trim();
                                if (cleanLabel) {
                                    variableLabelOverride.set(cell.variable, cleanLabel);
                                }
                            }
                        }
                    }
                    // Collect label IDs for custom variable labeling
                    if (cell.isLabel && cell.labelId) {
                        labelMap.set(cell.labelId, cell.content);
                    }
                });
            });
        }
        // Check for nested blocks (containers)
        if (block.type === "container") {
            const props = block.properties as ContainerBlockProperties;
            if (props.children) {
                props.children.forEach(processBlock);
            }
        }
    }

    blocks.forEach(processBlock);

    // 1. Create VariableInfo objects
    const allVariables = variableAppearanceOrder.map((key) => {
        // Check for inferred label override FIRST
        const inferredLabel = variableLabelOverride.get(key);
        if (inferredLabel) {
            const standardVar = STANDARD_VARIABLES.find((v: TemplateVariable) => v.key === key);
            return {
                key,
                label: inferredLabel,
                category: standardVar?.category || "custom",
            };
        }

        // Check if it's a standard variable
        const standardVar = STANDARD_VARIABLES.find((v: TemplateVariable) => v.key === key);
        if (standardVar) {
            return {
                key,
                label: standardVar.label,
                category: standardVar.category,
            };
        }

        // Check if it's a custom variable
        const keyWithoutBraces = key.replace(/[{}]/g, "");
        const keyPath = keyWithoutBraces.split(".");

        // Check for primary value (no suffix) - format: {{labelId}}
        if (keyPath.length === 1) {
            const labelId = keyPath[0];
            const labelContent = labelMap.get(labelId);
            if (labelContent) {
                return {
                    key,
                    label: labelContent,
                    category: "custom",
                };
            }
        }

        // Check for suffixed variable - format: {{labelId.suffix}}
        if (keyPath.length === 2) {
            const [labelId, suffix] = keyPath;
            const labelContent = labelMap.get(labelId);
            if (labelContent) {
                // Capitalize suffix for display
                const suffixLabel = suffix.charAt(0).toUpperCase() + suffix.slice(1);
                return {
                    key,
                    label: `${labelContent} - ${suffixLabel}`,
                    category: "custom",
                };
            }
        }

        // Fallback for unknown variables
        return {
            key,
            label: keyWithoutBraces.split(".").pop() || key,
            category: "custom",
        };
    });

    // 2. Sort Logic: Group by Base & Sort by Suffix
    const groups = new Map<string, VariableInfo[]>();
    const groupOrder: string[] = [];

    allVariables.forEach(v => {
        const keyWithoutBraces = v.key.replace(/[{}]/g, "");
        const parts = keyWithoutBraces.split('.');
        // Base is the first part (e.g., 'regular' from 'regular.hours')
        // Unless it's a standard variable that doesn't follow dot notation strictly or we want to keep them separate?
        // Actually, custom variables are typically `id.field`. Standard variables might just be `key`.
        // Let's use the first part as the base for custom ones.
        const base = parts[0];

        if (!groups.has(base)) {
            groups.set(base, []);
            groupOrder.push(base);
        }
        groups.get(base)!.push(v);
    });

    const sortedVariables: VariableInfo[] = [];

    groupOrder.forEach(base => {
        const groupVars = groups.get(base)!;
        // Sort within the group based on suffix
        groupVars.sort((a, b) => {
            const indexA = getSortIndex(a.key.replace(/[{}]/g, ""));
            const indexB = getSortIndex(b.key.replace(/[{}]/g, ""));
            return indexA - indexB;
        });
        sortedVariables.push(...groupVars);
    });

    return sortedVariables;
}

// Group variables by category
export function groupVariablesByCategory(variables: VariableInfo[]) {
    return variables.reduce((acc, variable) => {
        const category = variable.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(variable);
        return acc;
    }, {} as Record<string, VariableInfo[]>);
}

// Apply data to blocks (replace variables with values)
export function applyDataToBlocks(blocks: Block[], data: Record<string, string>): Block[] {
    return blocks.map((block) => {
        // Handle container children recursively
        if (block.type === "container") {
            const props = block.properties as ContainerBlockProperties;
            if (props.children) {
                return {
                    ...block,
                    properties: {
                        ...props,
                        children: applyDataToBlocks(props.children, data),
                    },
                };
            }
        }

        if (block.type === "table") {
            const props = block.properties as TableBlockProperties;
            return {
                ...block,
                properties: {
                    ...props,
                    rows: props.rows.map((row) => ({
                        ...row,
                        cells: row.cells.map((cell) => {
                            let newContent = cell.content;

                            // 1. Try direct variable mapping
                            if (cell.variable && data[cell.variable] !== undefined) {
                                newContent = data[cell.variable];
                            }
                            // 2. Fallback or additional: Try regex replacement within the content
                            // This handles cases where cell.variable might be missing but content has {{var}}
                            else if (newContent && typeof newContent === "string") {
                                newContent = newContent.replace(/{{([\w.]+)}}/g, (match, key) => {
                                    if (data[match] !== undefined) return data[match];
                                    if (data[key] !== undefined) return data[key];
                                    return match;
                                });
                            }

                            return {
                                ...cell,
                                content: newContent,
                            };
                        }),
                    })),
                },
            };
        }

        if (block.type === "text") {
            const props = block.properties as any; // Cast to access content
            let content = props.content || "";

            // Allow replacement of {{variable}} within text content
            if (content && typeof content === "string") {
                content = content.replace(/{{([\w.]+)}}/g, (match, key) => {
                    // Check full match first (e.g. "{{employee.name}}") then inner key ("employee.name")
                    if (data[match] !== undefined) return data[match];
                    if (data[key] !== undefined) return data[key];
                    return match;
                });
            }

            return {
                ...block,
                properties: {
                    ...props,
                    content
                }
            };
        }

        if (block.type === "image") {
            const props = block.properties as any;
            let src = props.src || "";

            // Allow replacement of {{variable}} within image src
            if (src && typeof src === "string") {
                src = src.replace(/{{([\w.]+)}}/g, (match: string, key: string) => {
                    if (data[match] !== undefined) return data[match];
                    if (data[key] !== undefined) return data[key];
                    return match;
                });
            }

            return {
                ...block,
                properties: {
                    ...props,
                    src
                }
            };
        }

        return block;
    });
}

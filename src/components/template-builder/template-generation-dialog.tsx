"use client";

import { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { TemplateSchema } from "@/types/template";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemplateGenerationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const MAX_PROMPT_LENGTH = 1000;

const GENERATION_SUGGESTIONS = [
    "A clean, modern professional payslip with a blue header",
    "A minimalist invoice style payslip with table borders",
    "A detailed salary statement with employee info on the left",
];

const REDESIGN_SUGGESTIONS = [
    "Make it dark mode with slate colors",
    "Change the primary color to emerald green",
    "Use a serif font and make it look formal",
    "Increase the padding and make it more spacious"
];

export function TemplateGenerationDialog({ open, onOpenChange }: TemplateGenerationDialogProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Store selectors
    const blocks = useTemplateBuilderStore((state) => state.blocks);
    const globalStyles = useTemplateBuilderStore((state) => state.globalStyles);
    const setBlocks = useTemplateBuilderStore((state) => state.setBlocks);
    const setGlobalStyles = useTemplateBuilderStore((state) => state.setGlobalStyles);

    const isRedesign = blocks && blocks.length > 0;
    const activeSuggestions = isRedesign ? REDESIGN_SUGGESTIONS : GENERATION_SUGGESTIONS;

    // Clear error when prompt changes
    const handlePromptChange = useCallback((value: string) => {
        setPrompt(value);
        if (error) setError(null);
    }, [error]);

    // Validate prompt
    const validatePrompt = useCallback((): string | null => {
        const trimmedPrompt = prompt.trim();

        if (!trimmedPrompt) {
            return "Please enter a description for your template.";
        }

        if (trimmedPrompt.length < 10) {
            return "Please provide a more detailed description (at least 10 characters).";
        }

        if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
            return `Prompt is too long. Please keep it under ${MAX_PROMPT_LENGTH} characters.`;
        }

        return null;
    }, [prompt]);

    const handleGenerate = async () => {
        // Validate prompt
        const validationError = validatePrompt();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const currentSchema = isRedesign ? { blocks, globalStyles } : undefined;

            const response = await fetch("/api/ai/generate-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    currentSchema
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate template");
            }

            // Validate response structure
            if (!isValidTemplateSchema(data)) {
                throw new Error("Received invalid template data from AI");
            }

            // Update store
            const schema = data as TemplateSchema;
            setBlocks(schema.blocks);
            setGlobalStyles(schema.globalStyles);

            // Show success message
            toast.success(
                isRedesign
                    ? "Template redesigned successfully!"
                    : "Template generated successfully!",
                {
                    description: isRedesign
                        ? "Your template has been updated with the new styles."
                        : "Your new template is ready to customize."
                }
            );

            // Close dialog and reset
            onOpenChange(false);
            setPrompt("");

        } catch (error: any) {
            console.error("Generation error:", error);
            const errorMessage = error.message || "Something went wrong during generation";
            setError(errorMessage);
            toast.error("Generation failed", {
                description: errorMessage
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Handle dialog close
    const handleClose = useCallback(() => {
        if (!isGenerating) {
            onOpenChange(false);
            // Reset state after animation
            setTimeout(() => {
                setPrompt("");
                setError(null);
            }, 200);
        }
    }, [isGenerating, onOpenChange]);

    // Handle Enter key (with Shift for new line)
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
            e.preventDefault();
            handleGenerate();
        }
    }, [isGenerating, handleGenerate]);

    const remainingChars = MAX_PROMPT_LENGTH - prompt.length;
    const isPromptTooLong = remainingChars < 0;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        {isRedesign ? "Redesign with AI" : "Generate with AI"}
                    </DialogTitle>
                    <DialogDescription>
                        {isRedesign
                            ? "Describe how you want to change the style and layout. Your content and data will be preserved."
                            : "Describe the template you want to create, and we'll build a professional layout for you."
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <Textarea
                            placeholder={isRedesign
                                ? "E.g., Change to a dark theme, make the font larger, and use blue accents."
                                : "E.g., Create a modern payslip with a dark header, company logo on the right, and a detailed earnings table."
                            }
                            value={prompt}
                            onChange={(e) => handlePromptChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={`min-h-[120px] resize-none ${isPromptTooLong ? 'border-destructive focus-visible:ring-destructive' : ''
                                }`}
                            disabled={isGenerating}
                            maxLength={MAX_PROMPT_LENGTH + 100} // Soft limit
                        />
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                                Press Enter to generate, Shift+Enter for new line
                            </span>
                            <span className={`font-medium ${isPromptTooLong
                                ? 'text-destructive'
                                : remainingChars < 50
                                    ? 'text-yellow-600'
                                    : 'text-muted-foreground'
                                }`}>
                                {remainingChars} characters remaining
                            </span>
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">
                            Need inspiration? Try one of these:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {activeSuggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handlePromptChange(suggestion)}
                                    className="text-xs bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-md transition-colors text-left border border-border/50 hover:border-border"
                                    disabled={isGenerating}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info about redesign mode */}
                    {isRedesign && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <p className="text-xs text-blue-800 dark:text-blue-200">
                                <strong>Redesign Mode:</strong> Your existing content, variables, and data structure will be preserved. Only the visual styling and layout will change.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        disabled={isGenerating}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating || isPromptTooLong}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {isRedesign ? "Redesigning..." : "Generating..."}
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-4 w-4" />
                                {isRedesign ? "Redesign" : "Generate"}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Type guard for validating template schema
function isValidTemplateSchema(data: any): data is TemplateSchema {
    return (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.blocks) &&
        data.globalStyles &&
        typeof data.globalStyles === 'object'
    );
}
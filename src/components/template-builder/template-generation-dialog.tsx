
"use client";

import { useState } from "react";
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
import { Wand2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { TemplateSchema } from "@/types/template";

interface TemplateGenerationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TemplateGenerationDialog({ open, onOpenChange }: TemplateGenerationDialogProps) {
    const [prompt, setPrompt] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const setBlocks = useTemplateBuilderStore((state) => state.setBlocks);
    const setGlobalStyles = useTemplateBuilderStore((state) => state.setGlobalStyles);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        try {
            const response = await fetch("/api/ai/generate-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to generate template");
            }

            // Type guard for the response (simple check)
            const schema = data as TemplateSchema;

            if (schema.blocks && Array.isArray(schema.blocks)) {
                setBlocks(schema.blocks);
            }
            if (schema.globalStyles) {
                setGlobalStyles(schema.globalStyles);
            }

            toast.success("Template generated successfully!");
            onOpenChange(false);

        } catch (error: any) {
            console.error("Generation error:", error);
            toast.error(error.message || "Something went wrong during generation");
        } finally {
            setIsGenerating(false);
        }
    };

    const suggestions = [
        "A clean, modern professional payslip with a blue header",
        "A minimalist invoice style payslip with table borders",
        "A detailed salary statement with employee info on the left",
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Generate with AI
                    </DialogTitle>
                    <DialogDescription>
                        Describe the template you want to create, and we'll build the layout for you.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Textarea
                        placeholder="E.g., Create a modern payslip with a dark header, company logo on the right, and a detailed earnings table."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[120px] resize-none"
                    />

                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground font-medium">Try giving it a hint:</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setPrompt(s)}
                                    className="text-xs bg-secondary/50 hover:bg-secondary px-2 py-1 rounded-md transition-colors text-left"
                                    disabled={isGenerating}
                                >
                                    "{s}"
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-4 w-4" />
                                Generate
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

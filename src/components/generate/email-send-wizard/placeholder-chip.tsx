"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlaceholderChipProps {
    placeholder: string;
    label: string;
    description: string;
    onClick: () => void;
}

export function PlaceholderChip({ placeholder, label, description, onClick }: PlaceholderChipProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs font-mono bg-primary/5 hover:bg-primary/10 border-primary/20"
                        onClick={onClick}
                    >
                        {placeholder}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

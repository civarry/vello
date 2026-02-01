"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Command, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
    open,
    onOpenChange,
}: KeyboardShortcutsDialogProps) {
    const Kbd = ({ children }: { children: React.ReactNode }) => (
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            {children}
        </kbd>
    );

    const categories = [
        {
            title: "General",
            shortcuts: [
                { label: "Undo", keys: [<span key="cmd">⌘</span>, "Z"] },
                { label: "Redo", keys: [<span key="cmd">⌘</span>, <span key="shift">⇧</span>, "Z"] },
                { label: "Copy", keys: [<span key="cmd">⌘</span>, "C"] },
                { label: "Paste", keys: [<span key="cmd">⌘</span>, "V"] },
                { label: "Cut", keys: [<span key="cmd">⌘</span>, "X"] },
                { label: "Duplicate", keys: [<span key="cmd">⌘</span>, "D"] },
                { label: "Select All", keys: [<span key="cmd">⌘</span>, "A"] },
                { label: "Delete", keys: ["Del"] },
                { label: "Deselect", keys: ["Esc"] },
            ],
        },
        {
            title: "Grouping",
            shortcuts: [
                { label: "Group", keys: [<span key="cmd">⌘</span>, "G"] },
                { label: "Ungroup", keys: [<span key="cmd">⌘</span>, <span key="shift">⇧</span>, "G"] },
            ],
        },
        {
            title: "Layering",
            shortcuts: [
                { label: "Bring Forward", keys: [<span key="cmd">⌘</span>, "]"] },
                { label: "Send Backward", keys: [<span key="cmd">⌘</span>, "["] },
            ],
        },
        {
            title: "Movement",
            shortcuts: [
                { label: "Nudge (1px)", keys: [<ArrowUp key="up" className="w-3 h-3" />] },
                { label: "Nudge (20px)", keys: [<span key="shift">⇧</span>, <ArrowUp key="up" className="w-3 h-3" />] },
            ],
        },
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Speed up your workflow with these shortcuts.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {categories.map((category) => (
                        <div key={category.title} className="space-y-3">
                            <h4 className="font-medium text-sm text-foreground/80 border-b pb-1">
                                {category.title}
                            </h4>
                            <div className="space-y-2">
                                {category.shortcuts.map((shortcut, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">{shortcut.label}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, j) => (
                                                <Kbd key={j}>{key}</Kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useEffect } from "react";
import { DndContext } from "@dnd-kit/core";
import { BuilderToolbar } from "./toolbar/builder-toolbar";
import { BlockPalette } from "./sidebar/block-palette";
import { PropertiesPanel } from "./sidebar/properties-panel";
import { BuilderCanvas } from "./canvas/builder-canvas";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsLargeDesktop, useIsDesktop } from "@/hooks/use-media-query";

export function TemplateBuilder() {
  const isLargeDesktop = useIsLargeDesktop(); // >= 1280px
  const isDesktop = useIsDesktop(); // >= 1024px

  const {
    showLeftPanel,
    showRightPanel,
    toggleLeftPanel,
    toggleRightPanel,
    setShowLeftPanel,
    setShowRightPanel,
  } = useTemplateBuilderStore();

  // Auto-hide panels on smaller screens
  useEffect(() => {
    if (!isLargeDesktop) {
      // On smaller screens, hide both panels by default
      setShowLeftPanel(false);
      setShowRightPanel(false);
    } else {
      // On large desktops, show both panels
      setShowLeftPanel(true);
      setShowRightPanel(true);
    }
  }, [isLargeDesktop, setShowLeftPanel, setShowRightPanel]);

  return (
    <DndContext>
      <div className="flex h-screen flex-col">
        <BuilderToolbar />
        {/* Add bottom padding on mobile/tablet for the fixed bottom toolbar */}
        <div className={cn(
          "flex flex-1 overflow-hidden relative",
          !isDesktop && "pb-14" // Height of bottom toolbar
        )}>
          {/* Left Panel */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden border-r bg-background",
              showLeftPanel ? "w-56 lg:w-64" : "w-0"
            )}
          >
            <BlockPalette />
          </div>

          {/* Left Panel Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute z-40 h-10 w-7 sm:h-8 sm:w-6 rounded-r-md rounded-l-none border border-l-0 bg-background shadow-sm hover:bg-muted",
                  "top-1/2 -translate-y-1/2",
                  showLeftPanel ? "left-56 lg:left-64" : "left-0"
                )}
                style={{ transition: "left 300ms ease-in-out" }}
                onClick={toggleLeftPanel}
              >
                {showLeftPanel ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {showLeftPanel ? "Hide Elements" : "Show Elements"}
            </TooltipContent>
          </Tooltip>

          {/* Canvas */}
          <BuilderCanvas />

          {/* Right Panel Toggle Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute z-40 h-10 w-7 sm:h-8 sm:w-6 rounded-l-md rounded-r-none border border-r-0 bg-background shadow-sm hover:bg-muted",
                  "top-1/2 -translate-y-1/2",
                  showRightPanel ? "right-64 lg:right-72" : "right-0"
                )}
                style={{ transition: "right 300ms ease-in-out" }}
                onClick={toggleRightPanel}
              >
                {showRightPanel ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {showRightPanel ? "Hide Properties" : "Show Properties"}
            </TooltipContent>
          </Tooltip>

          {/* Right Panel */}
          <div
            className={cn(
              "transition-all duration-300 ease-in-out overflow-hidden border-l bg-background",
              showRightPanel ? "w-64 lg:w-72" : "w-0"
            )}
          >
            <PropertiesPanel />
          </div>
        </div>
      </div>
    </DndContext>
  );
}

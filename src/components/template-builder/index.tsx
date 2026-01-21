"use client";

import { DndContext } from "@dnd-kit/core";
import { BuilderToolbar } from "./toolbar/builder-toolbar";
import { BlockPalette } from "./sidebar/block-palette";
import { PropertiesPanel } from "./sidebar/properties-panel";
import { BuilderCanvas } from "./canvas/builder-canvas";

export function TemplateBuilder() {
  return (
    <DndContext>
      <div className="flex h-screen flex-col">
        <BuilderToolbar />
        <div className="flex flex-1 overflow-hidden">
          <BlockPalette />
          <BuilderCanvas />
          <PropertiesPanel />
        </div>
      </div>
    </DndContext>
  );
}

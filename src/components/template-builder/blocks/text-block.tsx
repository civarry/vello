"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Block, TextBlockProperties } from "@/types/template";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";

interface TextBlockProps {
  block: Block;
  isPreview?: boolean;
  data?: Record<string, unknown>;
}

export function TextBlock({ block, isPreview }: TextBlockProps) {
  const props = block.properties as TextBlockProperties;
  const { updateBlockProperties, selectedBlockId } = useTemplateBuilderStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(props.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSelected = selectedBlockId === block.id;

  useEffect(() => {
    setEditValue(props.content);
  }, [props.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      // Auto-resize
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [isEditing]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleDoubleClick = () => {
    if (!isPreview) {
      setIsEditing(true);
    }
  };

  // Debounced save function
  const debouncedSave = useCallback((value: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      updateBlockProperties(block.id, { content: value });
    }, 300);
  }, [block.id, updateBlockProperties]);

  const handleBlur = () => {
    setIsEditing(false);
    // Clear any pending debounced save and save immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (editValue !== props.content) {
      updateBlockProperties(block.id, { content: editValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setEditValue(props.content);
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    // Debounced save to store
    debouncedSave(newValue);
  };

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full resize-none border-none bg-transparent p-0 focus:outline-none focus:ring-0"
        style={{
          fontFamily: "inherit",
          fontSize: "inherit",
          fontWeight: "inherit",
          color: "inherit",
          textAlign: "inherit",
          lineHeight: "inherit",
        }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={!isPreview && isSelected ? "cursor-text" : ""}
    >
      {props.content || (
        <span className="text-muted-foreground italic">
          {props.placeholder || "Double-click to edit..."}
        </span>
      )}
    </div>
  );
}

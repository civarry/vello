import { useEffect } from "react";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";

export function useKeyboardShortcuts() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    removeSelectedBlocks,
    copySelectedBlocks,
    pasteBlocks,
    duplicateSelectedBlocks,
    selectAllBlocks,
    nudgeSelectedBlocks,
    groupSelectedBlocks,
    ungroupSelectedBlocks,
    selectedBlockIds,
  } = useTemplateBuilderStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if ((e.target as Element).tagName === "INPUT" || (e.target as Element).tagName === "TEXTAREA") {
        return;
      }

      // Check for modifier keys
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // Undo: Cmd/Ctrl+Z
      if (isCmdOrCtrl && !isShift && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
      // Redo: Cmd/Ctrl+Shift+Z
      else if (isCmdOrCtrl && isShift && e.key.toLowerCase() === "z") {
        e.preventDefault();
        redo();
      }
      // Delete/Backspace: Delete or Backspace
      else if ((e.key === "Delete" || e.key === "Backspace") && selectedBlockIds.length > 0) {
        e.preventDefault();
        removeSelectedBlocks();
      }
      // Copy: Cmd/Ctrl+C
      else if (isCmdOrCtrl && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copySelectedBlocks();
      }
      // Cut: Cmd/Ctrl+X
      else if (isCmdOrCtrl && e.key.toLowerCase() === "x") {
        e.preventDefault();
        if (selectedBlockIds.length > 0) {
          copySelectedBlocks();
          removeSelectedBlocks();
        }
      }
      // Paste: Cmd/Ctrl+V
      // Only prevent default and paste internal blocks if we have something in the clipboard
      // Otherwise, let the external paste handler (use-external-paste hook) handle it
      else if (isCmdOrCtrl && e.key.toLowerCase() === "v") {
        const state = useTemplateBuilderStore.getState();
        if (state.clipboard && state.clipboard.length > 0) {
          e.preventDefault();
          pasteBlocks();
        }
        // If no internal clipboard, don't prevent default - let external paste work
      }
      // Duplicate: Cmd/Ctrl+D
      else if (isCmdOrCtrl && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelectedBlocks();
      }
      // Select All: Cmd/Ctrl+A
      else if (isCmdOrCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllBlocks();
      }
      // Group: Cmd/Ctrl+G
      else if (isCmdOrCtrl && e.key.toLowerCase() === "g" && !isShift) {
        e.preventDefault();
        groupSelectedBlocks();
      }
      // Ungroup: Cmd/Ctrl+Shift+G
      else if (isCmdOrCtrl && isShift && e.key.toLowerCase() === "g") {
        e.preventDefault();
        ungroupSelectedBlocks();
      }
      // Nudge with arrow keys
      else if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        if (selectedBlockIds.length > 0) {
          e.preventDefault();
          let dx = 0;
          let dy = 0;
          const step = isShift ? 10 : 1; // 1px normally, 10px with shift

          switch (e.key) {
            case "ArrowUp":
              dy = -step;
              break;
            case "ArrowDown":
              dy = step;
              break;
            case "ArrowLeft":
              dx = -step;
              break;
            case "ArrowRight":
              dx = step;
              break;
          }

          nudgeSelectedBlocks(dx, dy);
        }
      }
      // Deselect all: Escape
      else if (e.key === "Escape") {
        useTemplateBuilderStore.getState().selectBlock(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    removeSelectedBlocks,
    copySelectedBlocks,
    pasteBlocks,
    duplicateSelectedBlocks,
    selectAllBlocks,
    nudgeSelectedBlocks,
    groupSelectedBlocks,
    ungroupSelectedBlocks,
    selectedBlockIds,
  ]);
}
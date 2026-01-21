"use client";

import { useState } from "react";
import { useTemplateBuilderStore } from "@/stores/template-builder-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Block,
  BlockStyle,
  TextBlockProperties,
  TableBlockProperties,
  ImageBlockProperties,
  DividerBlockProperties,
  SpacerBlockProperties,
} from "@/types/template";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Table2,
  Image,
  Minus,
  Square,
  Upload,
  Loader2,
  Link,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertiesPanel() {
  const { blocks, selectedBlockId, updateBlockProperties, updateBlockStyle } =
    useTemplateBuilderStore();
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  if (!selectedBlock) {
    return (
      <div className="w-72 border-l bg-muted/30 p-4">
        <h3 className="mb-4 text-sm font-semibold">Properties</h3>
        <p className="text-sm text-muted-foreground">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const blockIcons: Record<string, React.ElementType> = {
    text: Type,
    table: Table2,
    image: Image,
    divider: Minus,
    spacer: Square,
  };

  const Icon = blockIcons[selectedBlock.type] || Type;

  return (
    <div className="w-72 border-l bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold capitalize">
            {selectedBlock.type}
          </h3>
        </div>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid w-auto grid-cols-2">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="style">Style</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 pt-2">
          <ContentProperties
            block={selectedBlock}
            onUpdate={(props) => updateBlockProperties(selectedBlock.id, props)}
          />
        </TabsContent>

        <TabsContent value="style" className="flex-1 overflow-y-auto p-4 pt-2">
          <StyleProperties
            style={selectedBlock.style}
            onUpdate={(style) => updateBlockStyle(selectedBlock.id, style)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ContentPropertiesProps {
  block: Block;
  onUpdate: (props: Partial<Block["properties"]>) => void;
}

function ContentProperties({ block, onUpdate }: ContentPropertiesProps) {
  switch (block.type) {
    case "text":
      return <TextContentProps properties={block.properties as TextBlockProperties} onUpdate={onUpdate} />;
    case "table":
      return <TableContentProps properties={block.properties as TableBlockProperties} onUpdate={onUpdate} />;
    case "image":
      return <ImageContentProps properties={block.properties as ImageBlockProperties} onUpdate={onUpdate} />;
    case "divider":
      return <DividerContentProps properties={block.properties as DividerBlockProperties} onUpdate={onUpdate} />;
    case "spacer":
      return <SpacerContentProps properties={block.properties as SpacerBlockProperties} onUpdate={onUpdate} />;
    default:
      return <p className="text-sm text-muted-foreground">No content properties</p>;
  }
}

function TextContentProps({
  properties,
  onUpdate,
}: {
  properties: TextBlockProperties;
  onUpdate: (props: Partial<TextBlockProperties>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Content</Label>
        <Textarea
          value={properties.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          rows={4}
          placeholder="Enter text..."
          className="mt-1"
        />
      </div>
    </div>
  );
}

function TableContentProps({
  properties,
  onUpdate,
}: {
  properties: TableBlockProperties;
  onUpdate: (props: Partial<TableBlockProperties>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Show Borders</Label>
        <Switch
          checked={properties.showBorders}
          onCheckedChange={(checked) => onUpdate({ showBorders: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label>Striped Rows</Label>
        <Switch
          checked={properties.stripedRows}
          onCheckedChange={(checked) => onUpdate({ stripedRows: checked })}
        />
      </div>
      <div>
        <Label>Header Background</Label>
        <Input
          type="color"
          value={properties.headerBackground || "#f3f4f6"}
          onChange={(e) => onUpdate({ headerBackground: e.target.value })}
          className="mt-1 h-9"
        />
      </div>
      <Separator />
      <p className="text-xs text-muted-foreground">
        Double-click cells to edit. Hover over table to add rows/columns.
      </p>
    </div>
  );
}

function ImageContentProps({
  properties,
  onUpdate,
}: {
  properties: ImageBlockProperties;
  onUpdate: (props: Partial<ImageBlockProperties>) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      onUpdate({ src: result.url });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div>
        <Label>Image Source</Label>
        <div className="mt-1 space-y-2">
          {/* Upload Button */}
          <label
            className={cn(
              "flex items-center justify-center gap-2 w-full h-10 px-4 py-2 rounded-md border border-dashed cursor-pointer transition-colors",
              isUploading ? "bg-muted cursor-not-allowed" : "hover:bg-muted/50"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload Image</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
          </label>

          {/* Toggle URL Input */}
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link className="h-3 w-3" />
            {showUrlInput ? "Hide URL input" : "Use URL instead"}
          </button>

          {/* URL Input */}
          {showUrlInput && (
            <Input
              value={properties.src}
              onChange={(e) => onUpdate({ src: e.target.value })}
              placeholder="https://example.com/image.png"
            />
          )}
        </div>

        {uploadError && (
          <p className="text-xs text-destructive mt-1">{uploadError}</p>
        )}
      </div>

      {/* Preview */}
      {properties.src && (
        <div className="border rounded-md overflow-hidden">
          <img
            src={properties.src}
            alt="Preview"
            className="w-full h-24 object-contain bg-muted/30"
          />
          <button
            onClick={() => onUpdate({ src: "" })}
            className="w-full py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
          >
            Remove image
          </button>
        </div>
      )}

      <Separator />

      <div>
        <Label>Alt Text</Label>
        <Input
          value={properties.alt || ""}
          onChange={(e) => onUpdate({ alt: e.target.value })}
          placeholder="Image description"
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Width</Label>
          <Input
            value={properties.width || "100%"}
            onChange={(e) => onUpdate({ width: e.target.value })}
            placeholder="100% or 200px"
            className="mt-1"
          />
        </div>
        <div>
          <Label>Height</Label>
          <Input
            value={properties.height || "auto"}
            onChange={(e) => onUpdate({ height: e.target.value })}
            placeholder="auto or 100px"
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label>Fit</Label>
        <Select
          value={properties.objectFit || "contain"}
          onValueChange={(value) => onUpdate({ objectFit: value as ImageBlockProperties["objectFit"] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function DividerContentProps({
  properties,
  onUpdate,
}: {
  properties: DividerBlockProperties;
  onUpdate: (props: Partial<DividerBlockProperties>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Thickness (px)</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={properties.thickness || 1}
          onChange={(e) => onUpdate({ thickness: parseInt(e.target.value) || 1 })}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Color</Label>
        <Input
          type="color"
          value={properties.color || "#e5e7eb"}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="mt-1 h-9"
        />
      </div>
      <div>
        <Label>Style</Label>
        <Select
          value={properties.style || "solid"}
          onValueChange={(value) => onUpdate({ style: value as DividerBlockProperties["style"] })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SpacerContentProps({
  properties,
  onUpdate,
}: {
  properties: SpacerBlockProperties;
  onUpdate: (props: Partial<SpacerBlockProperties>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Height (px)</Label>
        <Input
          type="number"
          min={4}
          max={200}
          value={properties.height || 24}
          onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 24 })}
          className="mt-1"
        />
      </div>
    </div>
  );
}

interface StylePropertiesProps {
  style: BlockStyle;
  onUpdate: (style: Partial<BlockStyle>) => void;
}

function StyleProperties({ style, onUpdate }: StylePropertiesProps) {
  return (
    <div className="space-y-6">
      {/* Position & Size */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3">POSITION & SIZE</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>X</Label>
              <Input
                type="number"
                min={0}
                value={Math.round(style.x)}
                onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Y</Label>
              <Input
                type="number"
                min={0}
                value={Math.round(style.y)}
                onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Width</Label>
              <Input
                type="number"
                min={20}
                value={Math.round(style.width)}
                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 100 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Height</Label>
              <Input
                type="number"
                min={20}
                value={Math.round(style.height)}
                onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 40 })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Typography */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3">TYPOGRAPHY</h4>
        <div className="space-y-3">
          <div>
            <Label>Font Size (px)</Label>
            <Input
              type="number"
              min={8}
              max={72}
              value={style.fontSize || 12}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 12 })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Font Weight</Label>
            <Select
              value={style.fontWeight || "normal"}
              onValueChange={(value) => onUpdate({ fontWeight: value as BlockStyle["fontWeight"] })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="semibold">Semibold</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Text Align</Label>
            <div className="flex gap-1 mt-1">
              {[
                { value: "left", icon: AlignLeft },
                { value: "center", icon: AlignCenter },
                { value: "right", icon: AlignRight },
              ].map(({ value, icon: AlignIcon }) => (
                <button
                  key={value}
                  onClick={() => onUpdate({ textAlign: value as BlockStyle["textAlign"] })}
                  className={cn(
                    "flex-1 flex items-center justify-center h-9 rounded border transition-colors",
                    style.textAlign === value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  <AlignIcon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Text Color</Label>
            <Input
              type="color"
              value={style.color || "#1a1a1a"}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="mt-1 h-9"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Spacing */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3">INNER PADDING</h4>
        <div className="space-y-3">
          <div>
            <Label>Padding (px)</Label>
            <div className="grid grid-cols-4 gap-1 mt-1">
              <Input
                type="number"
                min={0}
                placeholder="T"
                value={style.paddingTop ?? 8}
                onChange={(e) => onUpdate({ paddingTop: parseInt(e.target.value) || 0 })}
                className="text-center"
              />
              <Input
                type="number"
                min={0}
                placeholder="R"
                value={style.paddingRight ?? 8}
                onChange={(e) => onUpdate({ paddingRight: parseInt(e.target.value) || 0 })}
                className="text-center"
              />
              <Input
                type="number"
                min={0}
                placeholder="B"
                value={style.paddingBottom ?? 8}
                onChange={(e) => onUpdate({ paddingBottom: parseInt(e.target.value) || 0 })}
                className="text-center"
              />
              <Input
                type="number"
                min={0}
                placeholder="L"
                value={style.paddingLeft ?? 8}
                onChange={(e) => onUpdate({ paddingLeft: parseInt(e.target.value) || 0 })}
                className="text-center"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Top, Right, Bottom, Left</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Background & Border */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-3">BACKGROUND & BORDER</h4>
        <div className="space-y-3">
          <div>
            <Label>Background Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="color"
                value={style.backgroundColor || "#ffffff"}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                className="h-9 w-12"
              />
              <Input
                type="text"
                value={style.backgroundColor || "transparent"}
                onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                placeholder="transparent"
                className="flex-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Border Width</Label>
              <Input
                type="number"
                min={0}
                max={10}
                value={style.borderWidth ?? 0}
                onChange={(e) => onUpdate({ borderWidth: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Border Radius</Label>
              <Input
                type="number"
                min={0}
                max={50}
                value={style.borderRadius ?? 0}
                onChange={(e) => onUpdate({ borderRadius: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label>Border Color</Label>
            <Input
              type="color"
              value={style.borderColor || "#e5e7eb"}
              onChange={(e) => onUpdate({ borderColor: e.target.value })}
              className="mt-1 h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type {
  Block,
  BlockStyle,
  GlobalStyles,
  TextBlockProperties,
  TableBlockProperties,
  ImageBlockProperties,
  ContainerBlockProperties,
  DividerBlockProperties,
  SpacerBlockProperties,
} from "@/types/template";

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2",
      fontWeight: 700,
    },
  ],
});

const PAPER_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  LETTER: { width: 612, height: 792 },
  LEGAL: { width: 612, height: 1008 },
};

interface TemplatePDFProps {
  blocks: Block[];
  globalStyles: GlobalStyles;
  paperSize?: "A4" | "LETTER" | "LEGAL";
  orientation?: "PORTRAIT" | "LANDSCAPE";
}

function mapFontWeight(weight?: string): number {
  switch (weight) {
    case "medium":
      return 500;
    case "semibold":
      return 600;
    case "bold":
      return 700;
    default:
      return 400;
  }
}

function createBlockStyles(style: BlockStyle, globalStyles: GlobalStyles) {
  // Convert pixel positions to points (1pt = 1/72 inch, 1px ≈ 0.75pt at 96 DPI)
  const pxToPt = 0.75;

  return StyleSheet.create({
    block: {
      position: "absolute",
      left: style.x * pxToPt,
      top: style.y * pxToPt,
      width: style.width * pxToPt,
      height: style.height * pxToPt,
      paddingTop: (style.paddingTop ?? 0) * pxToPt,
      paddingBottom: (style.paddingBottom ?? 0) * pxToPt,
      paddingLeft: (style.paddingLeft ?? 0) * pxToPt,
      paddingRight: (style.paddingRight ?? 0) * pxToPt,
      fontSize: (style.fontSize ?? globalStyles.fontSize) * pxToPt,
      fontWeight: mapFontWeight(style.fontWeight),
      // fontFamily: style.fontFamily || globalStyles.fontFamily || "Helvetica",
      fontFamily: "Helvetica",
      textAlign: style.textAlign ?? "left",
      color: style.color ?? globalStyles.primaryColor,
      backgroundColor: style.backgroundColor,
      borderWidth: style.borderWidth !== undefined ? style.borderWidth * pxToPt : undefined,
      borderColor: style.borderColor,
      borderRadius: style.borderRadius !== undefined ? style.borderRadius * pxToPt : undefined,
      borderStyle: style.borderStyle,
      overflow: "hidden",
    },
  });
}

function TextBlock({
  block,
  globalStyles,
}: {
  block: Block;
  globalStyles: GlobalStyles;
}) {
  const properties = block.properties as TextBlockProperties;
  const styles = createBlockStyles(block.style, globalStyles);

  return (
    <View style={styles.block}>
      <Text>{properties.content || ""}</Text>
    </View>
  );
}

function TableBlock({
  block,
  globalStyles,
}: {
  block: Block;
  globalStyles: GlobalStyles;
}) {
  const properties = block.properties as TableBlockProperties;
  const styles = createBlockStyles(block.style, globalStyles);
  const pxToPt = 0.75;

  const tableStyles = StyleSheet.create({
    table: {
      ...styles.block,
      display: "flex",
      flexDirection: "column",
      ...(properties.showBorders && {
        borderWidth: 1 * pxToPt,
        borderColor: "#e5e7eb",
        borderStyle: "solid",
      }),
      height: "auto", // Allow table to shrink to fit rows
    },
    row: {
      display: "flex",
      flexDirection: "row",
      borderBottomWidth: properties.showBorders ? 1 * pxToPt : 0,
      borderBottomColor: "#e5e7eb",
      borderBottomStyle: "solid",
    },
    headerRow: {
      backgroundColor: properties.headerBackground || "#f3f4f6",
      fontWeight: 600,
    },
    stripedRow: {
      backgroundColor: "#f9fafb",
    },
    cell: {
      flex: 1,
      padding: (properties.compact ? 2 : 6) * pxToPt,
      borderRightWidth: properties.showBorders ? 1 * pxToPt : 0,
      borderRightColor: "#e5e7eb",
      borderRightStyle: "solid",
    },
    lastCell: {
      borderRightWidth: 0,
    },
  });

  const getRowStyle = (row: TableBlockProperties["rows"][0], rowIndex: number) => {
    if (row.isHeader) {
      return { ...tableStyles.row, ...tableStyles.headerRow };
    } else if (properties.stripedRows && rowIndex % 2 === 1) {
      return { ...tableStyles.row, ...tableStyles.stripedRow };
    }
    return tableStyles.row;
  };

  const getCellStyle = (cellIndex: number, totalCells: number) => {
    if (cellIndex === totalCells - 1) {
      return { ...tableStyles.cell, ...tableStyles.lastCell };
    }
    return tableStyles.cell;
  };

  return (
    <View style={tableStyles.table}>
      {properties.rows.map((row, rowIndex) => (
        <View key={rowIndex} style={getRowStyle(row, rowIndex)}>
          {row.cells.map((cell, cellIndex) => (
            <View
              key={cellIndex}
              style={getCellStyle(cellIndex, row.cells.length)}
            >
              <Text
                style={{
                  fontSize: (cell.style?.fontSize ?? block.style.fontSize ?? 10) * pxToPt,
                  fontWeight: mapFontWeight(
                    cell.style?.fontWeight ?? (row.isHeader ? "semibold" : "normal")
                  ),
                  textAlign: cell.style?.textAlign ?? "left",
                  color: cell.style?.color ?? block.style.color,
                }}
              >
                {cell.content}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ImageBlock({
  block,
  globalStyles,
}: {
  block: Block;
  globalStyles: GlobalStyles;
}) {
  const properties = block.properties as ImageBlockProperties;
  const styles = createBlockStyles(block.style, globalStyles);

  if (!properties.src) {
    return null;
  }

  // Validate src to prevent "Not valid image extension" error
  const isValidSrc =
    properties.src.startsWith("data:") ||
    properties.src.startsWith("http://") ||
    properties.src.startsWith("https://") ||
    properties.src.startsWith("/");

  if (!isValidSrc) {
    console.warn(`[ImageBlock] Invalid image source detected (skipping): ${properties.src.substring(0, 50)}...`);
    return null;
  }

  // Skip remote URLs without valid extensions - react-pdf cannot infer format
  // These should be pre-processed to data URLs via preprocessBlocksForPdf()
  if (properties.src.startsWith("http") && !/\.(jpg|jpeg|png|bmp|gif)(\?.*)?$/i.test(properties.src)) {
    console.warn(`[ImageBlock] Skipping image without valid extension (use preprocessBlocksForPdf): ${properties.src.substring(0, 80)}...`);
    return null;
  }

  // Helper to parse numeric dimensions safely
  const parseNumericDimension = (value: string | undefined): number | "auto" => {
    if (!value) return "auto";
    const num = parseFloat(value);
    // Check if it's a valid number and doesn't contain % or other units
    if (!isNaN(num) && /^\d+(\.\d+)?$/.test(value.trim())) {
      return num * 0.75;
    }
    return "auto";
  };

  return (
    <View style={styles.block}>
      <Image
        src={properties.src}
        style={{
          width: parseNumericDimension(properties.width),
          height: parseNumericDimension(properties.height),
          objectFit: properties.objectFit ?? "contain",
        }}
      />
    </View>
  );
}

function ContainerBlock({
  block,
  globalStyles,
}: {
  block: Block;
  globalStyles: GlobalStyles;
}) {
  const properties = block.properties as ContainerBlockProperties;
  const styles = createBlockStyles(block.style, globalStyles);
  const pxToPt = 0.75;

  // If container has children with positions, use absolute positioning (grouped blocks)
  if (properties.children && properties.children.length > 0) {
    // For grouped blocks, we need to render children at their absolute page positions
    // because react-pdf has issues with nested absolute positioning
    // So we render each child as a separate absolute block on the page
    return (
      <>
        {properties.children.map((childBlock) => {
          // Convert child's relative position back to absolute page position
          const absoluteX = block.style.x + childBlock.style.x;
          const absoluteY = block.style.y + childBlock.style.y;

          // Create a block with absolute page coordinates for rendering
          const childWithAbsolutePos = {
            ...childBlock,
            style: {
              ...childBlock.style,
              x: absoluteX,
              y: absoluteY,
            },
          };

          return (
            <BlockRenderer
              key={childBlock.id}
              block={childWithAbsolutePos}
              globalStyles={globalStyles}
            />
          );
        })}
      </>
    );
  }

  // Empty container placeholder (won't render in PDF)
  return <View style={styles.block} />;
}

function DividerBlock({
  block,
  globalStyles,
}: {
  block: Block;
  globalStyles: GlobalStyles;
}) {
  const properties = block.properties as DividerBlockProperties;
  const styles = createBlockStyles(block.style, globalStyles);
  const pxToPt = 0.75;

  return (
    <View
      style={[
        styles.block,
        {
          borderBottomWidth: (properties.thickness ?? 1) * pxToPt,
          borderBottomColor: properties.color ?? "#e5e7eb",
          borderBottomStyle: properties.style ?? "solid",
        },
      ]}
    />
  );
}

function SpacerBlock({ block }: { block: Block }) {
  const properties = block.properties as SpacerBlockProperties;
  const pxToPt = 0.75;

  return <View style={{ height: (properties.height ?? 20) * pxToPt }} />;
}

function BlockRenderer({
  block,
  globalStyles,
}: {
  block: Block;
  globalStyles: GlobalStyles;
}) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} globalStyles={globalStyles} />;
    case "table":
      return <TableBlock block={block} globalStyles={globalStyles} />;
    case "image":
      return <ImageBlock block={block} globalStyles={globalStyles} />;
    case "container":
      return <ContainerBlock block={block} globalStyles={globalStyles} />;
    case "divider":
      return <DividerBlock block={block} globalStyles={globalStyles} />;
    case "spacer":
      return <SpacerBlock block={block} />;
    default:
      return null;
  }
}

export function TemplatePDF({
  blocks,
  globalStyles,
  paperSize = "A4",
  orientation = "PORTRAIT",
}: TemplatePDFProps) {
  const dimensions = PAPER_SIZES[paperSize];
  const width =
    orientation === "PORTRAIT" ? dimensions.width : dimensions.height;
  const height =
    orientation === "PORTRAIT" ? dimensions.height : dimensions.width;

  const pageStyles = StyleSheet.create({
    page: {
      padding: 40 * 0.75, // Apply scaling to padding too
      fontFamily: "Helvetica",
      fontSize: globalStyles.fontSize * 0.75, // Apply scaling
      color: globalStyles.primaryColor,
    },
  });

  return (
    <Document>
      <Page size={{ width, height }} style={pageStyles.page}>
        {blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            globalStyles={globalStyles}
          />
        ))}
      </Page>
    </Document>
  );
}

export { BlockRenderer };

/**
 * Converts a remote image URL to a data URL by fetching it.
 * This is needed because react-pdf cannot infer image format for URLs without extensions.
 */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[fetchImageAsDataUrl] Failed to fetch image: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn(`[fetchImageAsDataUrl] Invalid content type: ${contentType}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn(`[fetchImageAsDataUrl] Error fetching image:`, error);
    return null;
  }
}

/**
 * Pre-processes blocks to convert remote image URLs (without extensions) to data URLs.
 * Call this before rendering TemplatePDF to avoid "Not valid image extension" errors.
 */
export async function preprocessBlocksForPdf(blocks: Block[]): Promise<Block[]> {
  const processBlock = async (block: Block): Promise<Block> => {
    if (block.type === "image") {
      const props = block.properties as ImageBlockProperties;
      if (
        props.src &&
        props.src.startsWith("http") &&
        !/\.(jpg|jpeg|png|bmp|gif)(\?.*)?$/i.test(props.src)
      ) {
        const dataUrl = await fetchImageAsDataUrl(props.src);
        if (dataUrl) {
          return {
            ...block,
            properties: { ...props, src: dataUrl },
          };
        }
      }
    }

    if (block.type === "container") {
      const props = block.properties as ContainerBlockProperties;
      if (props.children && props.children.length > 0) {
        const processedChildren = await Promise.all(
          props.children.map(processBlock)
        );
        return {
          ...block,
          properties: { ...props, children: processedChildren },
        };
      }
    }

    return block;
  };

  return Promise.all(blocks.map(processBlock));
}

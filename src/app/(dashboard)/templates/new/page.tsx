"use client";

import dynamic from "next/dynamic";

const TemplateBuilder = dynamic(
  () => import("@/components/template-builder").then((mod) => mod.TemplateBuilder),
  { ssr: false }
);

export default function NewTemplatePage() {
  return <TemplateBuilder />;
}

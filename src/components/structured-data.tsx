export function StructuredData() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vello-mauve.vercel.app";

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vello",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    description:
      "Professional HR payslip template builder and document generator. Design custom payslip templates, manage employee data, and generate PDF documents with multi-send capabilities.",
    url: baseUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available",
    },
    featureList: [
      "Drag-and-drop template builder",
      "Custom payslip design",
      "PDF document generation",
      "Employee data management",
      "Excel import/export",
      "Multi-send document distribution",
      "Template library",
    ],
    screenshot: `${baseUrl}/og-image.png`,
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Vello",
    url: baseUrl,
    logo: `${baseUrl}/og-image.png`,
    description:
      "Vello is a multi-tenant SaaS platform for HR teams to design payslip templates and generate professional documents.",
    sameAs: [],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplication),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organization),
        }}
      />
    </>
  );
}

import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Vello - HR Payslip Template Builder";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: "absolute",
            top: -200,
            left: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.1) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -300,
            right: -200,
            width: 800,
            height: 800,
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.05) 100%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 80,
            height: 80,
            borderRadius: 16,
            backgroundColor: "white",
            marginBottom: 24,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              fill="#0d9488"
            />
            <path d="M14 2v6h6" fill="#0d9488" />
            <line x1="8" y1="13" x2="16" y2="13" stroke="white" strokeWidth="2" />
            <line x1="8" y1="17" x2="14" y2="17" stroke="white" strokeWidth="2" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "white",
            marginBottom: 16,
          }}
        >
          Vello
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.9)",
            marginBottom: 12,
          }}
        >
          HR Payslip Template Builder
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: "rgba(255, 255, 255, 0.7)",
            marginBottom: 40,
          }}
        >
          Design. Generate. Distribute.
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 16 }}>
          {["Template Builder", "PDF Export", "Multi-Send", "Employee Data"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  borderRadius: 18,
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "white",
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

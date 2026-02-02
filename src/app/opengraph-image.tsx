import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Vello - HR Payslip Template Builder";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vello-mauve.vercel.app";

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${baseUrl}/icon.png`}
          alt="Vello Logo"
          width={120}
          height={120}
          style={{
            borderRadius: 24,
            marginBottom: 24,
          }}
        />

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

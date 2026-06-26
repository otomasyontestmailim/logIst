import { ImageResponse } from "next/og";

export const runtime = "edge";

export function GET() {
  return new ImageResponse(
    <div
      style={{
        background: "#0f172a",
        width: "512px",
        height: "512px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "100px",
      }}
    >
      <svg
        width="320"
        height="320"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    </div>,
    { width: 512, height: 512 },
  );
}

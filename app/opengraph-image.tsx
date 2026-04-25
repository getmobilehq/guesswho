import { ImageResponse } from "next/og";

export const alt = "Guess Who — A Storytelling Party Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          background:
            "radial-gradient(ellipse at top, rgba(31, 31, 85, 0.45) 0%, transparent 55%), radial-gradient(ellipse at bottom right, rgba(201, 162, 39, 0.18) 0%, transparent 60%), #0D0D2B",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            color: "#F4C753",
            letterSpacing: 12,
            fontSize: 22,
            marginBottom: 28,
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 600,
          }}
        >
          A Storytelling Party Game
        </div>
        <div
          style={{
            display: "flex",
            color: "#FDFAF0",
            fontSize: 192,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          Guess
          <span style={{ color: "#F4C753" }}>Who.</span>
        </div>
        <div
          style={{
            display: "flex",
            color: "#9D9BB8",
            fontSize: 32,
            fontStyle: "italic",
            marginTop: 36,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          Anonymous answers. Live guessing. The stories behind each one.
        </div>
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 56,
            color: "#9D9BB8",
            fontSize: 18,
            letterSpacing: 6,
            fontFamily: "system-ui, sans-serif",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "#F4C753" }}>·</span>
          <span style={{ margin: "0 16px" }}>Friday-night fellowship</span>
          <span style={{ color: "#F4C753" }}>·</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

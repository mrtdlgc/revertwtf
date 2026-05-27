import { ImageResponse } from "next/og";

export const cardSize = {
  width: 1200,
  height: 630,
};

export function renderOgCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#06080d",
          color: "#f6efd8",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
          border: "18px solid #d7ff19",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 34,
            display: "flex",
            border: "3px solid rgba(246, 239, 216, 0.72)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 58,
            display: "flex",
            alignItems: "center",
            gap: 22,
          }}
        >
          <div
            style={{
              width: 82,
              height: 82,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#d7ff19",
              color: "#06080d",
              border: "3px solid #f6efd8",
              boxShadow: "10px 10px 0 #ff3d6e",
              fontSize: 56,
              fontWeight: 900,
            }}
          >
            !
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 58,
                fontWeight: 900,
                lineHeight: 0.9,
              }}
            >
              revert<span style={{ color: "#d7ff19" }}>.wtf</span>
            </div>
            <div
              style={{
                marginTop: 12,
                fontSize: 18,
                fontWeight: 800,
                color: "rgba(246, 239, 216, 0.62)",
                textTransform: "uppercase",
              }}
            >
              EVM error explanations for apps and agents
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 64,
            right: 84,
            top: 205,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ fontSize: 88, fontWeight: 900, lineHeight: 0.92 }}>
            EVM errors should not be this vague.
          </div>
          <div
            style={{
              marginTop: 28,
              width: 790,
              fontSize: 30,
              lineHeight: 1.28,
              color: "rgba(246, 239, 216, 0.78)",
            }}
          >
            Reverts, RPC codes, wallet failures, simulation traces, ERC-4337,
            x402, selectors, and protocol-specific failure modes.
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 64,
            bottom: 64,
            width: 370,
            height: 170,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#f6efd8",
            color: "#06080d",
            border: "3px solid #06080d",
            boxShadow: "10px 10px 0 #36d5c8",
            padding: 22,
          }}
        >
          <div style={{ display: "flex", fontSize: 20, fontWeight: 900 }}>
            CATALOG / PARSER / MCP
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              fontSize: 16,
              fontWeight: 900,
              color: "#06080d",
            }}
          >
            <span>protocol catalog</span>
            <span style={{ color: "#ff3d6e" }}>0xWHY</span>
            <span>agent skills</span>
            <span>x402</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 64,
            bottom: 64,
            display: "flex",
            gap: 12,
          }}
        >
          {["EXPLAIN", "MATCH", "DECODE", "ACT"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                border: "2px solid #f6efd8",
                padding: "10px 14px",
                color: "#d7ff19",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            right: -46,
            top: 110,
            width: 280,
            height: 70,
            display: "flex",
            transform: "rotate(90deg)",
            color: "rgba(215, 255, 25, 0.34)",
            fontSize: 18,
            fontWeight: 900,
          }}
        >
          0x08c379a0 / 0x4e487b71
        </div>
      </div>
    ),
    cardSize,
  );
}

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
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#06080d",
          color: "#f6efd8",
          fontFamily: "Arial, Helvetica, sans-serif",
          position: "relative",
          overflow: "hidden",
          border: "18px solid #d7ff19",
          padding: "52px 60px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 34,
            display: "flex",
            border: "3px solid rgba(246, 239, 216, 0.72)",
            pointerEvents: "none",
          }}
        />

        {/* Header: logo + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 78,
              height: 78,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#d7ff19",
              color: "#06080d",
              border: "3px solid #f6efd8",
              boxShadow: "9px 9px 0 #ff3d6e",
              fontSize: 52,
              fontWeight: 900,
            }}
          >
            !
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 54,
                fontWeight: 900,
                lineHeight: 0.9,
              }}
            >
              revert<span style={{ color: "#d7ff19" }}>.wtf</span>
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 17,
                fontWeight: 800,
                color: "rgba(246, 239, 216, 0.62)",
                textTransform: "uppercase",
              }}
            >
              EVM error explanations for apps and agents
            </div>
          </div>
        </div>

        {/* Headline + subtitle */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 1000 }}>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 900, lineHeight: 0.96 }}>
            EVM errors should not be this vague.
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              maxWidth: 880,
              fontSize: 27,
              lineHeight: 1.3,
              color: "rgba(246, 239, 216, 0.78)",
            }}
          >
            Reverts, RPC codes, wallet failures, simulation traces, ERC-4337,
            x402, selectors, and protocol-specific failure modes.
          </div>
        </div>

        {/* Footer: stage chips + chrome extension badge */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 10 }}>
              {["EXPLAIN", "MATCH", "DECODE", "ACT"].map((label) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    border: "2px solid #f6efd8",
                    padding: "9px 13px",
                    color: "#d7ff19",
                    fontSize: 17,
                    fontWeight: 900,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 1,
                color: "rgba(246, 239, 216, 0.5)",
              }}
            >
              CATALOG · PARSER · MCP · 0xWHY
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 372,
              background: "#f6efd8",
              color: "#06080d",
              border: "3px solid #06080d",
              boxShadow: "9px 9px 0 #36d5c8",
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 15,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              <span
                style={{
                  display: "flex",
                  background: "#ff3d6e",
                  color: "#f6efd8",
                  padding: "3px 8px",
                }}
              >
                NEW
              </span>
              <span style={{ display: "flex" }}>Chrome extension</span>
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 24, fontWeight: 900 }}>
              revert.wtf explorer
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 16, lineHeight: 1.25 }}>
              Decode reverts inline on Etherscan & Blockscout.
            </div>
          </div>
        </div>
      </div>
    ),
    cardSize,
  );
}

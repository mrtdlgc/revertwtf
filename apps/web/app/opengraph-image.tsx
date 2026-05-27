import { renderOgCard } from "./og-card";

export const alt = "revert.wtf - EVM error explanations";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return renderOgCard();
}

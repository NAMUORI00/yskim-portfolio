export interface PortfolioTheme {
  bg: string;
  surface: string;
  border: string;
  text: string;
  sub: string;
  muted: string;
  green: string;
  greenLight: string;
  greenBg: string;
  sidebarBg: string;
}

export const FONT_SANS =
  "'Nanum Gothic', 'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif";
export const FONT_SERIF = "'Noto Serif KR', Georgia, serif";
export const FONT_MONO = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace";

export const LIGHT: PortfolioTheme = {
  bg: "#f7f7f3",
  surface: "#ffffff",
  border: "#deded6",
  text: "#171a17",
  sub: "#42473f",
  muted: "#626a60",
  green: "#275f47",
  greenLight: "#3f8a65",
  greenBg: "#e7f1ea",
  sidebarBg: "#ffffff",
};

export const DARK: PortfolioTheme = {
  bg: "#171a17",
  surface: "#20251f",
  border: "#343b33",
  text: "#f0eee8",
  sub: "#c9c5bb",
  muted: "#a7b0a4",
  green: "#74c69d",
  greenLight: "#95d8b4",
  greenBg: "#1f3328",
  sidebarBg: "#20251f",
};

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function luminanceChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = hexToRgb(foreground).map(luminanceChannel);
  const bg = hexToRgb(background).map(luminanceChannel);
  const fgLuminance = 0.2126 * fg[0] + 0.7152 * fg[1] + 0.0722 * fg[2];
  const bgLuminance = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

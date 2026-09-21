function withoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const appConfig = {
  name:
    process.env.NEXT_PUBLIC_APP_NAME ??
    "Seva First Innovation Challenge 2026",
  shortName:
    process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? "Seva First Innovation Challenge",
  slogan:
    process.env.NEXT_PUBLIC_APP_SLOGAN ??
    "Science, technology and innovation for public impact.",
  url: withoutTrailingSlash(appUrl),
  apiUrl: withoutTrailingSlash(apiUrl),
  domain: process.env.NEXT_PUBLIC_APP_DOMAIN ?? "localhost",
} as const;

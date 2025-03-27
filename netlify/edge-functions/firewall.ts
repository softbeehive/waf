import type { Config, Context } from "@netlify/edge-functions"

export default async (request: Request, context: Context) => {
  // Bytedance and Petal are the most aggressive bots I've seen.
  // Many bad bots operate from Singapore
  const bannedBotsRegex =
    /Bytespider|ByteDance|PetalBot|Scrapy|Go-http-client|python-requests|python-httpx|axios\//i

  const userAgent = request.headers.get("user-agent") || ""
  const referer = request.headers.get("referer") || ""
  const country = context.geo?.country?.name
  const countryCode = context.geo?.country?.code
  const city = context.geo?.city
  const location = [city, country].filter(Boolean).join(", ")
  const ip = context.ip
  const url = new URL(request.url)
  const pathname = url.pathname?.toLowerCase()

  // Catch good part of total junk
  const badBot = bannedBotsRegex.test(userAgent)
  const blankUserAgent = userAgent.length === 0

  // Be careful not to block file extensions you actually use
  const bannedExtensions = [
    ".php", // most popular among scanners
    ".config",
    ".cgi",
    ".bak",
    ".asp",
    ".aspx",
    ".jsp",
    ".py",
    ".rb",
  ]

  // Any match in url, review before deploy
  const bannedKeywords = [
    ".env",
    ".git",
    ".vscode",
    ".aws",
    ".ssh",
    "/wordpress",
    "/wp-admin",
    "/wp-content",
    "/wp-includes",
  ]

  // Exact url pathnames
  const bannedPathnames = ["/admin", "/backup", "/wp"]

  // Cool Hazker detection algorithm
  const coolHazker = bannedExtensions.some((ext) => pathname?.endsWith(ext)) ||
    bannedKeywords.some((keyword) => pathname?.includes(keyword)) ||
    bannedPathnames.some((path) => pathname === path)

  // Countries
  const denyStates = ["RU", "IR"] // They destroyed my home
  const bannedState = denyStates.some((state) => state === countryCode)

  // Alright, let's do something about it!
  if (bannedState || badBot || blankUserAgent || coolHazker) {
    console.log({
      message: "Blocked request 🚫",
      url: request.url,
      referer: referer,
      ua: userAgent,
      location: location,
      ip: ip,
    })
    return new Response("Access denied", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    })
  }
}

export const config: Config = {
  // Review before deploy
  // path: ["/search/*"]
  path: ["/*"], // Run edge function for every request
  excludedPath: ["/*.css", "/*.js"], // except for css and js
}

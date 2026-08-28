import * as cheerio from "cheerio";

export interface CheckResult {
  status: number;
  responseTimeMs: number;
  pageTitle: string | null;
  finalUrl: string;
}

export async function checkUrl(url: string): Promise<CheckResult> {
  const start = Date.now();

  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "User-Agent": "BulkURLHealthChecker/1.0",
    },
  });

  const responseTimeMs = Date.now() - start;

  const html = await response.text();

  const $ = cheerio.load(html);

  const pageTitle = $("title").first().text().trim() || null;

  return {
    status: response.status,
    responseTimeMs,
    pageTitle,
    finalUrl: response.url,
  };
}

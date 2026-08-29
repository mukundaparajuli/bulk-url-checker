import * as cheerio from "cheerio";
import type { CheckResult } from "@repo/shared";

export type { CheckResult } from "@repo/shared";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    url: string,
  ) {
    super(`HTTP ${statusCode} for ${url}`);
    this.name = "HttpError";
  }
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

  if (response.status >= 500) {
    throw new HttpError(response.status, url);
  }

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

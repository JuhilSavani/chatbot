import { z } from "zod";
import { tool } from "@langchain/core/tools";
import Firecrawl from "@mendable/firecrawl-js";
import pLimit from "p-limit";

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });
const limit = pLimit(2); // (Free: 2, Hobby: 5, Standard: 50)

async function scrapeSingleUrl(url) {
  try {
    const result = await firecrawl.v1.scrapeUrl(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      waitFor: 1000, // Small buffer for JS heavy sites
      timeout: 10000, // 10s timeout per page
    });

    if (!result.success) {
      return `## ${url}\n\nScrape failed: ${result.error || "Unknown error"}`;
    }

    const content = result.markdown || "";
    const truncated =
      content.length > 8000
        ? content.slice(0, 8000) + "\n\n[Content truncated for length]"
        : content;

    return `## Scraped: ${url}\n\n${truncated}`;
  } catch (error) {
    return `## ${url}\n\nScrape failed: ${error.message}`;
  }
}

export const scrapeTool = tool(
  async ({ urls }) => {
    const scrapePromises = urls.map((url) => limit(() => scrapeSingleUrl(url)));
    const results = await Promise.all(scrapePromises);
    return results.join("\n\n---\n\n");
  },
  {
    name: "scrape_url",
    description:
      "Scrape and extract readable content from one or more URLs. " +
      "Use this whenever the user shares any links and wants you to read, summarize, or analyze their contents. " +
      "Pass all URLs at once rather than calling this tool multiple times.",
    schema: z.object({
      urls: z
        .array(z.string().url())
        .min(1)
        .describe("One or more URLs to scrape"),
    }),
  },
);

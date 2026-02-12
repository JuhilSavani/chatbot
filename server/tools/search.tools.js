import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";

// You can wrap the pre-built tool or create a custom one
export const searchTool = tool(
  async ({ query }) => {
    try {
      const search = new TavilySearch({ maxResults: 3 });
      const results = await search.invoke({ query });
      return results;
    } catch (error) {
      return `Search failed: ${error.message}. Please respond using your existing knowledge and let the user know the search was unavailable.`;
    }
  },
  {
    name: "web_search",
    description: "Search the web for real-time information, news, and 2026 updates.",
    schema: z.object({
      query: z.string().describe("The search query to look up on the internet"),
    }),
  }
);
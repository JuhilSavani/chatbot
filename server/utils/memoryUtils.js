import { z } from "zod";
import { getChatModel } from "../config/workflow.config.js";

// Helper to determine if preferences or recent activities are relevant
export async function filterRelevantMemories(preferences, recentActivities, recentHistory, query) {
  if (!preferences?.length && !recentActivities?.length) {
    return { relevantPrefs: [], relevantActivities: [] };
  }

  const model = getChatModel("openai/gpt-oss-20b", false).withStructuredOutput(
    z.object({
      relevantPrefIndices: z.array(z.number()).describe("Indices of relevant preferences from the provided list"),
      relevantActivityIndices: z.array(z.number()).describe("Indices of relevant recent activities from the provided list"),
    })
  );

  const historyText = recentHistory.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `
> **You are a memory relevance assistant.**
> **Determine which of the user's past preferences and recent activities are relevant to the current conversation.**

---

## Current Conversation History:
${historyText}
Current Query: ${query}

## User Preferences (with index):
${preferences.map((p, i) => `[${i}] ${p}`).join("\n")}

## User Recent Activities (with index):
${recentActivities.map((a, i) => `[${i}] ${a}`).join("\n")}

## Rules
- Return ONLY the indices of items directly relevant to answering the current query or continuing the current conversation. 
- If none are relevant, return empty arrays.`;

  try {
    const result = await model.invoke(prompt);
    return {
      relevantPrefs: (result.relevantPrefIndices || []).map((i) => preferences[i]).filter(Boolean),
      relevantActivities: (result.relevantActivityIndices || []).map((i) => recentActivities[i]).filter(Boolean),
    };
  } catch (error) {
    console.error("Error filtering relevant memories:", error);
    return { relevantPrefs: [], relevantActivities: [] };
  }
}

// Helper to extract new memories
export async function extractNewMemories(existingProfile, existingPreferences, existingActivities, lastTurn) {
  const model = getChatModel("openai/gpt-oss-20b", false).withStructuredOutput(
    z.object({
      profileFacts: z.array(z.object({
        fact: z.string().describe("A profile fact extracted from the conversation (name, age, location, profession, core static facts)"),
        is_new: z.boolean().describe("True if this fact is NOT in the Existing Profile list")
      })).describe("All profile facts extracted from the last turn"),

      preferences: z.array(z.object({
        pref: z.string().describe("A preference extracted from the conversation (likes, dislikes, or instructions on how the user wants to be treated)"),
        is_new: z.boolean().describe("True if this preference is NOT in the Existing Preferences list")
      })).describe("All preferences extracted from the last turn"),

      recentActivities: z.array(z.object({
        activity: z.string().describe("A recent activity extracted from the conversation (projects, tasks, or recent events the user mentioned)"),
        is_new: z.boolean().describe("True if this activity is NOT in the Existing Activities list")
      })).describe("All recent activities extracted from the last turn"),
    })
  );

  const lastTurnText = lastTurn.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `
> **You are a memory extraction assistant.**
> **Extract important user details from the following conversation turn.**

---

## Only extract:
1. Profile facts (name, age, location, profession, core static facts).
2. Preferences (likes, dislikes, specific instructions on how they want to be treated).
3. Recent activities (things they are working on, projects, recent events).
> **You are provided with the user's EXISTING memories above.**

## Existing Profile:
${existingProfile.length > 0 ? existingProfile.map(p => `- ${p}`).join("\n") : "None"}

## Existing Preferences:
${existingPreferences.length > 0 ? existingPreferences.map(p => `- ${p}`).join("\n") : "None"}

## Existing Activities:
${existingActivities.length > 0 ? existingActivities.map(p => `- ${p}`).join("\n") : "None"}

## Last Turn:
${lastTurnText}

## Deduplication Rule:
- For EVERY item you extract, you MUST compare it to the existing lists. 
- If the information is already captured (even if worded slightly differently), set is_new to FALSE. 
- Only set is_new to TRUE if it is a genuinely new piece of information not currently known.
`;

  try {
    return await model.invoke(prompt);
  } catch (error) {
    console.error("Error extracting new memories:", error);
    return { profileFacts: [], preferences: [], recentActivities: [] };
  }
}

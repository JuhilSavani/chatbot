// [TODO] Tool-specific input transformers
const toolInputTransformers = {
  web_search: (data) => {
    if (typeof data === "string") return data;
    if (data?.query) return data.query;
    return data;
  },
  scrape_url: (data) => {
    if (Array.isArray(data?.urls)) return data.urls.join(", ");
    if (typeof data === "string") return data;
    return data;
  },
};

const defaultToolInputTransformer = (input) => {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (typeof input === "object" && !Array.isArray(input)) {
    return Object.entries(input)
      .map(
        ([key, value]) =>
          `${key}: ${typeof value === "object" ? "..." : value}`,
      )
      .join(", ");
  }
  return JSON.stringify(input);
};

const defaultToolOutputTransformer = (output) => {
  if (!output) return null;
  if (typeof output === "string") return output;
  return JSON.stringify(output, null, 2);
};

// Tool-specific output transformers
const toolOutputTransformers = {
  web_search: (data) => {
    if (!data?.results) return data;

    return {
      query: data.query,
      items: data.results.map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.content,
      })),
      count: data.results.length,
    };
  },
};

export const parseToolInput = (toolName, rawInput) => {
  let parsedInput = rawInput;

  if (rawInput.input && typeof rawInput.input === "string") {
    try {
      parsedInput = JSON.parse(rawInput.input);
    } catch {
      parsedInput = rawInput.input;
    }
  }

  const transformer = toolInputTransformers[toolName];
  return transformer
    ? transformer(parsedInput)
    : defaultToolInputTransformer(parsedInput);
};

export const parseToolOutput = (toolName, rawOutput) => {
  let parsedOutput = rawOutput;

  if (rawOutput && typeof rawOutput === "object") {
    // Handle Serialized LangChain Object (from stream)
    if (rawOutput.kwargs && rawOutput.kwargs.content) {
      parsedOutput = rawOutput.kwargs.content;
    }
    // Handle direct content property (edge case)
    else if (rawOutput.content && typeof rawOutput.content === "string") {
      parsedOutput = rawOutput.content;
    }
  }

  // 2. Handle JSON parsing
  if (typeof parsedOutput === "string") {
    try {
      parsedOutput = JSON.parse(parsedOutput);
    } catch {
      // Keep as string if parsing fails
    }
  }

  // 2. Apply tool-specific transformation if it exists
  const transformer = toolOutputTransformers[toolName];
  return transformer
    ? transformer(parsedOutput)
    : defaultToolOutputTransformer(parsedOutput);
};

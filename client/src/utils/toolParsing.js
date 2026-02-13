export const parseToolInput = (rawInput) => {
  if (!rawInput) return null;
  if (rawInput.input && typeof rawInput.input === 'string') {
    try {
      return JSON.parse(rawInput.input);
    } catch {
      return rawInput.input;
    }
  }
  return rawInput;
};

export const parseToolOutput = (name, content) => {
  let parsedContent = content;

  // 1. Handle Serialized LangChain Object (from stream)
  if (content && typeof content === 'object' && content.kwargs && content.kwargs.content) {
    parsedContent = content.kwargs.content;
  }
  // Handle direct content property (edge case)
  else if (content && typeof content === 'object' && content.content && typeof content.content === 'string') {
    parsedContent = content.content;
  }

  // 2. Handle JSON parsing
  if (typeof parsedContent === 'string') {
    try {
      parsedContent = JSON.parse(parsedContent);
    } catch {
      // Keep as string if parsing fails
    }
  }

  // 2. Apply tool-specific transformation if it exists
  const transformer = toolTransformers[name];
  return transformer ? transformer(parsedContent) : parsedContent;
};

// Tool-specific transformers
const toolTransformers = {
  web_search: (data) => {
    if (!data?.results) return data;
    
    return {
      query: data.query,
      items: data.results.map(item => ({
        title: item.title,
        url: item.url,
        snippet: item.content
      })),
      count: data.results.length
    };
  }
};
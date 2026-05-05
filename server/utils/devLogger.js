export const devLog = (...args) => 
  process.env.NODE_ENV === "development" && console.log(...args);
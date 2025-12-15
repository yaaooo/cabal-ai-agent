// `sleepInSeconds` helper for rate-limiting requests
export const sleepInSeconds = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

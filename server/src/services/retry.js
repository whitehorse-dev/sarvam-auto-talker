function shouldRetry(error) {
  const status = error?.response?.status;
  return status === 429 || (status >= 500 && status < 600);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry(task, { maxRetries = 1, delayMs = 300 } = {}) {
  let attempt = 0;
  // First attempt plus maxRetries follow-up attempts.
  while (attempt <= maxRetries) {
    try {
      return await task();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }
      await sleep(delayMs * (attempt + 1));
      attempt += 1;
    }
  }
}


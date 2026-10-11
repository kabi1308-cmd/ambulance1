/**
 * Safely formats any API error, Axios response, FastAPI validation detail array,
 * network failure, or unknown error into a human-readable string.
 *
 * GUARANTEE: Never returns an object or array to prevent React child render crashes.
 *
 * @param {any} error - The caught error
 * @param {string} [fallbackMessage="An unexpected error occurred. Please try again."]
 * @returns {string} Human-readable error message
 */
export function formatApiError(
  error,
  fallbackMessage = "An unexpected error occurred. Please try again."
) {
  if (!error) return "";

  // 1. Direct string
  if (typeof error === "string") {
    return error.trim() || fallbackMessage;
  }

  // 2. Axios Response from FastAPI
  if (error.response && error.response.data) {
    const data = error.response.data;

    // FastAPI HTTPException string detail: { detail: "message" }
    if (typeof data.detail === "string") {
      return data.detail;
    }

    // FastAPI 422 ValidationError array: { detail: [{ loc: [...], msg: "...", type: "..." }] }
    if (Array.isArray(data.detail)) {
      const messages = data.detail
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const field = Array.isArray(item.loc)
              ? item.loc.slice(1).join(".") || item.loc.join(".")
              : "";
            const msg = item.msg || "Invalid value";
            return field ? `${field}: ${msg}` : msg;
          }
          return null;
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join(" | ");
      }
    }

    // General message or error field in data
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
  }

  // 3. Axios Network error or Timeout
  if (error.code === "ECONNABORTED" || (typeof error.message === "string" && error.message.includes("timeout"))) {
    return "Request timed out. The command server took too long to respond.";
  }
  if (error.message === "Network Error" || (!error.response && error.request)) {
    return "Network error: Unable to connect to command server. Please verify the backend is online.";
  }

  // 4. Standard JS Error
  if (typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  // 5. Fallback
  return fallbackMessage;
}

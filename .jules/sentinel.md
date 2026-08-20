## 2025-02-20 - Redact API Keys from AI Service Error Messages
**Vulnerability:** Upstream Gemini API errors and worker exceptions could leak raw API key credentials into system logs and UI chat interfaces when errors are thrown or logged.
**Learning:** External API responses and error messages might mirror or contain sensitive query parameters (like API keys) passed in requests.
**Prevention:** Always sanitize/redact sensitive secrets (e.g. `apiKey`) from error messages using `replaceAll(apiKey, '[REDACTED_API_KEY]')` before throwing or displaying them to users/logs, and encode URL parameters with `encodeURIComponent`.

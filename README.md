# n8n Workflows

A collection of n8n workflows automating various personal and technical tasks. 

## Repository Maintenance (CI/CD)

This repository is automatically synced with my n8n instance. I implemented a maintenance workflow that triggers whenever a workflow is saved or executed locally to push changes to GitHub.

**The sync process consists of the following steps:**

1.  **Diff Check:** Compares the live workflow JSON against the version currently in the repository to detect changes in logic (ignoring UI node positions).
2.  **Commit Messages:** Uses an LLM (DeepSeek) to generate a commit message based on the computed diff, following the Conventional Commits specification.
3.  **Sanitization:** Before upload, a script scans the JSON structure to remove:
    * API Keys and credentials (replaced with `REDACTED`).
    * Heavy execution data (`pinData`).
    * Instance-specific metadata.
4.  **Sync:** Creates or updates the file via GitHub REST API with formatted JSON.

## Related Services

Some workflows rely on external services for queue management and rate limiting:

* [**rapidapi_redis_queue**](https://github.com/Wiktor-Potapczyk/rapidapi_redis_queue) – A Python/Redis service handling API rate limits (e.g., for LinkedIn scraping tasks) by queuing requests from n8n.

## Stack

* **n8n** (Self-hosted)
* **JavaScript** (Data transformation, sanitization logic)
* **LLM/AI** (Commit message generation via DeepSeek)
* **Redis/Python** (External queuing)

## Usage

These workflows are sanitized (stripped of sensitive data/credentials) for security. To use them:

1.  Copy the JSON content of a file.
2.  Paste it directly into your n8n Editor canvas.
3.  **Configure Credentials:** You will need to select/create your own credentials for nodes that require authentication (e.g., Google Sheets, GitHub, RapidAPI), as the original IDs have been removed or redacted.

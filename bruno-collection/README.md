# Bruno collection

API request collection for [Bruno](https://www.usebruno.com/). Open this directory as a collection in the Bruno app (or use the recommended Bruno VSCode extension).

- `App/` contains requests against the Next.js app's API routes and the Lambda-backed endpoints
- `Discord/` and `Star Citizen/` contain requests against the respective third-party APIs
- `environments/` provides the `local`, `test` and `prod` targets; their secret variables (e.g. `DISCORD_TOKEN`) are stored locally by Bruno and never committed

# Bruno collection

API request collection for [Bruno](https://www.usebruno.com/). Open this directory as a collection in the Bruno app, or use the recommended Bruno VSCode extension.

- `App/` contains requests against the API routes of the Next.js app
- `Discord/` and `Star Citizen/` contain requests against the related third-party APIs
- `environments/` provides the `local` and `prod` targets; Bruno stores their secret variables (for example `DISCORD_TOKEN`) locally and does not commit them. The address of `prod` (`appBaseUrl`) is a secret variable too, so that the repository does not contain it: set it once in the environment settings of Bruno

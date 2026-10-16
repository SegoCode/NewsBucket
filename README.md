# NewsBucket

<h3 align="center"><img width="600" height="600" src="media/generated-image-2-resized.png"></h3>

<p align="center">
  <a href="#about">About</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start--information">Quick Start & Information</a>
</p>

## About
[![Top language](https://img.shields.io/github/languages/top/segocode/NewsBucket?style=flat-square)](https://github.com/segocode/NewsBucket)
[![Repository size](https://img.shields.io/github/repo-size/segocode/NewsBucket?style=flat-square&label=repo%20size)](https://github.com/segocode/NewsBucket)
[![Commit activity per year](https://img.shields.io/github/commit-activity/y/segocode/NewsBucket?style=flat-square&label=commits)](https://github.com/segocode/NewsBucket/graphs/commit-activity)
[![License: PolyForm Noncommercial + GNU AGPL-3.0](https://img.shields.io/badge/License-PolyForm%20Noncommercial%20%2B%20GNU%20AGPL--3.0-blue?style=flat-square)](https://github.com/segocode/NewsBucket/blob/main/LICENSE)
[![Bitcoin BTC](https://img.shields.io/badge/buy_me_a_coffee-BTC-F7931A?style=flat-square&logo=bitcoin&logoColor=white)](https://github.com/SegoCode/SegoCode/discussions/2)

NewsBucket fetches RSS feeds from sources you configure, groups articles covering the same story using an LLM, and publishes the result as JSON in this repository. Each cluster gets a title and summary, then translates into your target languages. Everything runs on GitHub Actions. A miniapp in `code/miniapp/` reads that JSON.

## Features

- **Any feed, any topic.** Drop a `.txt` file with RSS URLs into `code/rss_input/` and the pipeline picks it up automatically. One file equals one output category.

- **LLM-powered clustering.** Articles are grouped by topic. Only stories covered by at least 2 different outlets make the cut, ordered by how many outlets covered the story.

- **Multi-language output.** Clusters are generated in one language, then translated to others. Swap the prompts in `code/prompts/` to change source and target languages.

- **Zero infrastructure.** The entire pipeline, fetch, cluster, translate, commit... runs on GitHub Actions free tier.

- **A miniapp reads the JSON.** `code/miniapp/` is the shipped view: a Telegram Web App and a GitHub Pages site. Two native selects pick topic and language. Stories with more outlets sit higher. Yesterday is the previous commit of the same file.

- **Live overlays on the same list.** Japan prepends JMA earthquakes and weather alerts. Tech prepends cloud outages. Finance prepends 20% stock spikes and a Bank of Canada yen rate. Status is the pipeline run itself.

- **Live news and cameras.** On Japan, the chrome opens NHK and nearby street cameras. Location comes from GPS, IP, or a prefecture picker.

## Quick Start & Information

### Run locally

```
cd code
pnpm install
```

Add your RSS feed URLs to `.txt` files in `code/rss_input/`.

Clustering and translation call `requestLlmJson` in `code/js/llm-client.js`. This is the only routing layer; HTTP request/response adapters live in `code/js/llm-connectors.js`. There is no CLI, agent, shell execution or client impersonation.

OpenRouter is the only configured connector. Both clustering and translation read `OPENROUTER_API_KEY` from the environment. For GitHub Actions, create a repository secret named **`OPENROUTER_API_KEY`**; every generation job already receives it. For local runs, export the same variable. Never commit the key.

The primary model is `nvidia/nemotron-3.5-super-vl:free`, the highest-ranked free Nemotron in the catalog's published intelligence benchmark at selection time. Fallbacks are `nvidia/nemotron-3-ultra-550b-a55b:free`, `google/gemma-4-31b-it:free`, then `openrouter/free`, which routes to other available free models. Requests also set a zero-price ceiling for tokens, requests and images; no paid fallback is enabled.

`LLM_CONNECTORS` in `llm-connectors.js` is an ordered array. Each connector declares `id`, `required` credential names, an ordered `models` array, `request(messages, credentials, model)` and `text(payload)`. The client exhausts that connector's models before advancing to the next connector. Add entries to those arrays to extend fallback policy; consumers do not change. Only OpenRouter is implemented/configured today.

Only JSON passing the caller's integrity validator is returned. Failed, refused, empty or token-truncated answers advance to the next model/connector. Missing credentials skip the connector without making requests. When every route fails, generation fails and the previous output is preserved.

[OpenRouter's free-tier limits](https://openrouter.ai/docs/limits) currently allow up to 20 requests/minute and 50 free requests/day without the qualifying credit purchase; purchasing at least $10 in credits raises the daily free-model allowance to 1,000. Free models still have shared capacity limits: fallbacks cannot bypass account-wide quotas. Model availability is listed in the [live catalog](https://openrouter.ai/api/v1/models).

Then run the pipeline:

```
pnpm run feeds              # fetch RSS feeds → rss_output/
pnpm run cluster            # cluster articles → rss_output_cluster/
pnpm run translate          # translate clusters
pnpm run test               # run pipeline unit tests
pnpm run test:browser       # run the miniapp browser scenes
pnpm run test:all            # run unit tests and browser scenes
```

The browser tests use Playwright and launch Chromium locally. Install the browser once with `pnpm exec playwright install chromium`.

Or run the complete pipeline with `pnpm run pipeline`.

### Failure handling

- RSS requests have a 15-second abort deadline, four concurrent workers, and up to three attempts for temporary network errors, HTTP 408/429 and 5xx. Backoff includes jitter and respects `Retry-After` within a one-minute bound. Permanent errors such as HTTP 404 are recorded without retrying. Reddit requests remain spaced one minute apart, including retries.
- A bad article is reported and discarded without losing the rest of its feed. A failed feed does not discard healthy feeds. A category with no usable articles fails without overwriting its previous output; other categories are still fetched.
- Each model request has a 90-second deadline and at most two attempts for temporary network errors or HTTP 408/5xx. Quota/authentication/model refusals (429/401/403/404) advance immediately to the next fallback. Invalid answers advance without retrying the same generation. The response-size limit is 16 MiB; configured credentials are redacted from diagnostics and redirects are not followed.
- Corrupt JSON, missing answers, invented sources, incorrect counts and changed translation metadata remain failures. Exact object keys, diagnostic wording and input ordering are not acceptance criteria. Unknown model fields are stripped before publication; cluster ordering is applied locally.
- An empty cluster array is a valid edition with no qualifying stories. Expired inputs and empty editions do not consume model calls. Each JSON file is replaced atomically after validation. Failed categories/languages retain their previous published file; successful independent results can still be published.
- Actions blocks downstream jobs when fresh RSS generation/validation/publication fails. A clustering failure does not stop unrelated categories; only categories successfully published in that run are translated. Git push has three bounded attempts with rebase; conflicts remain errors rather than overwriting remote work.

Validation runs where data enters the pipeline and immediately before publication: `feed-validation.js` checks feed items and unique URLs; `cluster-validation.js` checks clusters, source counts and translation metadata. There are no separate post-generation validation commands duplicating those checks. Independent translations may retain their previous edition when another language fails.

The regression suite exercises stalled HTTP bodies, quota exhaustion, malformed/truncated responses, secret redaction, model fallbacks and ordered connector failover without needing live credentials.

### Run on GitHub Actions

The pipeline lives in `.github/workflows/update-news.yml`.

Raw articles land in `code/rss_output/` as JSON, one file per configured feed source. Clustered results land in `code/rss_output_cluster/` as JSON arrays, with one file per source language and one per target language.

The prompts that drive the clustering and translation live in `code/prompts/`. Feed URLs go in `code/rss_input/` as `.txt` files, one URL per line.

The miniapp lives in `code/miniapp/`. Push it to `main` and `.github/workflows/deploy-pages.yml` publishes it to GitHub Pages. It fetches cluster JSON from this repository.

---
<p align="center"><a href="https://github.com/SegoCode/NewsBucket/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=SegoCode/NewsBucket" />
</a></p>

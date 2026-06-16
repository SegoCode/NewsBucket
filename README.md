# NewsBucket

<p align="center">
  <a href="#about">About</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start--information">Quick Start & Information</a>
</p>

## About

NewsBucket fetches RSS feeds from sources you configure, groups articles covering the same story using an LLM, and publishes the result as JSON in this repository. Each cluster gets a title and summary, then translates into your target languages. Everything runs on GitHub Actions. No servers, no cost.

## Features

- **Any feed, any topic.** Drop a `.txt` file with RSS URLs into `code/rss_input/` and the pipeline picks it up automatically. One file equals one output category.

- **LLM-powered clustering.** Articles are grouped by topic. The prompt enforces exactly 20 clusters, ordered by how many different outlets covered the story.

- **Multi-language output.** Clusters are generated in one language, then translated to others. Swap the prompts in `code/prompts/` to change source and target languages.

- **Zero infrastructure.** The entire pipeline — fetch, cluster, translate, commit — runs on GitHub Actions free tier.

## Quick Start & Information

### Run locally

```
cd code
pnpm install
```

Add your RSS feed URLs to `.txt` files in `code/rss_input/`. Create a `.env` file in `code/` with your API key:

```
OPENCODE_API_KEY=your-key
```

Then run the pipeline:

```
pnpm start      # fetch RSS feeds → rss_output/
pnpm ai         # cluster articles → rss_output_cluster/
pnpm translate  # translate clusters
```

Or fetch and cluster in one step: `pnpm all`.

### Run on GitHub Actions

The pipeline lives in `.github/workflows/update-news.yml`.

Raw articles land in `code/rss_output/` as JSON, one file per configured feed source. Clustered results land in `code/rss_output_cluster/` as JSON arrays, with one file per source language and one per target language.

The prompts that drive the clustering and translation live in `code/prompts/`. Feed URLs go in `code/rss_input/` as `.txt` files, one URL per line.

---
<p align="center"><a href="https://github.com/SegoCode/NewsBucket/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=SegoCode/NewsBucket" />
</a></p>
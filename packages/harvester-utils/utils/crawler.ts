import chalk from "chalk";
import { load } from "cheerio";
import { BASE_URL } from "../constants";
import { fetchHtml } from "./fetcher";
import { scrapePage } from "./scraper";

// `crawlPage` looks up links in a page. Note that it is *not* recursive,
// it only examines links one-level deep
export async function crawlPage(seedUrl: string): Promise<Set<string>> {
  console.log(
    `${chalk.yellow("[CABAL Crawler] Crawling Seed URL:")} ${seedUrl}`,
  );
  try {
    const html = await fetchHtml(seedUrl);
    if (!html) {
      return new Set();
    }

    const $ = load(html);
    console.log(
      `${chalk.yellow("[CABAL Crawler] successfully loaded HTML for:")} ${seedUrl}`,
    );

    // Optimization: Scrape the seed page along the way
    await scrapePage(seedUrl, $);

    const outboundLinks: Set<string> = new Set();

    $("a").each((i, element) => {
      const href = $(element).attr("href");

      // Check for `/wiki/` in route (e.g. /wiki/Firestorm_Conflict)
      if (href && href.includes("/wiki/")) {
        const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
        outboundLinks.add(fullUrl);
      }
    });

    console.log(
      `${chalk.green("[CABAL Crawler] Links crawled from Seed URL:")} ${Array.from(outboundLinks)}`,
    );
    return outboundLinks;
  } catch (err) {
    console.error(
      `${chalk.red("[CABAL Crawler] Failed to crawl links from Seed URL:")} ${err}`,
    );
    return new Set();
  }
}

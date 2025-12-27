import chalk from "chalk";
import { CheerioAPI, load } from "cheerio";
import { outputFile } from "fs-extra";
import path from "path";
import {
  CONTENT_EXCLUDE_TAGS,
  CONTENT_INCLUDE_TAGS,
  HARVESTED_OUTPUT_DIR,
} from "../constants";
import { fetchHtml } from "./fetcher";

// `cleanFilename` removes non-alphanumeric chars from page title
const cleanFilename = (title: string) => {
  return title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + ".txt";
};

// `scrapePage` parses relevant text content for a given URL
// and writes it to a file
export async function scrapePage(url: string, pageData: CheerioAPI) {
  console.log(`${chalk.yellow("[CABAL Scraper] Scraping URL:")} ${url}`);

  try {
    const $ = pageData;
    const title = $("#firstHeading").text().trim() || "Unknown artifact";

    // Check that content div is populated
    const contentDiv = $(".mw-parser-output");
    if (!contentDiv.length) return;

    // Drop tags we don't care about
    contentDiv.find(CONTENT_EXCLUDE_TAGS).remove();

    // Extract content from specific tags
    let textContent = "";
    contentDiv.find(CONTENT_INCLUDE_TAGS).each((_, el) => {
      const text = $(el).text().trim();
      if (text) textContent += `${text}\n\n`;
    });

    // Format content with title header
    const fileContent = `SUBJECT: ${title}\n\nURL: ${url}\n\n----------------------------------------\n\n${textContent}`;

    // Save content to a file
    const filePath = path.join(HARVESTED_OUTPUT_DIR, cleanFilename(title));
    await outputFile(filePath, fileContent);

    console.log(
      `${chalk.green("[CABAL Scraper] Successfully extracted content from page to:")} ${filePath}`,
    );
  } catch (err) {
    console.error(
      `${chalk.red("[CABAL Scraper] Failed to extract content from page:")} ${err}`,
    );
  }
}

// `fetchAndScrapePage` fetches the page data first before scraping it
export async function fetchAndScrapePage(url: string) {
  const html = await fetchHtml(url);
  if (!html) {
    return;
  }
  const $ = load(html);
  await scrapePage(url, $);
}

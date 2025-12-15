import chalk from "chalk";

import { SEED_URLS } from "./constants";
import { crawlPage } from "./utils/crawler";
import { fetchAndScrapePage } from "./utils/scraper";
import { sleepInSeconds } from "./utils/common";

async function harvestData() {
  console.log(
    `${chalk.yellow("[CABAL Harvester] Commencing crawling and scraping")}`,
  );

  try {
    let outboundUrls: Set<string> = new Set();

    for (const seedUrl of SEED_URLS) {
      const outboundUrlsForPage = await crawlPage(seedUrl);
      await sleepInSeconds(2);

      // Track outbound links
      outboundUrls = new Set([...outboundUrls, ...outboundUrlsForPage]);
    }
    console.log(
      `${chalk.green("[CABAL Harvester] Scraping of seed data completed.")}`,
    );

    for (const outboundUrl of outboundUrls) {
      await fetchAndScrapePage(outboundUrl);
      await sleepInSeconds(2);
    }
    console.log(
      `${chalk.green("[CABAL Harvester] Scraping of outbound links completed.")}`,
    );
  } catch (err) {
    console.error(
      `${chalk.red("[CABAL Harvester] Crawling and scraping failure:")} ${err}`,
    );
  }
}

harvestData();

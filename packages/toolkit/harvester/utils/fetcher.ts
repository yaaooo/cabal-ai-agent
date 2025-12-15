import axios from "axios";
import chalk from "chalk";
import { USER_AGENT } from "../constants";

// `fetchHtml` uses axios to fetch page data and provides a
// site-friendly user agent header to flag ourselves as a bot
export async function fetchHtml(url: string): Promise<string | null> {
  console.log(`${chalk.yellow("[CABAL Fetcher] Fetching URL:")} ${url}`);

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!data) {
      console.warn(
        `${chalk.yellow("[CABAL Fetcher] Content is empty for URL:")} ${url}`,
      );
      return data;
    }

    console.log(
      `${chalk.green("[CABAL Fetcher] Successfully fetched content from URL:")} ${url}`,
    );
    return data;
  } catch (err) {
    console.error(
      `${chalk.red("[CABAL Fetcher] Failed to fetch content from URL:")} ${url} — ${err}`,
    );
    return null;
  }
}

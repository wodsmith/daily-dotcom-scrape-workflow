import * as cheerio from "cheerio";
import { createLogger } from "../utils/logger";

const logger = createLogger("crossfitComScraper");

export function generateWodUrl(date: Date): string {
  const year = date.getUTCFullYear().toString().slice(-2);
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const url = `https://www.crossfit.com/${year}${month}${day}`;
  logger.debug(
    `Generating WOD URL for date: ${date.toISOString().split("T")[0]}. Result: ${url}`,
  );
  return url;
}

export async function fetchWodPage(url: string): Promise<string> {
  logger.info(`Fetching WOD page: ${url}`);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error(`Failed to fetch WOD page: ${url}. Status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const htmlContent = await response.text();
    logger.info(
      `Fetched WOD page: ${url}. Status: ${response.status}. Content length: ${htmlContent.length}`,
    );
    return htmlContent;
  } catch (error) {
    logger.error(`Error fetching WOD page: ${url}. Error: ${error}`);
    throw error;
  }
}

export interface WodDetails {
  wodText: string | null;
  isRestDay: boolean;
}

export function extractWodDetails(htmlContent: string): WodDetails {
  const $ = cheerio.load(htmlContent);
  let wodTextContent = null;

  // New Primary Strategy: Target div[class^="_workout-of-the-day-content"]
  const workoutOfTheDayContentDiv = $('div[class^="_workout-of-the-day-content"]');
  if (workoutOfTheDayContentDiv.length > 0) {
    logger.info(`Found div using selector 'div[class^="_workout-of-the-day-content"]'. Extracting <p> tags from its <article> child.`);
    const articleParagraphs = workoutOfTheDayContentDiv.find("article p");
    if (articleParagraphs.length > 0) {
      const extractedTexts = articleParagraphs
        .map((i, el) => {
          const $el = $(el);
          // Replace <br> tags with a temporary placeholder text
          $el.find('br').replaceWith('[TEMP_BR_MARKER]');
          // Get text content (Cheerio will strip other HTML tags but keep our placeholder)
          let text = $el.text();
          // Replace placeholder with actual newline characters and trim
          return text.replace(/\[TEMP_BR_MARKER\]/g, '\\n').trim();
        })
        .get();

      if (extractedTexts.length > 0) {
        const potentialWodText = extractedTexts.join("\n").trim();
        if (potentialWodText.length > 20) { // Ensure some substantial content
          wodTextContent = potentialWodText;
          logger.info(`Extracted WOD content using 'div[class^="_workout-of-the-day-content"] article p' strategy. Length: ${wodTextContent.length}`);
        } else {
          logger.warn(`Selector 'div[class^="_workout-of-the-day-content"] article p' found <p> tags, but content was minimal. Length: ${potentialWodText.length}.`);
        }
      } else {
        logger.warn(`Selector 'div[class^="_workout-of-the-day-content"]' found, but no <p> tags within its <article> child or <p> tags were empty.`);
      }
    } else {
      logger.warn(`Selector 'div[class^="_workout-of-the-day-content"]' found, but no <p> tags within its <article> child.`);
    }
  } else {
    logger.info(`Selector 'div[class^="_workout-of-the-day-content"]' not found. Proceeding to other strategies.`);
  }

  // Fallback Strategy: Find "Workout of the Day" heading and extract subsequent <p> tags.
  if (!wodTextContent) {
    logger.info(`Primary strategy (div[class^="_workout-of-the-day-content"]) did not yield WOD content. Trying "Workout of the Day" heading strategy.`);
    let wodTitleHeading = $("h1, h2, h3").filter((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      return text === "workout of the day";
    }).first();

    if (wodTitleHeading.length > 0) {
      const contentElements = wodTitleHeading.nextUntil("h1, h2, h3, hr, div#comments, section.comments, div.fyre, div.comments-area, #comments, .comments-section, .post-comments");
      const extractedTexts = contentElements
        .filter("p")
        .map((i, el) => {
          const $el = $(el);
          // Replace <br> tags with a temporary placeholder text
          $el.find('br').replaceWith('[TEMP_BR_MARKER]');
          // Get text content (Cheerio will strip other HTML tags but keep our placeholder)
          let text = $el.text();
          // Replace placeholder with actual newline characters and trim
          return text.replace(/\[TEMP_BR_MARKER\]/g, '\\n').trim();
        })
        .get();

      if (extractedTexts.length > 0) {
        const potentialWodText = extractedTexts.join("\n").trim();
        if (potentialWodText.length > 20) {
          wodTextContent = potentialWodText;
          logger.info(`Found WOD content using "Workout of the Day" heading strategy. Length: ${wodTextContent.length}`);
        } else {
          logger.warn(`"Workout of the Day" heading found, but subsequent <p> content was minimal or empty. Length: ${potentialWodText.length}.`);
        }
      } else {
        logger.warn(`"Workout of the Day" heading found, but no subsequent <p> tags or they were empty.`);
      }
    } else {
      logger.info(`"Workout of the Day" heading not found. No WOD content extracted by this strategy.`);
    }
  }

  const isRestDay = wodTextContent ? /rest\sday/i.test(wodTextContent) : false;

  if (isRestDay) {
    logger.info(`Detected rest day. Raw text snippet: ${wodTextContent?.substring(0, 100)}`);
  } else if (wodTextContent) {
    logger.info(`Extracted WOD text. Length: ${wodTextContent.length}. Rest day: false.`);
  } else {
    logger.warn("Could not extract WOD text after trying all strategies.");
  }

  return {
    wodText: wodTextContent || null,
    isRestDay,
  };
}

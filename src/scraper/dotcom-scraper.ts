import * as cheerio from "cheerio";
import { createLogger } from "../utils/logger";

const logger = createLogger("crossfitComScraper");

// Simplified function to convert Cheerio elements to Markdown
function convertCheerioToMarkdown($elements: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string {
	let markdown = "";

	$elements.each((_, node) => {
		if (node.type === 'text') {
			markdown += $(node).text();
			return;
		}

		if (node.type !== 'tag') {
			return;
		}

		const element = node as any;
		const $el = $(element);
		const tagName = element.tagName?.toLowerCase();

		switch (tagName) {
			case 'p':
				markdown += convertCheerioToMarkdown($el.contents(), $) + "\n\n";
				break;
			case 'br':
				markdown += "\n";
				break;
			case 'strong':
			case 'b':
				markdown += `**${convertCheerioToMarkdown($el.contents(), $)}**`;
				break;
			case 'em':
			case 'i':
				markdown += `*${convertCheerioToMarkdown($el.contents(), $)}*`;
				break;
			case 'a':
				const href = $el.attr('href') || '';
				const linkText = convertCheerioToMarkdown($el.contents(), $);
				markdown += `[${linkText}](${href})`;
				break;
			default:
				// For unhandled tags, just process their content
				markdown += convertCheerioToMarkdown($el.contents(), $);
				break;
		}
	});

	return markdown;
}

// New function to convert an HTML snippet to Markdown
function htmlSnippetToMarkdown(htmlSnippet: string | null, $: cheerio.CheerioAPI): string {
	if (!htmlSnippet) return '';
	const $content = $('<div></div>').html(htmlSnippet);
	let md = convertCheerioToMarkdown($content.contents(), $);
	// Post-processing: Trim, consolidate multiple newlines to max two, and remove leading/trailing newlines from the whole block
	md = md.replace(/\n{3,}/g, '\n\n').trim();
	return md;
}

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
	logger.info(`Original HTML content length for Cheerio load: ${htmlContent.length}`);
	let relevantHtml = htmlContent;

	// Remove script tags. This can significantly reduce the size of the HTML fed to Cheerio
	// and script contents are not relevant for WOD extraction.
	relevantHtml = relevantHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
	// Remove style tags. Similar to script tags, these are not needed for content.
	relevantHtml = relevantHtml.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
	// Remove HTML comments. These can sometimes be bulky and are not part of the content.
	relevantHtml = relevantHtml.replace(/<!--[\s\S]*?-->/g, "");

	logger.info(`HTML content length after removing script/style/comments for Cheerio load: ${relevantHtml.length}`);

	// Warn if pre-processing resulted in empty content, unless original was essentially empty or just comments.
	if (htmlContent.length > 0 && relevantHtml.length === 0 && !htmlContent.match(/^<!--[\s\S]*-->$/s) && !htmlContent.match(/^\s*$/)) {
		logger.warn("Warning: Pre-processing removed all HTML content. Original content was not solely comments or whitespace. This might indicate an issue.");
	}

	const $ = cheerio.load(relevantHtml); // Load the potentially smaller and cleaner HTML

	// This log confirms cheerio.load() succeeded and gives context on processed size.
	// It effectively replaces a more basic log that was here.
	logger.info(`Successfully loaded HTML into Cheerio. Starting WOD details extraction. Initial HTML length: ${htmlContent.length}, Processed length for Cheerio: ${relevantHtml.length}`);

	let wodTextContent = null;
	// const turndownService = new TurndownService(); // Removed TurndownService

	// logger.debug(`Full HTML content received: ${htmlContent.substring(0, 500)}...`); // Optional: log snippet of HTML

	// New Primary Strategy: Target div[class^="_workout-of-the-day-content"]
	logger.info("Attempting primary strategy: div[class^='_workout-of-the-day-content']");
	const workoutOfTheDayContentDiv = $('div[class^="_workout-of-the-day-content"]');
	if (workoutOfTheDayContentDiv.length > 0) {
		logger.info(`Found div using selector 'div[class^="_workout-of-the-day-content"]'. Extracting content from its <article> child.`);
		const articleElement = workoutOfTheDayContentDiv.find("article");
		if (articleElement.length > 0) {
			logger.info("Found <article> element within the primary div.");
			const articleHtml = articleElement.html();
			if (articleHtml) {
				logger.info(`Article HTML content length: ${articleHtml.length}. Converting to Markdown.`);
				// logger.debug(`Article HTML snippet: ${articleHtml.substring(0, 200)}...`);
				const potentialWodText = htmlSnippetToMarkdown(articleHtml, $); // Use new converter
				logger.info(`Conversion to Markdown complete. Markdown length: ${potentialWodText.length}`);
				if (potentialWodText.length > 20) {
					wodTextContent = potentialWodText;
					logger.info(`Extracted WOD content using 'div[class^="_workout-of-the-day-content"] article' strategy. Markdown Length: ${wodTextContent.length}`);
				} else {
					logger.warn(`Selector 'div[class^="_workout-of-the-day-content"] article' found, but Markdown content was minimal. Length: ${potentialWodText.length}.`);
				}
			} else {
				logger.warn(`Selector 'div[class^="_workout-of-the-day-content"] article' found, but it had no HTML content.`);
			}
		} else {
			logger.warn(`Selector 'div[class^="_workout-of-the-day-content"]' found, but no <article> child within it.`);
		}
	} else {
		logger.info(`Selector 'div[class^="_workout-of-the-day-content"]' not found. Proceeding to other strategies.`);
	}

	// Fallback Strategy: Find "Workout of the Day" heading and extract subsequent content elements.
	if (!wodTextContent) {
		logger.info(`Primary strategy did not yield WOD content. Attempting fallback: "Workout of the Day" heading strategy.`);
		let wodTitleHeading = $("h1, h2, h3").filter((i, el) => {
			const text = $(el).text().trim().toLowerCase();
			return text === "workout of the day";
		}).first();

		if (wodTitleHeading.length > 0) {
			logger.info(`Found "Workout of the Day" heading: '${wodTitleHeading.text()}'. Extracting subsequent content.`);
			const contentElements = wodTitleHeading.nextUntil("h1, h2, h3, hr, div#comments, section.comments, div.fyre, div.comments-area, #comments, .comments-section, .post-comments");
			logger.info(`Found ${contentElements.length} subsequent content elements.`);

			if (contentElements.length > 0) {
				const contentWrapper = cheerio.load("<div></div>")("div");
				contentElements.each((i, el) => {
					contentWrapper.append($(el).clone());
				});
				const PTagHtml = contentWrapper.html();

				if (PTagHtml && PTagHtml.trim() !== "") {
					logger.info(`Aggregated HTML from fallback elements length: ${PTagHtml.length}. Converting to Markdown.`);
					// logger.debug(`Fallback HTML snippet: ${PTagHtml.substring(0,200)}...`);
					const potentialWodText = htmlSnippetToMarkdown(PTagHtml, $); // Use new converter
					logger.info(`Fallback Markdown conversion complete. Markdown length: ${potentialWodText.length}`);
					if (potentialWodText.length > 20) {
						wodTextContent = potentialWodText;
						logger.info(`Found WOD content using "Workout of the Day" heading strategy. Markdown Length: ${wodTextContent.length}`);
					} else {
						logger.warn(`"Workout of the Day" heading found, but subsequent content (converted to Markdown) was minimal or empty. Length: ${potentialWodText.length}.`);
					}
				} else {
					logger.warn(`"Workout of the Day" heading found, but subsequent content elements were empty or whitespace only.`);
				}
			} else {
				logger.warn(`"Workout of the Day" heading found, but no subsequent content elements matched the criteria.`);
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

	logger.info("Finished WOD details extraction.");
	return {
		wodText: wodTextContent || null,
		isRestDay,
	};
}

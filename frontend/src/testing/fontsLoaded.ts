import type { Page } from "@playwright/test";

/**
 * Loads every font face the page's stylesheets declare, before a screenshot. The app's fonts come
 * from Google with `display=swap`, and `document.fonts.ready` resolves as soon as nothing is loading,
 * which can be before a weight is first used: a capture then caught the text mid-swap.
 */
export async function fontsLoaded(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const faces: Promise<unknown>[] = [];
    document.fonts.forEach((face) => faces.push(face.load().catch(() => undefined)));
    await Promise.all(faces);
    await document.fonts.ready;
  });
}

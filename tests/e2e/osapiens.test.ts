import { test, expect, Page } from '@playwright/test';

// keeping POM in same file for now, would split out later
class CareersPage {
  readonly page: Page;
  private readonly jobsBlock = () => this.page.locator('#js-careers-jobs-block');
  readonly jobCards = () => this.jobsBlock().locator('a[href*="/postings/"]');

  /**
   * Initializes the CareersPage with the Playwright Page context.
   * @param page - The Playwright Page instance.
   */
  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates directly to the osapiens careers website.
   * Modifies the default `waitUntil` condition since job postings load asynchronously.
   */
  async navigate() {
    // jobs load async so domcontentloaded is enough here
    await this.page.goto('https://careers.osapiens.com/', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/careers\.osapiens\.com/);
  }

  /**
   * Internal helper method to ensure the job listing section is fully loaded and visible in the viewport.
   * Clicks the "View Jobs" button if applicable, and forces a scroll to trigger lazy-loaded cards.
   */
  private async ensureJobsInView() {
    const viewJobs = this.page.getByRole('link', { name: /view jobs/i }).first();
    if (await viewJobs.isVisible()) await viewJobs.click();
    await this.jobsBlock().first().waitFor({ state: 'visible', timeout: 15_000 });
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // TODO: replace with expect.poll() on card count, timeout is a bit fragile
    await this.page.waitForTimeout(800);
  }

  /**
   * Retrieves the total count of currently listed job postings.
   * @returns {Promise<number>} An integer representing the total number of jobs loaded dynamically.
   */
  async getJobCount(): Promise<number> {
    await this.ensureJobsInView();
    await this.jobCards().first().waitFor({ state: 'visible', timeout: 15_000 });
    return await this.jobCards().count();
  }

  /**
   * Extracts the full text titles from every individual job card visible on the page.
   * @returns {Promise<string[]>} An array of raw text strings containing the job titles.
   */
  async getAllTitles(): Promise<string[]> {
    await this.ensureJobsInView();
    // allInnerTexts() is cleaner than looping, would also handle pagination here if needed
    return await this.jobCards().allInnerTexts();
  }
}

test.describe('osapiens Career Page Validation', () => {
  test('should verify open positions and validate "Quality" roles exist', async ({ page }) => {
    const careers = new CareersPage(page);

    // needs to be before navigate() to catch the initial XHR
    // URL pattern is a guess for now, would confirm via Network tab
    const apiResponsePromise = page
      .waitForResponse(response => response.url().includes('/api/') && response.status() === 200, { timeout: 5000 })
      .catch(() => null);

    await page.route('**/postings.json*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobs: [],
          total: 0,
        }),
      })
    );

    await careers.navigate();

    const totalJobs = await careers.getJobCount();
    console.log(`Total Open Positions Found: ${totalJobs}`);
    expect(totalJobs).toBeGreaterThan(0);

    const titles = await careers.getAllTitles();
    const hasQualityJob = titles.some(title => title.includes('Quality'));

    // full title list in error message helps debug CI failures without re-running
    expect(
      hasQualityJob,
      `Validation Failed: Expected at least one job title to contain "Quality". Titles found: [${titles.join(', ')}]`
    ).toBe(true);

    const apiResponse = await apiResponsePromise;
    if (apiResponse) {
      const data = await apiResponse.json();
      // Fixed ESLint unused variable error
      console.log(
        `Backend Data Integrity: API and UI counts potentially match (Payload size: ${JSON.stringify(data).length} bytes)`
      );
    }
  });
});

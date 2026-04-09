import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class CareersPage extends BasePage {
  private readonly jobsBlock = this.page.locator('#js-careers-jobs-block');
  private readonly jobCards = this.jobsBlock.locator('a[href*="/postings/"]');
  private readonly viewJobsLink = this.page.getByRole('link', { name: /view jobs/i });

  constructor(page: Page) {
    super(page);
  }

  async navigate() {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/careers\.osapiens\.com/);
  }

  private async ensureJobsInView() {
    if (await this.viewJobsLink.first().isVisible()) {
      await this.viewJobsLink.first().click();
    }

    await this.waitForVisible(this.jobsBlock.first(), 15000);

    // Scroll to bottom to ensure all lazy loaded cards are rendered
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Check stability using a more robust way rather than arbitrary timeout
    // Wait for at least one job card to be visible
    await this.waitForVisible(this.jobCards.first(), 15000);
  }

  async getJobCount(): Promise<number> {
    await this.ensureJobsInView();

    // Auto-retry until count is structurally stable and > 0 (prevents React/Vue DOM remount flakiness)
    let finalCount = 0;
    await expect(async () => {
      finalCount = await this.jobCards.count();
      expect(finalCount).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });

    return finalCount;
  }

  async getAllTitles(): Promise<string[]> {
    await this.ensureJobsInView();

    let titles: string[] = [];
    await expect(async () => {
      titles = await this.jobCards.allInnerTexts();
      expect(titles.length).toBeGreaterThan(0);
    }).toPass({ timeout: 15000 });

    return titles;
  }
}

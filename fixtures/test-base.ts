import { test as base } from '@playwright/test';
import { CareersPage } from '../pages/CareersPage';

type MyFixtures = {
  careersPage: CareersPage;
};

export const test = base.extend<MyFixtures>({
  careersPage: async ({ page }, use) => {
    // Set up the fixture.
    const careersPage = new CareersPage(page);
    // Use the fixture value in the test.
    await use(careersPage);
    // Clean up if needed.
  },
});

export { expect } from '@playwright/test';

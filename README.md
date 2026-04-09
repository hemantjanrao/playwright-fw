# osapiens QA Automation Framework

This is a Playwright TypeScript framework designed for the osapiens careers portal.

## Framework Architecture

- **Page Object Model (POM)**: Located in `pages/`, promotes code reusability and reduces duplicate element locators. Object-oriented approach extending a `BasePage`.
- **Custom Fixtures**: Located in `fixtures/`, integrates POMs natively into Playwright's `test` scoped worker context, eliminating `new Class(page)` boilerplate inside tests.
- **Test Steps**: Used in `tests/e2e/` to provide logical grouping and rich execution reports.
- **Reporting**: Configured to export HTML and List reports seamlessly.
- **Linting & Formatting**: Enforced via ESLint and Prettier for strict typescript governance.
- **Environment Management**: Supports multiple environments via dotenv.

## Setup & Installation

Ensure you have Node.js installed.

```bash
# 1. Install Dependencies
npm install

# 2. Install Playwright Browsers
npx playwright install --with-deps
```

## Running Tests

Run tests in headless mode (default):
```bash
npm test
```

Run tests in headed mode:
```bash
npm run test:headed
```

View the execution HTML report:
```bash
npm run report
```
# playwright-fw

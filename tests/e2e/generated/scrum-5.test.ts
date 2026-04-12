import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const VALID_EMAIL = 'testuser@example.com';
const VALID_PASSWORD = 'P@ssword123';
const UNREGISTERED_EMAIL = 'notregistered_user@example.com';
const WRONG_PASSWORD = 'WrongPassword!99';
const INVALID_EMAIL_FORMAT = 'invalid-email-format';

const ERROR_INVALID_CREDENTIALS = 'Invalid email or password.';
const ERROR_INVALID_EMAIL_FORMAT = 'Please enter a valid email address.';
const DASHBOARD_PATH = '/dashboard';

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
test.describe('SCRUM-5 | Secure User Login Functionality', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  // -------------------------------------------------------------------------
  // UI Verification
  // -------------------------------------------------------------------------
  test.describe('UI Verification', () => {
    test('TC-UV-01 | All data-testid elements are present and visible', async () => {
      await loginPage.assertAllTestIdsPresent();
    });

    test('TC-UV-02 | Email input has correct placeholder text', async () => {
      await loginPage.assertEmailPlaceholder();
    });

    test('TC-UV-03 | Password input has correct placeholder text', async () => {
      await loginPage.assertPasswordPlaceholder();
    });

    test('TC-UV-04 | Password input is masked (type="password")', async () => {
      await loginPage.assertPasswordIsMasked();
    });

    test('TC-UV-05 | "Forgot Password" link is visible on the page', async () => {
      await expect(loginPage.forgotPasswordLink).toBeVisible();
    });
  });

  // -------------------------------------------------------------------------
  // Boundary Value – Login Button State
  // -------------------------------------------------------------------------
  test.describe('Boundary Value | Login Button State', () => {
    test('TC-BV-01 | Login button is disabled when both fields are empty', async () => {
      await loginPage.assertLoginButtonDisabled();
    });

    test('TC-BV-02 | Login button is disabled when only email is filled', async () => {
      await loginPage.fillEmail(VALID_EMAIL);
      await loginPage.assertLoginButtonDisabled();
    });

    test('TC-BV-03 | Login button is disabled when only password is filled', async () => {
      await loginPage.fillPassword(VALID_PASSWORD);
      await loginPage.assertLoginButtonDisabled();
    });

    test('TC-BV-04 | Login button is enabled when both fields contain text', async () => {
      await loginPage.fillEmail(VALID_EMAIL);
      await loginPage.fillPassword(VALID_PASSWORD);
      await loginPage.assertLoginButtonEnabled();
    });
  });

  // -------------------------------------------------------------------------
  // Happy Path
  // -------------------------------------------------------------------------
  test.describe('Happy Path', () => {
    test('TC-HP-01 | Successful login with valid credentials redirects to /dashboard', async () => {
      await loginPage.login(VALID_EMAIL, VALID_PASSWORD);
      await loginPage.assertRedirectedTo(DASHBOARD_PATH);
    });
  });

  // -------------------------------------------------------------------------
  // Negative / Error Paths
  // -------------------------------------------------------------------------
  test.describe('Negative Path', () => {
    test('TC-NP-01 | Unregistered email shows "Invalid email or password." error', async () => {
      await loginPage.login(UNREGISTERED_EMAIL, WRONG_PASSWORD);
      await loginPage.assertErrorMessage(ERROR_INVALID_CREDENTIALS);
    });

    test('TC-NP-02 | Valid email with wrong password shows "Invalid email or password." error', async () => {
      await loginPage.login(VALID_EMAIL, WRONG_PASSWORD);
      await loginPage.assertErrorMessage(ERROR_INVALID_CREDENTIALS);
    });

    test('TC-NP-03 | Invalid email format triggers format validation error', async () => {
      await loginPage.fillEmail(INVALID_EMAIL_FORMAT);
      await loginPage.fillPassword(VALID_PASSWORD);
      await loginPage.clickLoginButton();
      await loginPage.assertErrorMessage(ERROR_INVALID_EMAIL_FORMAT);
    });

    test('TC-NP-04 | Error container is not visible before any submission attempt', async () => {
      await expect(loginPage.errorContainer).toBeHidden();
    });
  });

  // -------------------------------------------------------------------------
  // Security
  // -------------------------------------------------------------------------
  test.describe('Security', () => {
    test('TC-SEC-01 | Login request is sent over HTTPS', async ({ page }) => {
      const requests: string[] = [];

      page.on('request', request => {
        if (
          request.resourceType() === 'fetch' ||
          request.resourceType() === 'xhr' ||
          request.resourceType() === 'document'
        ) {
          requests.push(request.url());
        }
      });

      await loginPage.login(VALID_EMAIL, VALID_PASSWORD);

      const loginRequests = requests.filter(
        url => url.includes('login') || url.includes('auth') || url.includes('session')
      );

      // Every captured auth-related request must use HTTPS
      for (const url of loginRequests) {
        expect(url, `Expected HTTPS but got: ${url}`).toMatch(/^https:\/\//);
      }
    });
  });
});

import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorContainer: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByTestId('login-email-input');
    this.passwordInput = page.getByTestId('login-password-input');
    this.loginButton = page.getByTestId('login-submit-button');
    this.errorContainer = page.getByTestId('login-error-container');
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
  }

  /**
   * Navigate to the login page.
   */
  async goto(path = '/login'): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Fill in the email field.
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill in the password field.
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the Login button.
   */
  async clickLoginButton(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Perform a full login action with the provided credentials.
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }

  /**
   * Retrieve the visible text of the error container.
   */
  async getErrorMessage(): Promise<string> {
    await this.errorContainer.waitFor({ state: 'visible' });
    return (await this.errorContainer.textContent()) ?? '';
  }

  /**
   * Assert that the current URL matches the expected path.
   */
  async assertRedirectedTo(expectedPath: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(expectedPath));
  }

  /**
   * Assert that the Login button is disabled.
   */
  async assertLoginButtonDisabled(): Promise<void> {
    await expect(this.loginButton).toBeDisabled();
  }

  /**
   * Assert that the Login button is enabled.
   */
  async assertLoginButtonEnabled(): Promise<void> {
    await expect(this.loginButton).toBeEnabled();
  }

  /**
   * Assert that the error container displays the expected message.
   */
  async assertErrorMessage(expectedMessage: string): Promise<void> {
    await expect(this.errorContainer).toBeVisible();
    await expect(this.errorContainer).toContainText(expectedMessage);
  }

  /**
   * Assert that the email input has the correct placeholder.
   */
  async assertEmailPlaceholder(): Promise<void> {
    await expect(this.emailInput).toHaveAttribute('placeholder', 'Enter your email.');
  }

  /**
   * Assert that the password input has the correct placeholder.
   */
  async assertPasswordPlaceholder(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('placeholder', 'Enter your password.');
  }

  /**
   * Assert that the password field masks its input (type="password").
   */
  async assertPasswordIsMasked(): Promise<void> {
    await expect(this.passwordInput).toHaveAttribute('type', 'password');
  }

  /**
   * Assert that all required data-testid elements are present and visible.
   */
  async assertAllTestIdsPresent(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }
}

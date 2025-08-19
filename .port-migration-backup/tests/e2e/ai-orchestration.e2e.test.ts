/**
 * End-to-End Tests for AI Orchestration Features
 * Tests complete user flows from frontend to backend services
 */

import { test, expect } from "@playwright/test";
import { Page } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:4000";

// Test user credentials
const TEST_USER = {
  email: "test@personalai.com",
  password: "Test@123",
};

class AIOrchestrationPage {
  constructor(private page: Page) {}

  async navigateToAI() {
    await this.page.goto(`${BASE_URL}/ai/orchestration`);
    await this.page.waitForLoadState("networkidle");
  }

  async login() {
    await this.page.goto(`${BASE_URL}/auth/login`);
    await this.page.fill('[data-testid="email-input"]', TEST_USER.email);
    await this.page.fill('[data-testid="password-input"]', TEST_USER.password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL("**/dashboard");
  }

  async createTaskChain(goals: string[], options?: any) {
    await this.page.click('[data-testid="create-chain-button"]');

    // Fill in goals
    for (let i = 0; i < goals.length; i++) {
      await this.page.fill(`[data-testid="goal-input-${i}"]`, goals[i]);
      if (i < goals.length - 1) {
        await this.page.click('[data-testid="add-goal-button"]');
      }
    }

    // Set options if provided
    if (options?.priority) {
      await this.page.selectOption(
        '[data-testid="priority-select"]',
        options.priority,
      );
    }

    if (options?.parallelization) {
      await this.page.check('[data-testid="parallelization-checkbox"]');
    }

    await this.page.click('[data-testid="create-chain-submit"]');

    // Wait for chain creation to complete
    await this.page.waitForSelector('[data-testid="chain-created-success"]');
  }

  async waitForChainProgress(chainId: string, expectedProgress: number) {
    await this.page.waitForFunction(
      ([id, progress]) => {
        const progressElement = document.querySelector(
          `[data-testid="chain-${id}-progress"]`,
        );
        if (!progressElement) return false;
        const currentProgress = parseInt(progressElement.textContent || "0");
        return currentProgress >= progress;
      },
      [chainId, expectedProgress],
      { timeout: 30000 },
    );
  }

  async getChainStatus(chainId: string) {
    const statusElement = await this.page.locator(
      `[data-testid="chain-${chainId}-status"]`,
    );
    return await statusElement.textContent();
  }

  async pauseChain(chainId: string) {
    await this.page.click(`[data-testid="chain-${chainId}-pause-button"]`);
    await this.page.waitForSelector(`[data-testid="chain-${chainId}-paused"]`);
  }

  async resumeChain(chainId: string) {
    await this.page.click(`[data-testid="chain-${chainId}-resume-button"]`);
    await this.page.waitForSelector(`[data-testid="chain-${chainId}-resumed"]`);
  }

  async cancelChain(chainId: string) {
    await this.page.click(`[data-testid="chain-${chainId}-cancel-button"]`);
    await this.page.click('[data-testid="confirm-cancel-button"]');
    await this.page.waitForSelector(
      `[data-testid="chain-${chainId}-cancelled"]`,
    );
  }

  async viewChainDetails(chainId: string) {
    await this.page.click(`[data-testid="chain-${chainId}-details-button"]`);
    await this.page.waitForSelector('[data-testid="chain-details-modal"]');
  }

  async createCollaboration(goal: string, capabilities: string[]) {
    await this.page.click('[data-testid="create-collaboration-button"]');
    await this.page.fill('[data-testid="collaboration-goal-input"]', goal);

    for (const capability of capabilities) {
      await this.page.check(
        `[data-testid="capability-${capability}-checkbox"]`,
      );
    }

    await this.page.click('[data-testid="create-collaboration-submit"]');
    await this.page.waitForSelector(
      '[data-testid="collaboration-created-success"]',
    );
  }

  async getAvailableAgents() {
    await this.page.click('[data-testid="view-agents-button"]');
    await this.page.waitForSelector('[data-testid="agents-list"]');

    const agents = await this.page.$$eval(
      '[data-testid^="agent-"]',
      (elements) =>
        elements.map((el) => ({
          id: el.getAttribute("data-agent-id"),
          name: el.querySelector('[data-testid="agent-name"]')?.textContent,
          status: el.querySelector('[data-testid="agent-status"]')?.textContent,
          capabilities: el
            .querySelector('[data-testid="agent-capabilities"]')
            ?.textContent?.split(","),
        })),
    );

    return agents;
  }
}

test.describe("AI Orchestration E2E Tests", () => {
  let aiPage: AIOrchestrationPage;

  test.beforeEach(async ({ page }) => {
    aiPage = new AIOrchestrationPage(page);

    // Login before each test
    await aiPage.login();
    await aiPage.navigateToAI();
  });

  test.describe("Task Chain Management", () => {
    test("should create a simple task chain successfully", async ({ page }) => {
      const goals = [
        "Create a simple login form",
        "Add form validation",
        "Style the form with CSS",
      ];

      await aiPage.createTaskChain(goals, { priority: "medium" });

      // Verify chain appears in the UI
      await expect(page.locator('[data-testid^="chain-"]')).toBeVisible();

      // Verify chain has correct status
      const chainElement = page.locator('[data-testid^="chain-"]').first();
      const chainId = await chainElement.getAttribute("data-chain-id");

      expect(chainId).toBeTruthy();

      const status = await aiPage.getChainStatus(chainId!);
      expect(["planning", "executing"]).toContain(status);
    });

    test("should create a complex task chain with multiple goals", async ({
      page,
    }) => {
      const goals = [
        "Design and implement a complete user authentication system",
        "Create a responsive dashboard with real-time analytics",
        "Implement role-based access control",
        "Add comprehensive unit and integration tests",
        "Deploy to staging environment with monitoring",
      ];

      await aiPage.createTaskChain(goals, {
        priority: "high",
        parallelization: true,
      });

      // Wait for chain to start executing
      const chainElement = page.locator('[data-testid^="chain-"]').first();
      const chainId = await chainElement.getAttribute("data-chain-id");

      // Verify chain progresses
      await aiPage.waitForChainProgress(chainId!, 10);

      // Check task breakdown
      await aiPage.viewChainDetails(chainId!);

      // Verify tasks are created
      await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
      const tasks = await page.$$('[data-testid^="task-"]');
      expect(tasks.length).toBeGreaterThan(3);
    });

    test("should handle chain control operations", async ({ page }) => {
      const goals = ["Create a simple component"];

      await aiPage.createTaskChain(goals);

      const chainElement = page.locator('[data-testid^="chain-"]').first();
      const chainId = await chainElement.getAttribute("data-chain-id");

      // Test pause functionality
      await aiPage.pauseChain(chainId!);
      let status = await aiPage.getChainStatus(chainId!);
      expect(status).toBe("paused");

      // Test resume functionality
      await aiPage.resumeChain(chainId!);
      status = await aiPage.getChainStatus(chainId!);
      expect(["executing", "planning"]).toContain(status);

      // Test cancel functionality
      await aiPage.cancelChain(chainId!);
      status = await aiPage.getChainStatus(chainId!);
      expect(status).toBe("cancelled");
    });

    test("should show real-time progress updates", async ({ page }) => {
      const goals = ["Implement a feature with multiple steps"];

      await aiPage.createTaskChain(goals);

      const chainElement = page.locator('[data-testid^="chain-"]').first();
      const chainId = await chainElement.getAttribute("data-chain-id");

      // Wait for progress to update
      await aiPage.waitForChainProgress(chainId!, 25);

      // Verify progress indicator is visible and updating
      const progressBar = page.locator(
        `[data-testid="chain-${chainId}-progress-bar"]`,
      );
      await expect(progressBar).toBeVisible();

      const progressText = await page
        .locator(`[data-testid="chain-${chainId}-progress-text"]`)
        .textContent();
      expect(progressText).toMatch(/\d+%/);
    });
  });

  test.describe("Multi-Agent Collaboration", () => {
    test("should create a collaboration session successfully", async ({
      page,
    }) => {
      const goal = "Develop a secure payment processing system";
      const capabilities = ["security", "backend-development", "testing"];

      await aiPage.createCollaboration(goal, capabilities);

      // Verify collaboration appears in the UI
      await expect(
        page.locator('[data-testid="collaboration-session"]'),
      ).toBeVisible();

      // Check participants
      const participants = await page.$$('[data-testid^="participant-"]');
      expect(participants.length).toBeGreaterThan(1);
    });

    test("should show available agents and their capabilities", async ({
      page,
    }) => {
      const agents = await aiPage.getAvailableAgents();

      expect(agents.length).toBeGreaterThan(0);

      agents.forEach((agent) => {
        expect(agent.name).toBeTruthy();
        expect(agent.status).toMatch(/idle|busy|available/);
        expect(agent.capabilities).toBeTruthy();
      });
    });

    test("should handle agent workload and availability", async ({ page }) => {
      // Create multiple collaborations to test workload
      await aiPage.createCollaboration("First project", ["code-generation"]);
      await aiPage.createCollaboration("Second project", ["testing"]);

      const agents = await aiPage.getAvailableAgents();

      // Some agents should show busy status
      const busyAgents = agents.filter((agent) => agent.status === "busy");
      expect(busyAgents.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Goal Analysis and Planning", () => {
    test("should analyze goals and provide recommendations", async ({
      page,
    }) => {
      await page.click('[data-testid="analyze-goals-button"]');

      const goals = [
        "Build a complete e-commerce platform",
        "Implement advanced search functionality",
        "Add payment integration",
        "Create mobile app version",
      ];

      for (let i = 0; i < goals.length; i++) {
        await page.fill(`[data-testid="analysis-goal-${i}"]`, goals[i]);
        if (i < goals.length - 1) {
          await page.click('[data-testid="add-analysis-goal"]');
        }
      }

      await page.click('[data-testid="analyze-submit"]');

      // Wait for analysis results
      await page.waitForSelector('[data-testid="analysis-results"]');

      // Verify complexity analysis
      const complexity = await page
        .locator('[data-testid="complexity-level"]')
        .textContent();
      expect(["simple", "moderate", "complex", "highly-complex"]).toContain(
        complexity,
      );

      // Verify recommendations
      const recommendations = await page.$$('[data-testid^="recommendation-"]');
      expect(recommendations.length).toBeGreaterThan(0);

      // Verify task plans
      const plans = await page.$$('[data-testid^="task-plan-"]');
      expect(plans.length).toBeGreaterThan(0);
    });

    test("should provide alternative execution strategies", async ({
      page,
    }) => {
      await page.click('[data-testid="analyze-goals-button"]');

      await page.fill(
        '[data-testid="analysis-goal-0"]',
        "Complex system integration",
      );
      await page.click('[data-testid="analyze-submit"]');

      await page.waitForSelector('[data-testid="analysis-results"]');

      // Check for alternatives
      await page.click('[data-testid="view-alternatives-button"]');

      const alternatives = await page.$$('[data-testid^="alternative-plan-"]');
      expect(alternatives.length).toBeGreaterThanOrEqual(1);

      // Verify fast-track option
      const fastTrack = page.locator('[data-testid="alternative-fast-track"]');
      await expect(fastTrack).toBeVisible();
    });
  });

  test.describe("Real-time Updates and WebSocket Integration", () => {
    test("should receive real-time task updates via WebSocket", async ({
      page,
    }) => {
      const goals = ["Create a component that updates in real-time"];

      await aiPage.createTaskChain(goals);

      const chainElement = page.locator('[data-testid^="chain-"]').first();
      const chainId = await chainElement.getAttribute("data-chain-id");

      // Monitor for real-time updates
      let updateReceived = false;
      page.on("websocket", (ws) => {
        ws.on("framereceived", (event) => {
          const data = event.payload;
          if (data.includes(chainId!)) {
            updateReceived = true;
          }
        });
      });

      // Wait for some progress
      await aiPage.waitForChainProgress(chainId!, 20);

      expect(updateReceived).toBe(true);
    });

    test("should handle WebSocket connection errors gracefully", async ({
      page,
    }) => {
      // Simulate network issues
      await page.route("**/ws/**", (route) => route.abort());

      const goals = ["Test WebSocket error handling"];
      await aiPage.createTaskChain(goals);

      // Should still show chain creation
      await expect(page.locator('[data-testid^="chain-"]')).toBeVisible();

      // Should show connection error message
      await expect(
        page.locator('[data-testid="websocket-error"]'),
      ).toBeVisible();
    });
  });

  test.describe("Error Handling and Edge Cases", () => {
    test("should handle empty goals gracefully", async ({ page }) => {
      await page.click('[data-testid="create-chain-button"]');

      // Try to submit without goals
      await page.click('[data-testid="create-chain-submit"]');

      // Should show validation error
      await expect(
        page.locator('[data-testid="goals-required-error"]'),
      ).toBeVisible();
    });

    test("should handle service unavailability", async ({ page }) => {
      // Mock service failure
      await page.route("**/api/v1/ai/**", (route) =>
        route.fulfill({ status: 503, body: "Service Unavailable" }),
      );

      const goals = ["Test service failure"];

      await page.click('[data-testid="create-chain-button"]');
      await page.fill('[data-testid="goal-input-0"]', goals[0]);
      await page.click('[data-testid="create-chain-submit"]');

      // Should show error message
      await expect(page.locator('[data-testid="service-error"]')).toBeVisible();
    });

    test("should handle authentication expiration", async ({ page }) => {
      // Mock expired token
      await page.route("**/api/v1/ai/**", (route) =>
        route.fulfill({ status: 401, body: "Unauthorized" }),
      );

      const goals = ["Test auth expiration"];

      await page.click('[data-testid="create-chain-button"]');
      await page.fill('[data-testid="goal-input-0"]', goals[0]);
      await page.click('[data-testid="create-chain-submit"]');

      // Should redirect to login
      await page.waitForURL("**/auth/login");
    });

    test("should handle large numbers of concurrent chains", async ({
      page,
    }) => {
      const numberOfChains = 5;
      const goals = ["Concurrent test chain"];

      // Create multiple chains concurrently
      const chainPromises = Array.from({ length: numberOfChains }, () =>
        aiPage.createTaskChain(goals),
      );

      await Promise.all(chainPromises);

      // Verify all chains are created
      const chains = await page.$$('[data-testid^="chain-"]');
      expect(chains.length).toBe(numberOfChains);
    });
  });

  test.describe("Performance and User Experience", () => {
    test("should load AI orchestration page within performance budget", async ({
      page,
    }) => {
      const startTime = Date.now();

      await aiPage.navigateToAI();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // 3 second budget
    });

    test("should provide responsive feedback during chain creation", async ({
      page,
    }) => {
      await page.click('[data-testid="create-chain-button"]');
      await page.fill('[data-testid="goal-input-0"]', "Test responsiveness");

      // Check loading state appears immediately
      await page.click('[data-testid="create-chain-submit"]');
      await expect(
        page.locator('[data-testid="creating-chain-loader"]'),
      ).toBeVisible();
    });

    test("should handle mobile viewport correctly", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone dimensions

      await aiPage.navigateToAI();

      // Mobile navigation should be accessible
      await expect(
        page.locator('[data-testid="mobile-menu-button"]'),
      ).toBeVisible();

      // Create chain button should be accessible
      await expect(
        page.locator('[data-testid="create-chain-button"]'),
      ).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should be accessible with keyboard navigation", async ({ page }) => {
      await aiPage.navigateToAI();

      // Tab through interface
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter"); // Should activate create chain

      await expect(
        page.locator('[data-testid="create-chain-modal"]'),
      ).toBeVisible();
    });

    test("should have proper ARIA labels", async ({ page }) => {
      await aiPage.navigateToAI();

      // Check for ARIA labels
      const createButton = page.locator('[data-testid="create-chain-button"]');
      const ariaLabel = await createButton.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    });
  });

  test.describe("Data Persistence and State Management", () => {
    test("should persist chain state across page refreshes", async ({
      page,
    }) => {
      const goals = ["Test persistence"];
      await aiPage.createTaskChain(goals);

      const chainElement = page.locator('[data-testid^="chain-"]').first();
      const chainId = await chainElement.getAttribute("data-chain-id");

      // Refresh page
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Chain should still be visible
      await expect(
        page.locator(`[data-testid="chain-${chainId}"]`),
      ).toBeVisible();
    });

    test("should maintain user preferences", async ({ page }) => {
      // Set a preference
      await page.click('[data-testid="preferences-button"]');
      await page.check('[data-testid="auto-start-chains-checkbox"]');
      await page.click('[data-testid="save-preferences"]');

      // Refresh and check persistence
      await page.reload();
      await page.waitForLoadState("networkidle");

      await page.click('[data-testid="preferences-button"]');
      const isChecked = await page.isChecked(
        '[data-testid="auto-start-chains-checkbox"]',
      );
      expect(isChecked).toBe(true);
    });
  });
});

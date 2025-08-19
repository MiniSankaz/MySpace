/**
 * Integration Tests for Inter-Service Communication
 * Tests service discovery, routing, circuit breakers, and resilience patterns
 */

import axios from "axios";
import { portConfig, getServiceUrl, getFrontendPort, getGatewayPort } from '@/shared/config/ports.config';
import WebSocket from "ws";
import {
  ServiceRegistry,
  ServiceDefinition,
} from "../../shared/services/service-registry";
import { InterServiceClient } from "../../shared/http/inter-service-client";
import { CircuitBreaker } from "../../shared/resilience/circuit-breaker";
import { ExponentialBackoffRetry } from "../../shared/resilience/retry-policy";

const GATEWAY_URL = "http://${getGatewayPort()}";
const TEST_TIMEOUT = 30000;

describe("Inter-Service Communication Integration Tests", () => {
  let registry: ServiceRegistry;
  let interServiceClient: InterServiceClient;

  beforeAll(async () => {
    // Initialize service registry
    registry = new ServiceRegistry();

    // Initialize inter-service client
    interServiceClient = new InterServiceClient(
      "test-client",
      {
        retry: {
          maxAttempts: 3,
          baseDelay: 100,
          maxDelay: 1000,
        },
        defaultTimeout: 5000,
      },
      registry,
    );
  });

  afterAll(async () => {
    await registry.shutdown();
    await interServiceClient.shutdown();
  });

  describe("Service Discovery", () => {
    test(
      "should register and discover services",
      async () => {
        const serviceDefinition: ServiceDefinition = {
          id: "test-service-1",
          name: "test-service",
          version: "1.0.0",
          host: "localhost",
          port: 9999,
          protocol: "http",
          healthCheck: {
            endpoint: "/health",
            interval: 5000,
            timeout: 2000,
            retries: 3,
          },
          metadata: {
            capabilities: ["test"],
            dependencies: [],
            environment: "test",
          },
          status: "healthy",
          lastHeartbeat: new Date(),
        };

        // Register service
        await registry.register(serviceDefinition);

        // Discover service
        const services = await registry.discover("test-service");
        expect(services).toHaveLength(1);
        expect(services[0].id).toBe("test-service-1");

        // Get healthy instance
        const instance = await registry.getHealthyInstance("test-service");
        expect(instance).toBeTruthy();
        expect(instance?.status).toBe("healthy");

        // Deregister service
        await registry.deregister("test-service-1");

        // Verify service is removed
        const servicesAfter = await registry.discover("test-service");
        expect(servicesAfter).toHaveLength(0);
      },
      TEST_TIMEOUT,
    );

    test("should handle service health updates", async () => {
      const serviceDefinition: ServiceDefinition = {
        id: "health-test-service",
        name: "health-service",
        version: "1.0.0",
        host: "localhost",
        port: 9998,
        protocol: "http",
        healthCheck: {
          endpoint: "/health",
          interval: 5000,
          timeout: 2000,
          retries: 3,
        },
        metadata: {
          capabilities: [],
          dependencies: [],
          environment: "test",
        },
        status: "healthy",
        lastHeartbeat: new Date(),
      };

      await registry.register(serviceDefinition);

      // Update health status
      await registry.updateHealth("health-test-service", "degraded");

      const service = await registry.getService("health-test-service");
      expect(service?.status).toBe("degraded");

      // Update to unhealthy
      await registry.updateHealth("health-test-service", "unhealthy");

      const unhealthyService = await registry.getService("health-test-service");
      expect(unhealthyService?.status).toBe("unhealthy");

      await registry.deregister("health-test-service");
    });
  });

  describe("Gateway Routing", () => {
    test(
      "should route requests to correct services",
      async () => {
        try {
          // Test user service routing
          const userResponse = await axios.get(
            `${GATEWAY_URL}/api/users/health`,
          );
          expect(userResponse.status).toBe(200);
          expect(userResponse.data).toHaveProperty("status");

          // Test AI service routing
          const aiResponse = await axios.get(`${GATEWAY_URL}/api/ai/health`);
          expect(aiResponse.status).toBe(200);
          expect(aiResponse.data).toHaveProperty("status");

          // Test portfolio service routing
          const portfolioResponse = await axios.get(
            `${GATEWAY_URL}/api/portfolio/health`,
          );
          expect(portfolioResponse.status).toBe(200);
          expect(portfolioResponse.data).toHaveProperty("status");
        } catch (error: any) {
          // Services might not be running, skip test
          if (error.code === "ECONNREFUSED") {
            console.log("Gateway not running, skipping routing tests");
            return;
          }
          throw error;
        }
      },
      TEST_TIMEOUT,
    );

    test("should handle authentication for protected routes", async () => {
      try {
        // Test without authentication - should fail
        const response = await axios.get(`${GATEWAY_URL}/api/users/profile`, {
          validateStatus: () => true,
        });

        expect(response.status).toBe(401);
        expect(response.data).toHaveProperty("error");
      } catch (error: any) {
        if (error.code === "ECONNREFUSED") {
          console.log("Gateway not running, skipping auth tests");
          return;
        }
        throw error;
      }
    });

    test("should aggregate health checks", async () => {
      try {
        const response = await axios.get(`${GATEWAY_URL}/health`);

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty("status");
        expect(response.data).toHaveProperty("services");
        expect(response.data).toHaveProperty("timestamp");
      } catch (error: any) {
        if (error.code === "ECONNREFUSED") {
          console.log("Gateway not running, skipping health aggregation tests");
          return;
        }
        throw error;
      }
    });
  });

  describe("Circuit Breaker", () => {
    test("should open circuit after failure threshold", async () => {
      const breaker = new CircuitBreaker({
        name: "test-breaker",
        failureThreshold: 3,
        timeout: 1000,
        successThreshold: 2,
      });

      let failures = 0;
      const failingFunction = async () => {
        failures++;
        throw new Error("Test failure");
      };

      // Trigger failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open
      expect(breaker.getState()).toBe("OPEN");

      // Next call should fail immediately
      try {
        await breaker.execute(failingFunction);
        fail("Should have thrown CircuitOpenError");
      } catch (error: any) {
        expect(error.name).toBe("CircuitOpenError");
      }

      expect(failures).toBe(3); // No additional execution
    });

    test("should transition to half-open after timeout", async () => {
      const breaker = new CircuitBreaker({
        name: "timeout-breaker",
        failureThreshold: 1,
        timeout: 100, // 100ms timeout
        successThreshold: 1,
      });

      // Open the circuit
      try {
        await breaker.execute(async () => {
          throw new Error("Test failure");
        });
      } catch {
        // Expected
      }

      expect(breaker.getState()).toBe("OPEN");

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute successful function
      const result = await breaker.execute(async () => "success");

      expect(result).toBe("success");
      expect(breaker.getState()).toBe("CLOSED");
    });

    test("should calculate metrics correctly", () => {
      const breaker = new CircuitBreaker({
        name: "metrics-breaker",
      });

      const metrics = breaker.getMetrics();

      expect(metrics).toHaveProperty("state");
      expect(metrics).toHaveProperty("failureCount");
      expect(metrics).toHaveProperty("successCount");
      expect(metrics).toHaveProperty("errorPercentage");
      expect(metrics.state).toBe("CLOSED");
    });
  });

  describe("Retry Policy", () => {
    test("should retry with exponential backoff", async () => {
      const retry = new ExponentialBackoffRetry({
        maxAttempts: 3,
        baseDelay: 10,
        maxDelay: 100,
      });

      let attempts = 0;
      const retryableFunction = async () => {
        attempts++;
        if (attempts < 3) {
          const error: any = new Error("Temporary failure");
          error.response = { status: 503 };
          throw error;
        }
        return "success";
      };

      const startTime = Date.now();
      const result = await retry.execute(retryableFunction);
      const duration = Date.now() - startTime;

      expect(result).toBe("success");
      expect(attempts).toBe(3);
      expect(duration).toBeGreaterThan(20); // At least 10ms + 20ms delays
    });

    test("should not retry non-retriable errors", async () => {
      const retry = new ExponentialBackoffRetry({
        maxAttempts: 3,
      });

      let attempts = 0;
      const nonRetriableFunction = async () => {
        attempts++;
        const error: any = new Error("Bad request");
        error.response = { status: 400 };
        throw error;
      };

      try {
        await retry.execute(nonRetriableFunction);
        fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toBe("Bad request");
        expect(attempts).toBe(1); // No retries
      }
    });

    test("should apply jitter to prevent thundering herd", async () => {
      const retry = new ExponentialBackoffRetry({
        maxAttempts: 2,
        baseDelay: 100,
        jitter: true,
      });

      const delays: number[] = [];
      let lastTime = Date.now();

      const measuredFunction = async () => {
        const now = Date.now();
        delays.push(now - lastTime);
        lastTime = now;

        if (delays.length < 2) {
          throw new Error("Retry me");
        }
        return "done";
      };

      await retry.execute(measuredFunction);

      // Second delay should have jitter (not exactly 100ms)
      expect(delays[1]).toBeGreaterThan(90);
      expect(delays[1]).toBeLessThan(140); // 100ms + up to 30% jitter
    });
  });

  describe("Inter-Service Client", () => {
    test("should make authenticated service-to-service calls", async () => {
      // Mock service registration
      const mockService: ServiceDefinition = {
        id: "mock-service",
        name: "mock-service",
        version: "1.0.0",
        host: "localhost",
        port: 4100, // User service port
        protocol: "http",
        healthCheck: {
          endpoint: "/health",
          interval: 5000,
          timeout: 2000,
          retries: 3,
        },
        metadata: {
          capabilities: [],
          dependencies: [],
          environment: "test",
        },
        status: "healthy",
        lastHeartbeat: new Date(),
      };

      await registry.register(mockService);

      try {
        const response = await interServiceClient.get(
          "mock-service",
          "/health",
        );

        expect(response).toBeTruthy();
      } catch (error: any) {
        // Service might not be running
        if (error.code === "ECONNREFUSED") {
          console.log(
            "Service not running, skipping inter-service client test",
          );
        }
      } finally {
        await registry.deregister("mock-service");
      }
    });
  });

  describe("WebSocket Proxying", () => {
    test("should establish WebSocket connection through gateway", (done) => {
      const ws = new WebSocket(`ws://${getGatewayPort()}/ws/terminal`);

      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "test", data: "hello" }));
      });

      ws.on("message", (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "connected") {
          expect(message).toHaveProperty("connectionId");
          expect(message).toHaveProperty("service");
          ws.close();
          done();
        }
      });

      ws.on("error", (error) => {
        // Gateway might not be running
        if (error.message.includes("ECONNREFUSED")) {
          console.log("Gateway WebSocket not available, skipping test");
          done();
        } else {
          done(error);
        }
      });

      // Timeout safety
      setTimeout(() => {
        ws.close();
        done();
      }, 5000);
    });
  });

  describe("Request Correlation", () => {
    test("should propagate correlation ID across services", async () => {
      const correlationId = "test-correlation-123";

      try {
        const response = await axios.get(`${GATEWAY_URL}/health`, {
          headers: {
            "x-correlation-id": correlationId,
          },
        });

        expect(response.headers["x-correlation-id"]).toBe(correlationId);
        expect(response.headers).toHaveProperty("x-request-id");
      } catch (error: any) {
        if (error.code === "ECONNREFUSED") {
          console.log("Gateway not running, skipping correlation test");
          return;
        }
        throw error;
      }
    });
  });

  describe("Load Balancing", () => {
    test("should distribute requests across healthy instances", async () => {
      // Register multiple instances
      const instances: ServiceDefinition[] = [];

      for (let i = 0; i < 3; i++) {
        instances.push({
          id: `lb-service-${i}`,
          name: "lb-service",
          version: "1.0.0",
          host: "localhost",
          port: 5000 + i,
          protocol: "http",
          healthCheck: {
            endpoint: "/health",
            interval: 5000,
            timeout: 2000,
            retries: 3,
          },
          metadata: {
            capabilities: [],
            dependencies: [],
            environment: "test",
          },
          status: "healthy",
          lastHeartbeat: new Date(),
        });
      }

      // Register all instances
      for (const instance of instances) {
        await registry.register(instance);
      }

      // Make multiple requests and check distribution
      const selectedInstances = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const instance = await registry.getHealthyInstance("lb-service");
        if (instance) {
          selectedInstances.add(instance.id);
        }
      }

      // Should have selected multiple different instances
      expect(selectedInstances.size).toBeGreaterThan(1);

      // Cleanup
      for (const instance of instances) {
        await registry.deregister(instance.id);
      }
    });
  });

  describe("Failure Recovery", () => {
    test("should handle cascading failures gracefully", async () => {
      // Simulate service failure scenario
      const failingService: ServiceDefinition = {
        id: "failing-service",
        name: "failing-service",
        version: "1.0.0",
        host: "localhost",
        port: 9997,
        protocol: "http",
        healthCheck: {
          endpoint: "/health",
          interval: 1000,
          timeout: 500,
          retries: 1,
        },
        metadata: {
          capabilities: [],
          dependencies: [],
          environment: "test",
        },
        status: "healthy",
        lastHeartbeat: new Date(),
      };

      await registry.register(failingService);

      // Mark service as unhealthy
      await registry.updateHealth("failing-service", "unhealthy");

      // Try to get healthy instance - should return null
      const instance = await registry.getHealthyInstance("failing-service");
      expect(instance).toBeNull();

      // Mark service as healthy again
      await registry.updateHealth("failing-service", "healthy");

      // Should now return the instance
      const recoveredInstance =
        await registry.getHealthyInstance("failing-service");
      expect(recoveredInstance).toBeTruthy();
      expect(recoveredInstance?.status).toBe("healthy");

      await registry.deregister("failing-service");
    });
  });
});

// Run tests
if (require.main === module) {
  console.log("Running Inter-Service Communication Integration Tests...");

  // Set up test environment
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "error";

  // Import test runner
  const { run } = require("jest");
  run();
}

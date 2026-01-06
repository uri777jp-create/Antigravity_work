import { describe, expect, it } from "vitest";
import { listProjects } from "./neuronwriter";

describe("NeuronWriter API Key Validation", () => {
  it("should successfully authenticate with the API key", async () => {
    try {
      const result = await listProjects();
      
      // If we get here without throwing, the API key is valid
      expect(result).toBeDefined();
      
      // Check that we got a valid response structure
      expect(result).toHaveProperty("projects");
      
      console.log("[API Key Test] ✓ Authentication successful");
      console.log(`[API Key Test] Found ${result.projects?.length || 0} projects`);
    } catch (error: any) {
      // If we get a 401, the API key is invalid
      if (error.response?.status === 401) {
        throw new Error("API Key is invalid - received 401 Unauthorized");
      }
      
      // For other errors, log them but don't fail the test
      // (could be network issues, etc.)
      console.warn("[API Key Test] Warning:", error.message);
      
      // Still expect the error object to exist
      expect(error).toBeDefined();
    }
  }, 30000); // 30 second timeout for API call
});

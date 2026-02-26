import { test, expect } from "@playwright/test";

test.describe("API health checks", () => {
  test("GET /api/dashboard without case_id returns 400", async ({ request }) => {
    const response = await request.get("/api/dashboard");

    // Missing case_id should return 400, not 500
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty("error");
  });

  test("GET /api/dashboard with invalid case_id returns 400", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard?case_id=not-a-uuid");
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json.error).toContain("Invalid");
  });

  test("GET /api/dashboard with valid UUID format returns 200", async ({
    request,
  }) => {
    // Use the known Chest Pain case UUID
    const response = await request.get(
      "/api/dashboard?case_id=fd4f4dda-88e5-454d-84ef-4fc0186c03c9"
    );

    // Should be 200 (even if the case has no submissions, it should not 500)
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty("submission_count");
    expect(json).toHaveProperty("diagnosis_frequency");
  });

  test("GET /api/themes returns 200 with themes array", async ({ request }) => {
    const response = await request.get("/api/themes");

    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json).toHaveProperty("themes");
    expect(Array.isArray(json.themes)).toBe(true);
  });

  test("POST /api/submissions with empty body returns 400 (not 500)", async ({
    request,
  }) => {
    const response = await request.post("/api/submissions", {
      data: {},
    });

    // The route checks for user_id and case_id — empty body should be 400
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty("error");
  });

  test("POST /api/notes with empty body returns 400 (not 500)", async ({
    request,
  }) => {
    const response = await request.post("/api/notes", {
      data: {},
    });

    // The route checks for user_id and case_id — empty body should be 400
    expect(response.status()).toBe(400);
    const json = await response.json();
    expect(json).toHaveProperty("error");
  });
});

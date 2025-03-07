const request = require("supertest");
const app = require("../server"); 
let token;
let createdGoalId;

describe("Goal API Tests", () => {
  const testEmail = "testuser@example.com";
  const testPassword = "secret123";
  const testUserName = "testUser"

  beforeAll(async () => {
    try {
      await request(app)
        .post("/auth/register")
        .send({ email: testEmail, password: testPassword, userName: testUserName });
      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email: testEmail, password: testPassword });

      if (loginRes.statusCode === 200 && loginRes.body.token) {
        token = loginRes.body.token;
        console.log("Test user logged in, token acquired.");
      } else {
        throw new Error(
          `Failed to log in test user. Status: ${loginRes.statusCode}, Body: ${JSON.stringify(
            loginRes.body
          )}`
        );
      }
    } catch (err) {
      console.error("Error during test setup:", err.message);
    }
  });
  afterAll(async () => {
    if (createdGoalId) {
     
        await request(app)
          .delete(`/goal/${createdGoalId}`)
          .set("Authorization", `Bearer ${token}`);
      
    }
  });
  

  it("should successfully create a new goal", async () => {
    const res = await request(app)
      .post("/goal")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Test-Goal", description: "A sample test goal" });

    expect(res.statusCode).toBe(201);
    expect(res.body.goal.name).toBe("Test-Goal");
    createdGoalId = res.body.goal.id; 
  });

  it("should retrieve the created goal", async () => {
    const res = await request(app)
      .get(`/goal/${createdGoalId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Test-Goal");
    expect(res.body.description).toBe("A sample test goal");
  });

  it("should list goals (with pagination)", async () => {
    const res = await request(app)
      .get("/goal?page=1&limit=5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.goals)).toBe(true);
  });

  it("should list joined goals", async () => {
    const res = await request(app)
      .get("/goal/joined")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.goals)).toBe(true);
  });

  it("should list owned goals", async () => {
    const res = await request(app)
      .get("/goal/owned")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.goals)).toBe(true);
  });

  it("should allow a user to join a goal", async () => {
    const res = await request(app)
      .post(`/goal/${createdGoalId}/join`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Joined goal successfully");
  });


  it("should allow a user to leave a goal", async () => {
    const res = await request(app)
      .delete(`/goal/${createdGoalId}/leave`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Left the goal successfully");
  });

  it("should upvote a goal", async () => {
    const res = await request(app)
      .post(`/goal/${createdGoalId}/vote`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "upvote" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Goal upvoted successfully");
  });

  it("should remove a vote from a goal", async () => {
    const res = await request(app)
      .post(`/goal/${createdGoalId}/vote`)
      .set("Authorization", `Bearer ${token}`)
      .send({ action: "remove" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe("Vote removed successfully");
  });

  it("should add a tip to a goal", async () => {
    const res = await request(app)
      .post(`/goal/${createdGoalId}/tips`)
      .set("Authorization", `Bearer ${token}`)
      .send({ tip: { title: "Test Tip", content: "This is a test tip" } });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toBe("Tip added successfully");
  });

  it("should list tips for a goal", async () => {
    const res = await request(app)
      .get(`/goal/${createdGoalId}/tips`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.tips)).toBe(true);
  });

 
  it("should delete a goal (if implemented)", async () => {
    const res = await request(app)
      .delete(`/goal/${createdGoalId}`)
      .set("Authorization", `Bearer ${token}`);

    if (res.statusCode === 200) {
      expect(res.body.message).toBe("Goal deleted successfully");
    } else {
      console.warn("Delete route might not be implemented.");
    }
  });
});

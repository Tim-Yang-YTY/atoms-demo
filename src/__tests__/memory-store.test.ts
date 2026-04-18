import { memoryStore } from "@/lib/storage/memory-store";

describe("MemoryStore", () => {
  describe("Users", () => {
    it("creates and finds a user by email", () => {
      const user = memoryStore.createUser("test@example.com", "pass123", "Test User");
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.id).toBeDefined();

      const found = memoryStore.findUserByEmail("test@example.com");
      expect(found).not.toBeNull();
      expect(found!.email).toBe("test@example.com");
      expect(found!.password).toBe("pass123");
    });

    it("returns null for non-existent email", () => {
      expect(memoryStore.findUserByEmail("nope@example.com")).toBeNull();
    });

    it("finds user by id without password", () => {
      const user = memoryStore.createUser("id-test@example.com", "secret", "ID Test");
      const found = memoryStore.findUserById(user.id);
      expect(found).not.toBeNull();
      expect(found!.email).toBe("id-test@example.com");
      expect((found as Record<string, unknown>).password).toBeUndefined();
    });
  });

  describe("Projects", () => {
    it("creates and lists projects for a user", () => {
      const user = memoryStore.createUser("proj@example.com", "pass", "Proj User");
      const project = memoryStore.createProject(user.id, "My App", "A test app", null);

      expect(project.name).toBe("My App");
      expect(project.status).toBe("draft");

      const projects = memoryStore.findProjectsByUserId(user.id);
      expect(projects.length).toBeGreaterThanOrEqual(1);
      expect(projects.find((p) => p.id === project.id)).toBeDefined();
    });

    it("updates project code and status", () => {
      const user = memoryStore.createUser("code@example.com", "pass", null);
      const project = memoryStore.createProject(user.id, "Code App", "", null);

      const updated = memoryStore.updateProjectCode(project.id, "<html>test</html>");
      expect(updated.generated_code).toBe("<html>test</html>");
      expect(updated.status).toBe("completed");
    });

    it("deletes project and cascades messages", () => {
      const user = memoryStore.createUser("del@example.com", "pass", null);
      const project = memoryStore.createProject(user.id, "Delete Me", "", null);
      memoryStore.createMessage(project.id, "user", "Hello");

      memoryStore.deleteProject(project.id);
      expect(memoryStore.findProjectById(project.id)).toBeNull();
      expect(memoryStore.findMessagesByProjectId(project.id)).toHaveLength(0);
    });
  });

  describe("Messages", () => {
    it("creates and retrieves messages in order", () => {
      const user = memoryStore.createUser("msg@example.com", "pass", null);
      const project = memoryStore.createProject(user.id, "Msg App", "", null);

      memoryStore.createMessage(project.id, "user", "Build an app");
      memoryStore.createMessage(project.id, "pm", "Here is the plan");
      memoryStore.createMessage(project.id, "engineer", "Here is the code");

      const messages = memoryStore.findMessagesByProjectId(project.id);
      expect(messages.length).toBe(3);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("pm");
      expect(messages[2].role).toBe("engineer");
    });
  });
});

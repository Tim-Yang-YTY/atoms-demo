// ============================================================
// ProjectService — Business logic for project management
// ============================================================

import { projectRepository } from "@/lib/repositories/project-repository";
import { messageRepository } from "@/lib/repositories/message-repository";
import type { Project, Message, AgentRole } from "@/lib/types";

export class ProjectService {
  async getUserProjects(userId: string): Promise<Project[]> {
    return projectRepository.findByUserId(userId);
  }

  async getProject(projectId: string): Promise<Project | null> {
    return projectRepository.findById(projectId);
  }

  async createProject(
    userId: string,
    name: string,
    description: string,
    template: string | null = null
  ): Promise<Project> {
    return projectRepository.create(userId, name, description, template);
  }

  async deleteProject(projectId: string): Promise<void> {
    await messageRepository.deleteByProjectId(projectId);
    await projectRepository.delete(projectId);
  }

  async updateProjectCode(projectId: string, code: string): Promise<Project> {
    return projectRepository.updateCode(projectId, code);
  }

  async setProjectStatus(
    projectId: string,
    status: Project["status"]
  ): Promise<void> {
    return projectRepository.updateStatus(projectId, status);
  }

  async getMessages(projectId: string): Promise<Message[]> {
    return messageRepository.findByProjectId(projectId);
  }

  async addMessage(
    projectId: string,
    role: "user" | AgentRole,
    content: string
  ): Promise<Message> {
    return messageRepository.create(projectId, role, content);
  }

  async addMessages(
    messages: { project_id: string; role: "user" | AgentRole; content: string }[]
  ): Promise<Message[]> {
    return messageRepository.createBatch(messages);
  }
}

export const projectService = new ProjectService();

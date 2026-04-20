// ============================================================
// Ticket Store — localStorage-based support ticket system
// Tickets are created on errors, linked to user email for follow-up
// ============================================================

import type { Ticket, TicketStatus } from "@/lib/types";

const STORAGE_KEY = "atoms_tickets";

function generateTicketId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TK-${ts}-${rand}`;
}

export function createTicket(params: {
  projectId: string;
  userId: string;
  userEmail: string;
  error: string;
  context: string;
}): Ticket {
  const ticket: Ticket = {
    id: generateTicketId(),
    projectId: params.projectId,
    userId: params.userId,
    userEmail: params.userEmail,
    error: params.error,
    context: params.context,
    status: "open",
    created_at: new Date().toISOString(),
  };
  const tickets = getAllTickets();
  tickets.unshift(ticket);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }
  return ticket;
}

export function getAllTickets(): Ticket[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getTicketsByUser(userId: string): Ticket[] {
  return getAllTickets().filter((t) => t.userId === userId);
}

export function updateTicketStatus(ticketId: string, status: TicketStatus): void {
  const tickets = getAllTickets();
  const ticket = tickets.find((t) => t.id === ticketId);
  if (ticket) {
    ticket.status = status;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }
}

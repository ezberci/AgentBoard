import type { WebSocket } from "ws";
import { env } from "../lib/config.js";
import { logger } from "../lib/logger.js";

class ConnectionManager {
  private projectConnections: Map<number, Set<WebSocket>> = new Map();
  private globalConnections: Set<WebSocket> = new Set();

  connectProject(ws: WebSocket, projectId: number): boolean {
    const apiKey = this._extractApiKey(ws);
    if (apiKey !== env.apiKey) {
      ws.close(1008, "Invalid API key");
      return false;
    }
    const set = this.projectConnections.get(projectId) ?? new Set();
    set.add(ws);
    this.projectConnections.set(projectId, set);
    return true;
  }

  connectGlobal(ws: WebSocket): boolean {
    const apiKey = this._extractApiKey(ws);
    if (apiKey !== env.apiKey) {
      ws.close(1008, "Invalid API key");
      return false;
    }
    this.globalConnections.add(ws);
    return true;
  }

  disconnect(ws: WebSocket, projectId?: number): void {
    if (projectId !== undefined) {
      const set = this.projectConnections.get(projectId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          this.projectConnections.delete(projectId);
        }
      }
    }
    this.globalConnections.delete(ws);
  }

  async broadcastProject(
    projectId: number,
    eventType: string,
    payload: unknown
  ): Promise<void> {
    const connections = this.projectConnections.get(projectId);
    if (!connections) return;
    const message = JSON.stringify({ type: eventType, payload });
    const dead: WebSocket[] = [];
    for (const ws of connections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message, (err) => {
          if (err) {
            logger.warn({ err }, "websocket_send_failed");
            dead.push(ws);
          }
        });
      } else {
        dead.push(ws);
      }
    }
    for (const ws of dead) {
      this.disconnect(ws, projectId);
    }
  }

  async broadcastGlobal(eventType: string, payload: unknown): Promise<void> {
    const message = JSON.stringify({ type: eventType, payload });
    const dead: WebSocket[] = [];
    for (const ws of this.globalConnections) {
      if (ws.readyState === ws.OPEN) {
        ws.send(message, (err) => {
          if (err) {
            logger.warn({ err }, "websocket_send_failed");
            dead.push(ws);
          }
        });
      } else {
        dead.push(ws);
      }
    }
    for (const ws of dead) {
      this.disconnect(ws);
    }
  }

  private _extractApiKey(ws: WebSocket): string | undefined {
    const req = (ws as unknown as { upgradeReq?: { url?: string; headers?: Record<string, string | string[]> } }).upgradeReq;
    if (!req) return undefined;
    const url = new URL(req.url ?? "", "http://localhost");
    const queryKey = url.searchParams.get("api_key");
    if (queryKey) return queryKey;
    const headerKey = req.headers?.["x-api-key"];
    return Array.isArray(headerKey) ? headerKey[0] : headerKey;
  }
}

export const manager = new ConnectionManager();

export async function broadcastProject(
  projectId: number,
  eventType: string,
  payload: unknown
): Promise<void> {
  await manager.broadcastProject(projectId, eventType, payload);
}

export async function broadcastGlobal(
  eventType: string,
  payload: unknown
): Promise<void> {
  await manager.broadcastGlobal(eventType, payload);
}

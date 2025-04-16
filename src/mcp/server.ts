/* eslint-disable import/no-extraneous-dependencies */
import type { Server as HttpServer } from 'http';

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';
import express, { Request, Response } from 'express';
import * as vscode from 'vscode';

import { TrivyWrapper } from '../command/command';

import { runTool } from './toolRunner';
import { mcpTools } from './tools';

const port = 23456;

export class MCPServer {
  private mcpServer: Server | undefined;
  private httpServer: HttpServer | undefined;
  private readonly trivyWrapper: TrivyWrapper;

  constructor(trivyWrapper: TrivyWrapper) {
    this.trivyWrapper = trivyWrapper;
  }

  private setMcpServer(server: Server | undefined) {
    this.mcpServer = server;
  }

  private getMcpServer() {
    return this.mcpServer;
  }

  private setHttpServer(server: HttpServer | undefined) {
    this.httpServer = server;
  }

  private getHttpServer() {
    return this.httpServer;
  }

  async restartServerWithConfig() {
    // Stop existing server if running
    if (this.mcpServer) {
      this.mcpServer.close();
      this.setMcpServer(undefined);
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.setHttpServer(undefined);
    }

    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      console.log('No workspace folder found');
      return;
    }
  }

  async startMcpServer(): Promise<{
    mcpServer: Server;
    httpServer: HttpServer;
    port: number;
  }> {
    // check port is available
    const server = this.httpServer;
    if (server) {
      const address = server.address();
      if (address && typeof address === 'object' && 'port' in address) {
        const currentPort = address.port;
        if (currentPort === port) {
          throw new Error(`Port ${port} is already in use`);
        }
      }
    }

    this.mcpServer = new Server(
      {
        name: 'Trivy MCP Server',
        version: '1.0.0',
        description: 'Model Context Protocol server for Trivy',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: mcpTools,
    }));

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        const results = await runTool(name, args, this.trivyWrapper);
        return { content: [{ type: 'text', text: results }] };
      } catch (error) {
        console.error('Error in CallToolRequestHandler:', error);
        throw error;
      }
    });

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Track active transports by session ID
    const transports: { [sessionId: string]: SSEServerTransport } = {};

    // Create project-specific SSE endpoint
    app.get(`/sse`, async (req: Request, res: Response) => {
      console.log(`New SSE connection attempt for Trivy`);

      req.socket.setTimeout(0);
      req.socket.setNoDelay(true);
      req.socket.setKeepAlive(true);

      try {
        // Create transport with project-specific message endpoint path
        const transport = new SSEServerTransport(`/message`, res);
        const sessionId = transport.sessionId;
        transports[sessionId] = transport;

        const keepAliveInterval = setInterval(() => {
          if (res.writable) {
            res.write(': keepalive\n\n');
          }
        }, 30000);

        if (this.mcpServer) {
          await this.mcpServer.connect(transport);
          console.log(
            `Server connected to SSE transport with session ID: ${sessionId} for Trivy`
          );

          req.on('close', () => {
            console.log(`SSE connection closed for session ${sessionId}`);
            clearInterval(keepAliveInterval);
            delete transports[sessionId];
            transport.close().catch((err) => {
              console.error('Error closing transport:', err);
            });
          });
        } else {
          console.error('MCP Server not initialized');
          res.status(500).end();
          return;
        }
      } catch (error) {
        console.error('Error in SSE connection:', error);
        res.status(500).end();
      }
    });

    // Create project-specific message endpoint
    app.post(`/message`, async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      console.log(
        `Received message for session ${sessionId} for Trivy:`,
        req.body?.method
      );

      const transport = transports[sessionId];
      if (!transport) {
        console.error(`No transport found for session ${sessionId}`);
        res.status(400).json({
          jsonrpc: '2.0',
          id: req.body?.id,
          error: {
            code: -32000,
            message: 'No active session found',
          },
        });
        return;
      }

      try {
        await transport.handlePostMessage(req, res, req.body);
        console.log('Message handled successfully');
      } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id,
          error: {
            code: -32000,
            message: String(error),
          },
        });
      }
    });

    // Add project-specific health check endpoint
    app.get(`/health`, (req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
      });
    });

    try {
      this.httpServer = app.listen(port);
      vscode.window.showInformationMessage(`Trivy MCP successfully started`);
      console.log(`MCP Server for Trivy listening on http://localhost:${port}`);
      return {
        mcpServer: this.mcpServer!,
        httpServer: this.httpServer!,
        port: port,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        `Failed to start server on configured port ${port}.  Error: ${errorMsg}`
      );
      throw new Error(
        `Failed to start server on configured port ${port}. Error: ${errorMsg}`
      );
    }
  }
}

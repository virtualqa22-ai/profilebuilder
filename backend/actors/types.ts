// backend/actors/types.ts
// Centralized types for actor system

/**
 * Base message interface for inter-agent communication
 * Implements MCP (Model Context Protocol) for secure agent interoperability
 */
export interface Message {
  id: string; // Unique message ID
  type: string; // Message type (e.g., 'task', 'response', 'error')
  from: string; // Sender actor ID
  to: string; // Receiver actor ID
  payload: any; // Message data
  timestamp: number; // Unix timestamp
  signature?: string; // Optional signature for security
  correlationId?: string; // For tracing requests
}

/**
 * Task message for delegating work
 */
export interface TaskMessage extends Message {
  type: 'task';
  taskType: 'ai-rewrite' | 'pdf-generation' | 'resume-build';
  data: any;
}

/**
 * Response message
 */
export interface ResponseMessage extends Message {
  type: 'response';
  result: any;
  error?: string;
}

/**
 * Error message
 */
export interface ErrorMessage extends Message {
  type: 'error';
  error: string;
  code: string;
}

/**
 * Actor interface
 */
export interface IActor {
  id: string;
  receive(message: Message): Promise<void>;
  send(message: Message): void;
  start(): void;
  stop(): void;
}

/**
 * Supervisor strategy for handling worker failures
 */
export type SupervisorStrategy = 'restart' | 'escalate' | 'ignore';

/**
 * Circuit breaker state
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Actor system configuration
 */
export interface ActorSystemConfig {
  maxRetries: number;
  timeoutMs: number;
  circuitBreakerThreshold: number;
  supervisorStrategy: SupervisorStrategy;
}
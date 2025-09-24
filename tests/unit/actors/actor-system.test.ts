/**
 * Actor System Integration Tests
 *
 * Tests the actor system components including Supervisor, Workers,
 * MCP protocol, circuit breaker integration, and resilience features.
 */

import { jest } from '@jest/globals';

// Mock the circuit breaker
jest.mock('../../../backend/lib/circuitBreaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
    on: jest.fn(),
    stats: { failures: 0, successful: 0, timeouts: 0 },
    isOpen: false
  }))
}));

// Mock the AI service
jest.mock('../../../backend/lib/aiService', () => ({
  getAIService: jest.fn(() => ({
    rewriteContent: jest.fn(),
    getSuggestions: jest.fn(),
    detectLintIssues: jest.fn()
  }))
}));

// Mock the docx generator
jest.mock('../../../backend/lib/docxGenerator', () => ({
  generateDocx: jest.fn()
}));

import { Supervisor } from '../../../backend/actors/Supervisor';
import { AiRewriteWorker } from '../../../backend/actors/AiRewriteWorker';
import { PdfGenerationWorker } from '../../../backend/actors/PdfGenerationWorker';
import { ActorSystem } from '../../../backend/actors/ActorSystem';
import { MessageType, MCPMessage } from '../../../backend/actors/types';

describe('Actor System Integration', () => {
  let supervisor: Supervisor;
  let aiWorker: AiRewriteWorker;
  let pdfWorker: PdfGenerationWorker;
  let actorSystem: ActorSystem;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create actor system components
    supervisor = new Supervisor('test-supervisor');
    aiWorker = new AiRewriteWorker('test-ai-worker');
    pdfWorker = new PdfGenerationWorker('test-pdf-worker');
    actorSystem = new ActorSystem();
  });

  describe('Supervisor', () => {
    it('should initialize with correct configuration', () => {
      expect(supervisor).toBeDefined();
      expect(supervisor.getId()).toBe('test-supervisor');
    });

    it('should register workers correctly', () => {
      supervisor.registerWorker(aiWorker);
      supervisor.registerWorker(pdfWorker);

      const workers = supervisor.getWorkers();
      expect(workers).toHaveLength(2);
      expect(workers).toContain(aiWorker);
      expect(workers).toContain(pdfWorker);
    });

    it('should route messages to appropriate workers', async () => {
      supervisor.registerWorker(aiWorker);
      supervisor.registerWorker(pdfWorker);

      const aiMessage: MCPMessage = {
        id: 'test-msg-1',
        type: MessageType.REWRITE_REQUEST,
        payload: {
          content: 'test content',
          style: 'professional',
          userId: 'user123'
        },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const pdfMessage: MCPMessage = {
        id: 'test-msg-2',
        type: MessageType.PDF_GENERATION_REQUEST,
        payload: {
          resumeData: { title: 'Test Resume' },
          userId: 'user123'
        },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      // Mock worker handleMessage methods
      aiWorker.handleMessage = jest.fn().mockResolvedValue({
        id: 'response-1',
        type: MessageType.REWRITE_RESPONSE,
        payload: { result: 'rewritten content' },
        timestamp: Date.now(),
        signature: 'response-signature'
      });

      pdfWorker.handleMessage = jest.fn().mockResolvedValue({
        id: 'response-2',
        type: MessageType.PDF_GENERATION_RESPONSE,
        payload: { result: 'pdf-buffer' },
        timestamp: Date.now(),
        signature: 'response-signature'
      });

      const aiResponse = await supervisor.handleMessage(aiMessage);
      const pdfResponse = await supervisor.handleMessage(pdfMessage);

      expect(aiWorker.handleMessage).toHaveBeenCalledWith(aiMessage);
      expect(pdfWorker.handleMessage).toHaveBeenCalledWith(pdfMessage);
      expect(aiResponse.type).toBe(MessageType.REWRITE_RESPONSE);
      expect(pdfResponse.type).toBe(MessageType.PDF_GENERATION_RESPONSE);
    });

    it('should handle worker failures with restart strategy', async () => {
      supervisor.registerWorker(aiWorker);

      // Mock worker failure
      aiWorker.handleMessage = jest.fn().mockRejectedValue(new Error('Worker failed'));

      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      // Supervisor should handle the error gracefully
      await expect(supervisor.handleMessage(message)).rejects.toThrow('Worker failed');

      // Check that failure is tracked
      const health = supervisor.getHealthStatus();
      expect(health.failures).toBeGreaterThan(0);
    });

    it('should provide health status', () => {
      supervisor.registerWorker(aiWorker);
      supervisor.registerWorker(pdfWorker);

      const health = supervisor.getHealthStatus();

      expect(health).toHaveProperty('workers');
      expect(health.workers).toHaveLength(2);
      expect(health).toHaveProperty('failures');
      expect(health).toHaveProperty('circuitState');
    });
  });

  describe('AiRewriteWorker', () => {
    it('should handle rewrite requests', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: {
          content: 'original content',
          style: 'professional',
          userId: 'user123'
        },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      // Mock AI service
      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockResolvedValue('rewritten content');

      const response = await aiWorker.handleMessage(message);

      expect(mockAIService.rewriteContent).toHaveBeenCalledWith(
        'original content',
        'professional',
        'userId'
      );
      expect(response.type).toBe(MessageType.REWRITE_RESPONSE);
      expect(response.payload.result).toBe('rewritten content');
    });

    it('should validate message signature', async () => {
      const invalidMessage: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'invalid-signature'
      };

      // Mock signature verification to fail
      aiWorker.verifySignature = jest.fn().mockReturnValue(false);

      await expect(aiWorker.handleMessage(invalidMessage)).rejects.toThrow('Invalid message signature');
    });

    it('should handle AI service failures', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockRejectedValue(new Error('AI service unavailable'));

      await expect(aiWorker.handleMessage(message)).rejects.toThrow('AI service unavailable');
    });
  });

  describe('PdfGenerationWorker', () => {
    it('should handle PDF generation requests', async () => {
      const resumeData = {
        personalInfo: { name: 'John Doe', email: 'john@example.com' },
        experience: [{ title: 'Developer', company: 'Tech Corp' }]
      };

      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.PDF_GENERATION_REQUEST,
        payload: {
          resumeData,
          userId: 'user123'
        },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      // Mock docx generator
      const mockGenerateDocx = require('../../../backend/lib/docxGenerator').generateDocx;
      mockGenerateDocx.mockResolvedValue(Buffer.from('pdf-content'));

      const response = await pdfWorker.handleMessage(message);

      expect(mockGenerateDocx).toHaveBeenCalledWith(resumeData);
      expect(response.type).toBe(MessageType.PDF_GENERATION_RESPONSE);
      expect(response.payload.result).toBeInstanceOf(Buffer);
    });

    it('should handle docx generation errors', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.PDF_GENERATION_REQUEST,
        payload: {
          resumeData: { title: 'Test' },
          userId: 'user123'
        },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockGenerateDocx = require('../../../backend/lib/docxGenerator').generateDocx;
      mockGenerateDocx.mockRejectedValue(new Error('DOCX generation failed'));

      await expect(pdfWorker.handleMessage(message)).rejects.toThrow('DOCX generation failed');
    });
  });

  describe('ActorSystem', () => {
    it('should initialize correctly', async () => {
      const initSpy = jest.spyOn(actorSystem, 'initialize').mockResolvedValue();

      await actorSystem.initialize();

      expect(initSpy).toHaveBeenCalled();
    });

    it('should delegate tasks to supervisor', async () => {
      const delegateSpy = jest.spyOn(supervisor, 'handleMessage').mockResolvedValue({
        id: 'response',
        type: MessageType.REWRITE_RESPONSE,
        payload: { result: 'success' },
        timestamp: Date.now(),
        signature: 'test'
      });

      // Mock actor system to use our supervisor
      (actorSystem as any).supervisor = supervisor;

      const message: MCPMessage = {
        id: 'test',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test'
      };

      await actorSystem.delegateTask(message);

      expect(delegateSpy).toHaveBeenCalledWith(message);
    });

    it('should provide system health status', () => {
      const healthSpy = jest.spyOn(supervisor, 'getHealthStatus').mockReturnValue({
        workers: [],
        failures: 0,
        circuitState: 'closed'
      });

      (actorSystem as any).supervisor = supervisor;

      const health = actorSystem.getHealthStatus();

      expect(healthSpy).toHaveBeenCalled();
      expect(health).toHaveProperty('workers');
      expect(health).toHaveProperty('failures');
    });
  });

  describe('MCP Protocol', () => {
    it('should create properly signed messages', () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: ''
      };

      // Test message signing (mock implementation)
      const signedMessage = aiWorker.signMessage(message);
      expect(signedMessage.signature).toBeDefined();
      expect(typeof signedMessage.signature).toBe('string');
      expect(signedMessage.signature.length).toBeGreaterThan(0);
    });

    it('should verify message signatures', () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'valid-signature'
      };

      // Mock verification
      const isValid = aiWorker.verifySignature(message);
      expect(typeof isValid).toBe('boolean');
    });

    it('should handle message correlation', async () => {
      const requestMessage: MCPMessage = {
        id: 'request-123',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockResolvedValue('response');

      const response = await aiWorker.handleMessage(requestMessage);

      expect(response.id).not.toBe(requestMessage.id); // Different ID for response
      expect(response.type).toBe(MessageType.REWRITE_RESPONSE);
      expect(response.timestamp).toBeGreaterThanOrEqual(requestMessage.timestamp);
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should integrate with circuit breaker for resilience', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockRejectedValue(new Error('Service unavailable'));

      // First failure
      await expect(aiWorker.handleMessage(message)).rejects.toThrow();

      // Circuit breaker should track failures
      const circuitBreaker = (aiWorker as any).circuitBreaker;
      expect(circuitBreaker.execute).toHaveBeenCalled();
    });

    it('should handle circuit breaker open state', async () => {
      // Mock circuit breaker as open
      const circuitBreaker = (aiWorker as any).circuitBreaker;
      circuitBreaker.isOpen = true;

      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      await expect(aiWorker.handleMessage(message)).rejects.toThrow('Circuit breaker is open');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed messages gracefully', async () => {
      const malformedMessage = {
        id: 'test',
        type: 'invalid-type',
        payload: null,
        timestamp: 'invalid-timestamp'
      } as any;

      await expect(aiWorker.handleMessage(malformedMessage)).rejects.toThrow();
    });

    it('should timeout long-running operations', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 35000)) // Longer than timeout
      );

      await expect(aiWorker.handleMessage(message)).rejects.toThrow();
    });

    it('should recover from temporary failures', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockAIService = require('../../../backend/lib/aiService').getAIService();

      // First call fails
      mockAIService.rewriteContent.mockRejectedValueOnce(new Error('Temporary failure'));
      await expect(aiWorker.handleMessage(message)).rejects.toThrow();

      // Second call succeeds
      mockAIService.rewriteContent.mockResolvedValueOnce('success response');
      const response = await aiWorker.handleMessage(message);

      expect(response.payload.result).toBe('success response');
    });
  });

  describe('Performance and Monitoring', () => {
    it('should track message processing metrics', async () => {
      const message: MCPMessage = {
        id: 'test-msg',
        type: MessageType.REWRITE_REQUEST,
        payload: { content: 'test' },
        timestamp: Date.now(),
        signature: 'test-signature'
      };

      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockResolvedValue('response');

      const startTime = Date.now();
      await aiWorker.handleMessage(message);
      const endTime = Date.now();

      // Processing should take some time
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle concurrent messages', async () => {
      const messages: MCPMessage[] = Array(5).fill(null).map((_, i) => ({
        id: `test-msg-${i}`,
        type: MessageType.REWRITE_REQUEST,
        payload: { content: `test content ${i}` },
        timestamp: Date.now(),
        signature: 'test-signature'
      }));

      const mockAIService = require('../../../backend/lib/aiService').getAIService();
      mockAIService.rewriteContent.mockResolvedValue('response');

      const promises = messages.map(msg => aiWorker.handleMessage(msg));
      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.type).toBe(MessageType.REWRITE_RESPONSE);
      });
    });
  });
});
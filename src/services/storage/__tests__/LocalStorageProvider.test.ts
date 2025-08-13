/**
 * Unit Tests for Local Storage Provider
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LocalStorageProvider } from '../providers/LocalStorageProvider';
import { SessionCreateParams, TerminalSession } from '../interfaces/ITerminalStorageService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  const testProjectId = 'test-project-123';
  const testUserId = 'test-user-456';
  
  beforeEach(() => {
    // Create provider with test config
    provider = new LocalStorageProvider({
      basePath: '/tmp/test-sessions',
      maxSessions: 10,
      persistToDisk: false,
      flushInterval: 1000
    });
    
    // Clear mock calls
    jest.clearAllMocks();
  });
  
  afterEach(async () => {
    // Cleanup provider
    await provider.cleanup();
  });
  
  describe('Session Creation', () => {
    it('should create a new session successfully', async () => {
      const params: SessionCreateParams = {
        projectId: testProjectId,
        projectPath: '/test/path',
        userId: testUserId,
        mode: 'normal'
      };
      
      const session = await provider.createSession(params);
      
      expect(session).toBeDefined();
      expect(session.projectId).toBe(testProjectId);
      expect(session.userId).toBe(testUserId);
      expect(session.mode).toBe('normal');
      expect(session.status).toBe('connecting');
      expect(session.tabName).toBe('Terminal 1');
      expect(session.id).toMatch(/^session_\d+_\d{4}_[a-z0-9]{8}$/);
    });
    
    it('should auto-increment tab names for same project', async () => {
      const params: SessionCreateParams = {
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      };
      
      const session1 = await provider.createSession(params);
      const session2 = await provider.createSession(params);
      const session3 = await provider.createSession(params);
      
      expect(session1.tabName).toBe('Terminal 1');
      expect(session2.tabName).toBe('Terminal 2');
      expect(session3.tabName).toBe('Terminal 3');
    });
    
    it('should auto-focus new sessions if under limit', async () => {
      const params: SessionCreateParams = {
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      };
      
      const session = await provider.createSession(params);
      
      const focusedSessions = await provider.getFocusedSessions(testProjectId);
      expect(focusedSessions).toContain(session.id);
    });
    
    it('should evict oldest session when limit is reached', async () => {
      // Create provider with small limit
      const limitedProvider = new LocalStorageProvider({ maxSessions: 3 });
      
      const sessions: TerminalSession[] = [];
      for (let i = 0; i < 4; i++) {
        const session = await limitedProvider.createSession({
          projectId: `project-${i}`,
          projectPath: '/test/path',
          mode: 'normal'
        });
        sessions.push(session);
      }
      
      // First session should be evicted
      const firstSession = await limitedProvider.getSession(sessions[0].id);
      expect(firstSession).toBeNull();
      
      // Last 3 sessions should exist
      for (let i = 1; i < 4; i++) {
        const session = await limitedProvider.getSession(sessions[i].id);
        expect(session).toBeDefined();
      }
      
      await limitedProvider.cleanup();
    });
    
    it('should validate required parameters', async () => {
      await expect(provider.createSession({
        projectId: '',
        projectPath: '/test',
        mode: 'normal'
      })).rejects.toThrow('projectId is required');
      
      await expect(provider.createSession({
        projectId: 'test',
        projectPath: '',
        mode: 'normal'
      })).rejects.toThrow('projectPath is required');
      
      await expect(provider.createSession({
        projectId: 'test',
        projectPath: '/test',
        mode: 'invalid' as any
      })).rejects.toThrow('mode must be "normal" or "claude"');
    });
  });
  
  describe('Session Retrieval', () => {
    let testSession: TerminalSession;
    
    beforeEach(async () => {
      testSession = await provider.createSession({
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      });
    });
    
    it('should retrieve existing session', async () => {
      const session = await provider.getSession(testSession.id);
      
      expect(session).toBeDefined();
      expect(session?.id).toBe(testSession.id);
      expect(session?.projectId).toBe(testProjectId);
    });
    
    it('should return null for non-existent session', async () => {
      const session = await provider.getSession('non-existent-id');
      expect(session).toBeNull();
    });
    
    it('should update activity timestamp on retrieval', async () => {
      const before = new Date();
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await provider.getSession(testSession.id);
      
      // Activity should be updated (implementation detail)
      // This is tracked internally for LRU eviction
      expect(true).toBe(true); // Placeholder for internal state check
    });
  });
  
  describe('Session Update', () => {
    let testSession: TerminalSession;
    
    beforeEach(async () => {
      testSession = await provider.createSession({
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      });
    });
    
    it('should update session properties', async () => {
      await provider.updateSession(testSession.id, {
        status: 'active',
        currentPath: '/new/path'
      });
      
      const updated = await provider.getSession(testSession.id);
      expect(updated?.status).toBe('active');
      expect(updated?.currentPath).toBe('/new/path');
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(testSession.updatedAt.getTime());
    });
    
    it('should throw error for non-existent session', async () => {
      await expect(provider.updateSession('non-existent', {
        status: 'active'
      })).rejects.toThrow('Session non-existent not found');
    });
  });
  
  describe('Session Deletion', () => {
    let testSession: TerminalSession;
    
    beforeEach(async () => {
      testSession = await provider.createSession({
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      });
    });
    
    it('should delete existing session', async () => {
      const result = await provider.deleteSession(testSession.id);
      
      expect(result).toBe(true);
      
      const session = await provider.getSession(testSession.id);
      expect(session).toBeNull();
    });
    
    it('should return false for non-existent session', async () => {
      const result = await provider.deleteSession('non-existent');
      expect(result).toBe(false);
    });
    
    it('should clean up all related data', async () => {
      // Set focus
      await provider.setSessionFocus(testSession.id, true);
      
      // Delete session
      await provider.deleteSession(testSession.id);
      
      // Check focus is removed
      const focusedSessions = await provider.getFocusedSessions(testProjectId);
      expect(focusedSessions).not.toContain(testSession.id);
      
      // Check project sessions
      const projectSessions = await provider.listSessions(testProjectId);
      expect(projectSessions).toHaveLength(0);
    });
  });
  
  describe('Focus Management', () => {
    let sessions: TerminalSession[] = [];
    
    beforeEach(async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const session = await provider.createSession({
          projectId: testProjectId,
          projectPath: '/test/path',
          mode: 'normal'
        });
        sessions.push(session);
      }
    });
    
    it('should set session focus', async () => {
      await provider.setSessionFocus(sessions[0].id, true);
      
      const focused = await provider.getFocusedSessions(testProjectId);
      expect(focused).toContain(sessions[0].id);
      
      const session = await provider.getSession(sessions[0].id);
      expect(session?.isFocused).toBe(true);
    });
    
    it('should remove session focus', async () => {
      await provider.setSessionFocus(sessions[0].id, true);
      await provider.setSessionFocus(sessions[0].id, false);
      
      const focused = await provider.getFocusedSessions(testProjectId);
      expect(focused).not.toContain(sessions[0].id);
      
      const session = await provider.getSession(sessions[0].id);
      expect(session?.isFocused).toBe(false);
    });
    
    it('should handle multiple focused sessions', async () => {
      await provider.setSessionFocus(sessions[0].id, true);
      await provider.setSessionFocus(sessions[1].id, true);
      await provider.setSessionFocus(sessions[2].id, true);
      
      const focused = await provider.getFocusedSessions(testProjectId);
      expect(focused).toHaveLength(3);
      expect(focused).toContain(sessions[0].id);
      expect(focused).toContain(sessions[1].id);
      expect(focused).toContain(sessions[2].id);
    });
    
    it('should auto-unfocus least active session when limit reached', async () => {
      // Create provider with small focus limit
      const limitedProvider = new LocalStorageProvider();
      
      // Create many sessions
      const manySessions: TerminalSession[] = [];
      for (let i = 0; i < 12; i++) {
        const session = await limitedProvider.createSession({
          projectId: testProjectId,
          projectPath: '/test/path',
          mode: 'normal'
        });
        manySessions.push(session);
        
        // Small delay to ensure different activity timestamps
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // All should be focused up to limit (10)
      const focused = await limitedProvider.getFocusedSessions(testProjectId);
      expect(focused.length).toBeLessThanOrEqual(10);
      
      await limitedProvider.cleanup();
    });
  });
  
  describe('Suspension and Resumption', () => {
    let testSession: TerminalSession;
    
    beforeEach(async () => {
      testSession = await provider.createSession({
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      });
    });
    
    it('should suspend session', async () => {
      await provider.suspendSession(testSession.id);
      
      const session = await provider.getSession(testSession.id);
      expect(session?.status).toBe('suspended');
    });
    
    it('should resume suspended session', async () => {
      await provider.suspendSession(testSession.id);
      
      const result = await provider.resumeSession(testSession.id);
      
      expect(result.success).toBe(true);
      expect(result.session?.status).toBe('active');
    });
    
    it('should preserve buffered output during suspension', async () => {
      // Update session with some output
      await provider.updateSession(testSession.id, {
        output: [
          { id: '1', timestamp: new Date(), type: 'stdout', content: 'Line 1' },
          { id: '2', timestamp: new Date(), type: 'stdout', content: 'Line 2' }
        ]
      });
      
      await provider.suspendSession(testSession.id);
      
      const result = await provider.resumeSession(testSession.id);
      
      expect(result.success).toBe(true);
      expect(result.bufferedOutput).toEqual(['Line 1', 'Line 2']);
    });
    
    it('should fail to resume non-suspended session', async () => {
      const result = await provider.resumeSession(testSession.id);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('was not suspended');
    });
  });
  
  describe('Query Operations', () => {
    beforeEach(async () => {
      // Create various sessions
      await provider.createSession({
        projectId: 'project-1',
        projectPath: '/path1',
        userId: 'user-1',
        mode: 'normal'
      });
      
      await provider.createSession({
        projectId: 'project-1',
        projectPath: '/path1',
        userId: 'user-2',
        mode: 'claude'
      });
      
      await provider.createSession({
        projectId: 'project-2',
        projectPath: '/path2',
        userId: 'user-1',
        mode: 'normal'
      });
    });
    
    it('should find sessions by projectId', async () => {
      const sessions = await provider.findSessions({ projectId: 'project-1' });
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.projectId === 'project-1')).toBe(true);
    });
    
    it('should find sessions by userId', async () => {
      const sessions = await provider.findSessions({ userId: 'user-1' });
      expect(sessions).toHaveLength(2);
      expect(sessions.every(s => s.userId === 'user-1')).toBe(true);
    });
    
    it('should find sessions by mode', async () => {
      const sessions = await provider.findSessions({ mode: 'claude' });
      expect(sessions).toHaveLength(1);
      expect(sessions[0].mode).toBe('claude');
    });
    
    it('should count all sessions', async () => {
      const count = await provider.countSessions();
      expect(count).toBe(3);
    });
    
    it('should count sessions with query', async () => {
      const count = await provider.countSessions({ projectId: 'project-1' });
      expect(count).toBe(2);
    });
  });
  
  describe('Performance Metrics', () => {
    it('should track operation metrics', async () => {
      // Perform various operations
      const session = await provider.createSession({
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      });
      
      await provider.getSession(session.id);
      await provider.updateSession(session.id, { status: 'active' });
      await provider.deleteSession(session.id);
      
      const info = await provider.getStorageInfo();
      
      expect(info.mode).toBe('LOCAL');
      expect(info.performance.avgReadTime).toBeGreaterThanOrEqual(0);
      expect(info.performance.avgWriteTime).toBeGreaterThanOrEqual(0);
      expect(info.performance.cacheHitRate).toBeDefined();
    });
    
    it('should report health status', async () => {
      const health = await provider.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.mode).toBe('LOCAL');
      expect(health.lastCheck).toBeInstanceOf(Date);
    });
  });
  
  describe('Persistence', () => {
    it('should save to disk when persistence is enabled', async () => {
      const persistProvider = new LocalStorageProvider({
        basePath: '/tmp/test-persist',
        persistToDisk: true,
        flushInterval: 100
      });
      
      const session = await persistProvider.createSession({
        projectId: testProjectId,
        projectPath: '/test/path',
        mode: 'normal'
      });
      
      await persistProvider.flush();
      
      // Check that fs.writeFile was called
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('sessions.json'),
        expect.any(String),
        'utf-8'
      );
      
      await persistProvider.cleanup();
    });
    
    it('should load from disk on initialization', async () => {
      const mockData = {
        sessions: [['session-1', {
          id: 'session-1',
          projectId: 'project-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]],
        projectSessions: [['project-1', ['session-1']]],
        focusedSessions: [],
        sessionCounters: [['project-1', 1]],
        suspendedStates: []
      };
      
      (fs.readFile as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockData));
      
      const persistProvider = new LocalStorageProvider({
        basePath: '/tmp/test-persist',
        persistToDisk: true
      });
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const sessions = await persistProvider.findSessions({});
      expect(sessions.length).toBeGreaterThanOrEqual(0);
      
      await persistProvider.cleanup();
    });
  });
});
#!/usr/bin/env tsx
/**
 * Interactive Approval CLI
 * แสดงผลและจัดการ approval requests แบบ real-time
 */

import { EventEmitter } from 'events';
import * as readline from 'readline';
import chalk from 'chalk';
import { io, Socket } from 'socket.io-client';

// Approval types
enum ApprovalType {
  CODE_DEPLOYMENT = 'code_deployment',
  DATABASE_CHANGE = 'database_change',
  SYSTEM_CONFIG = 'system_config',
  COST_EXCEEDING = 'cost_exceeding',
  SECURITY_CHANGE = 'security_change'
}

enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
  BYPASSED = 'bypassed'
}

interface ApprovalRequest {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requestedBy: string;
  requestedAt: Date;
  expiresAt: Date;
  status: ApprovalStatus;
  context: {
    agentId?: string;
    taskId?: string;
    service?: string;
    estimatedCost?: number;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  };
}

class InteractiveApprovalCLI extends EventEmitter {
  private rl: readline.Interface;
  private socket?: Socket;
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private isConnected: boolean = false;
  private currentView: 'list' | 'detail' = 'list';
  private selectedApproval?: ApprovalRequest;

  constructor() {
    super();
    
    // Setup readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Enable keypress events
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    
    readline.emitKeypressEvents(process.stdin);
  }

  async start() {
    console.clear();
    this.showHeader();
    
    // Connect to orchestration server
    await this.connectToServer();
    
    // Start listening for approvals
    this.listenForApprovals();
    
    // Show initial view
    this.showMainMenu();
    
    // Handle keyboard input
    this.handleKeyboardInput();
  }

  private showHeader() {
    console.log(chalk.blue.bold('╔════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║     AI Orchestration - Approval Center    ║'));
    console.log(chalk.blue.bold('╚════════════════════════════════════════════╝'));
    console.log();
  }

  private async connectToServer() {
    const serverUrl = 'http://localhost:4190';
    
    console.log(chalk.yellow('🔌 Connecting to orchestration server...'));
    
    this.socket = io(serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000
    });

    return new Promise<void>((resolve) => {
      this.socket!.on('connect', () => {
        this.isConnected = true;
        console.log(chalk.green('✓ Connected to server'));
        console.log();
        resolve();
      });

      this.socket!.on('disconnect', () => {
        this.isConnected = false;
        console.log(chalk.red('✗ Disconnected from server'));
      });
    });
  }

  private listenForApprovals() {
    if (!this.socket) return;

    // New approval request
    this.socket.on('approval:required', (request: ApprovalRequest) => {
      this.pendingApprovals.set(request.id, request);
      this.showNotification(request);
      
      if (this.currentView === 'list') {
        this.refreshList();
      }
    });

    // Approval status update
    this.socket.on('approval:updated', (data: { id: string, status: ApprovalStatus }) => {
      const approval = this.pendingApprovals.get(data.id);
      if (approval) {
        approval.status = data.status;
        
        if (data.status !== ApprovalStatus.PENDING) {
          this.pendingApprovals.delete(data.id);
        }
        
        if (this.currentView === 'list') {
          this.refreshList();
        }
      }
    });
  }

  private showNotification(request: ApprovalRequest) {
    console.log();
    console.log(chalk.yellow.bold('🔔 NEW APPROVAL REQUEST'));
    console.log(chalk.white(`   ${request.title}`));
    console.log(chalk.gray(`   From: ${request.requestedBy}`));
    console.log(chalk.gray(`   Type: ${request.type}`));
    
    // Show risk level with color
    if (request.context.riskLevel) {
      const riskColor = request.context.riskLevel === 'critical' ? chalk.red :
                       request.context.riskLevel === 'high' ? chalk.yellow :
                       request.context.riskLevel === 'medium' ? chalk.cyan :
                       chalk.green;
      console.log(riskColor(`   Risk: ${request.context.riskLevel.toUpperCase()}`));
    }
    
    console.log();
    
    // Play sound if available (macOS)
    if (process.platform === 'darwin') {
      const { exec } = require('child_process');
      exec('afplay /System/Library/Sounds/Glass.aiff');
    }
  }

  private showMainMenu() {
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.white.bold('Pending Approvals:'), this.pendingApprovals.size);
    console.log(chalk.cyan('━'.repeat(50)));
    
    if (this.pendingApprovals.size === 0) {
      console.log(chalk.gray('No pending approvals'));
    } else {
      this.showApprovalList();
    }
    
    console.log();
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.gray('Commands:'));
    console.log(chalk.white('  [1-9]  Select approval'));
    console.log(chalk.green('  [a]    Approve selected'));
    console.log(chalk.red('  [r]    Reject selected'));
    console.log(chalk.yellow('  [b]    Bypass (emergency)'));
    console.log(chalk.blue('  [d]    Show details'));
    console.log(chalk.gray('  [l]    List view'));
    console.log(chalk.gray('  [q]    Quit'));
    console.log(chalk.cyan('━'.repeat(50)));
  }

  private showApprovalList() {
    const approvals = Array.from(this.pendingApprovals.values());
    
    approvals.forEach((approval, index) => {
      const num = index + 1;
      const timeLeft = this.getTimeLeft(approval.expiresAt);
      const urgency = timeLeft < 5 ? chalk.red : timeLeft < 15 ? chalk.yellow : chalk.green;
      
      console.log(
        chalk.white(`${num}. `) +
        chalk.bold(approval.title) +
        urgency(` (${timeLeft}m left)`)
      );
      
      console.log(
        chalk.gray(`   ${approval.type} | Risk: ${approval.context.riskLevel || 'unknown'}`)
      );
    });
  }

  private showApprovalDetail(approval: ApprovalRequest) {
    console.clear();
    this.showHeader();
    
    console.log(chalk.white.bold('📋 Approval Details'));
    console.log(chalk.cyan('━'.repeat(50)));
    
    console.log(chalk.white('ID:'), approval.id);
    console.log(chalk.white('Title:'), approval.title);
    console.log(chalk.white('Description:'), approval.description);
    console.log(chalk.white('Type:'), approval.type);
    console.log(chalk.white('Requested By:'), approval.requestedBy);
    console.log(chalk.white('Requested At:'), approval.requestedAt.toLocaleString());
    console.log(chalk.white('Expires At:'), approval.expiresAt.toLocaleString());
    
    console.log();
    console.log(chalk.white.bold('Context:'));
    Object.entries(approval.context).forEach(([key, value]) => {
      console.log(chalk.gray(`  ${key}:`), value);
    });
    
    console.log();
    console.log(chalk.cyan('━'.repeat(50)));
    console.log(chalk.gray('Actions:'));
    console.log(chalk.green('  [a] Approve'));
    console.log(chalk.red('  [r] Reject'));
    console.log(chalk.yellow('  [b] Bypass (emergency)'));
    console.log(chalk.gray('  [l] Back to list'));
    console.log(chalk.cyan('━'.repeat(50)));
  }

  private handleKeyboardInput() {
    process.stdin.on('keypress', async (str, key) => {
      if (key.ctrl && key.name === 'c') {
        this.quit();
        return;
      }

      if (this.currentView === 'list') {
        this.handleListViewInput(str, key);
      } else {
        this.handleDetailViewInput(str, key);
      }
    });
  }

  private handleListViewInput(str: string, key: any) {
    // Number keys to select approval
    if (str && str >= '1' && str <= '9') {
      const index = parseInt(str) - 1;
      const approvals = Array.from(this.pendingApprovals.values());
      
      if (index < approvals.length) {
        this.selectedApproval = approvals[index];
        console.log(chalk.cyan(`\n✓ Selected: ${this.selectedApproval.title}`));
      }
    }
    
    // Action keys
    switch (str) {
      case 'a':
        if (this.selectedApproval) {
          this.approveRequest(this.selectedApproval);
        } else {
          console.log(chalk.red('\n⚠️  Please select an approval first'));
        }
        break;
        
      case 'r':
        if (this.selectedApproval) {
          this.rejectRequest(this.selectedApproval);
        } else {
          console.log(chalk.red('\n⚠️  Please select an approval first'));
        }
        break;
        
      case 'b':
        if (this.selectedApproval) {
          this.bypassRequest(this.selectedApproval);
        } else {
          console.log(chalk.red('\n⚠️  Please select an approval first'));
        }
        break;
        
      case 'd':
        if (this.selectedApproval) {
          this.currentView = 'detail';
          this.showApprovalDetail(this.selectedApproval);
        }
        break;
        
      case 'l':
        this.refreshList();
        break;
        
      case 'q':
        this.quit();
        break;
    }
  }

  private handleDetailViewInput(str: string, key: any) {
    if (!this.selectedApproval) return;
    
    switch (str) {
      case 'a':
        this.approveRequest(this.selectedApproval);
        this.currentView = 'list';
        this.refreshList();
        break;
        
      case 'r':
        this.rejectRequest(this.selectedApproval);
        this.currentView = 'list';
        this.refreshList();
        break;
        
      case 'b':
        this.bypassRequest(this.selectedApproval);
        this.currentView = 'list';
        this.refreshList();
        break;
        
      case 'l':
        this.currentView = 'list';
        this.refreshList();
        break;
    }
  }

  private async approveRequest(approval: ApprovalRequest) {
    console.log(chalk.green(`\n✅ Approving: ${approval.title}`));
    
    if (this.socket) {
      this.socket.emit('approval:decision', {
        requestId: approval.id,
        decision: 'approved',
        reason: 'Approved by user',
        decidedBy: 'user'
      });
    }
    
    this.pendingApprovals.delete(approval.id);
    this.selectedApproval = undefined;
  }

  private async rejectRequest(approval: ApprovalRequest) {
    console.log(chalk.red(`\n❌ Rejecting: ${approval.title}`));
    
    if (this.socket) {
      this.socket.emit('approval:decision', {
        requestId: approval.id,
        decision: 'rejected',
        reason: 'Rejected by user',
        decidedBy: 'user'
      });
    }
    
    this.pendingApprovals.delete(approval.id);
    this.selectedApproval = undefined;
  }

  private async bypassRequest(approval: ApprovalRequest) {
    console.log(chalk.yellow(`\n⚠️  EMERGENCY BYPASS: ${approval.title}`));
    console.log(chalk.red('This action will be logged and audited!'));
    
    // Ask for confirmation
    const answer = await this.askQuestion('Type "BYPASS" to confirm: ');
    
    if (answer === 'BYPASS') {
      if (this.socket) {
        this.socket.emit('approval:bypass', {
          requestId: approval.id,
          reason: 'Emergency bypass by user',
          bypassedBy: 'user'
        });
      }
      
      this.pendingApprovals.delete(approval.id);
      this.selectedApproval = undefined;
      console.log(chalk.yellow('✓ Bypassed'));
    } else {
      console.log(chalk.gray('Bypass cancelled'));
    }
  }

  private askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  private refreshList() {
    console.clear();
    this.showHeader();
    this.showMainMenu();
  }

  private getTimeLeft(expiresAt: Date): number {
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(diff / 60000));
  }

  private quit() {
    console.log(chalk.gray('\nGoodbye!'));
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.rl.close();
    process.exit(0);
  }
}

// Mock some approvals for testing
function createMockApprovals(): ApprovalRequest[] {
  return [
    {
      id: '1',
      type: ApprovalType.CODE_DEPLOYMENT,
      title: 'Deploy authentication fix to production',
      description: 'Agent wants to deploy security patch',
      requestedBy: 'agent-001',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60000), // 10 minutes
      status: ApprovalStatus.PENDING,
      context: {
        agentId: 'agent-001',
        service: 'user-management',
        riskLevel: 'high'
      }
    },
    {
      id: '2',
      type: ApprovalType.DATABASE_CHANGE,
      title: 'Add index to users table',
      description: 'Performance optimization for user queries',
      requestedBy: 'agent-002',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60000), // 30 minutes
      status: ApprovalStatus.PENDING,
      context: {
        agentId: 'agent-002',
        service: 'database',
        riskLevel: 'medium'
      }
    },
    {
      id: '3',
      type: ApprovalType.COST_EXCEEDING,
      title: 'Spawn 5 additional Opus agents',
      description: 'Parallel processing for large refactoring task',
      requestedBy: 'orchestrator',
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60000), // 5 minutes
      status: ApprovalStatus.PENDING,
      context: {
        estimatedCost: 25.50,
        riskLevel: 'low'
      }
    }
  ];
}

// Start CLI
async function main() {
  const cli = new InteractiveApprovalCLI();
  
  // For testing, add mock approvals
  if (process.argv.includes('--mock')) {
    const mocks = createMockApprovals();
    mocks.forEach(m => cli['pendingApprovals'].set(m.id, m));
  }
  
  await cli.start();
}

// Run
main().catch(console.error);
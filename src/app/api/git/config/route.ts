import { NextRequest, NextResponse } from 'next/server';
import { GitConfigService } from '@/services/git-config.service';
import { prisma } from '@/core/database/prisma';

// GET /api/git/config - Get Git configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectPath = searchParams.get('path') || process.cwd();
    const projectId = searchParams.get('projectId');
    const useCache = searchParams.get('cache') !== 'false';

    // Check cache if projectId provided
    if (projectId && useCache) {
      const cachedConfig = await prisma.gitConfig.findUnique({
        where: { projectId },
        include: {
          Project: {
            select: {
              name: true,
              path: true
            }
          }
        }
      });

      // Return cached if less than 5 minutes old
      if (cachedConfig) {
        const cacheAge = Date.now() - cachedConfig.syncedAt.getTime();
        if (cacheAge < 5 * 60 * 1000) {
          return NextResponse.json({
            source: 'cache',
            data: {
              repository: {
                path: cachedConfig.projectPath,
                name: cachedConfig.repoName,
                isGitRepo: cachedConfig.isGitRepo,
                isBare: cachedConfig.isBare,
                workingDirectory: cachedConfig.workingDir
              },
              remotes: cachedConfig.remotes,
              branches: cachedConfig.branches,
              user: {
                name: cachedConfig.userName || '',
                email: cachedConfig.userEmail || ''
              },
              status: {
                clean: cachedConfig.isClean,
                ahead: cachedConfig.ahead,
                behind: cachedConfig.behind,
                staged: cachedConfig.staged,
                modified: cachedConfig.modified,
                untracked: cachedConfig.untracked
              },
              config: cachedConfig.config,
              metadata: {
                lastFetch: cachedConfig.lastFetch,
                gitVersion: cachedConfig.gitVersion,
                syncedAt: cachedConfig.syncedAt
              }
            }
          });
        }
      }
    }

    // Get fresh config from Git
    const gitService = new GitConfigService(projectPath);
    const gitConfig = await gitService.getGitConfig();

    // Save to cache if projectId provided
    if (projectId) {
      await prisma.gitConfig.upsert({
        where: { projectId },
        create: {
          projectId,
          projectPath: gitConfig.repository.path,
          repoName: gitConfig.repository.name,
          isGitRepo: gitConfig.repository.isGitRepo,
          isBare: gitConfig.repository.isBare,
          workingDir: gitConfig.repository.workingDirectory,
          currentBranch: gitConfig.branches.current,
          defaultBranch: gitConfig.branches.defaultBranch,
          isClean: gitConfig.status.clean,
          ahead: gitConfig.status.ahead,
          behind: gitConfig.status.behind,
          staged: gitConfig.status.staged,
          modified: gitConfig.status.modified,
          untracked: gitConfig.status.untracked,
          userName: gitConfig.user.name,
          userEmail: gitConfig.user.email,
          remotes: gitConfig.remotes,
          branches: gitConfig.branches.all,
          config: gitConfig.config,
          gitVersion: gitConfig.metadata.gitVersion,
          lastFetch: gitConfig.metadata.lastFetch
        },
        update: {
          projectPath: gitConfig.repository.path,
          repoName: gitConfig.repository.name,
          isGitRepo: gitConfig.repository.isGitRepo,
          isBare: gitConfig.repository.isBare,
          workingDir: gitConfig.repository.workingDirectory,
          currentBranch: gitConfig.branches.current,
          defaultBranch: gitConfig.branches.defaultBranch,
          isClean: gitConfig.status.clean,
          ahead: gitConfig.status.ahead,
          behind: gitConfig.status.behind,
          staged: gitConfig.status.staged,
          modified: gitConfig.status.modified,
          untracked: gitConfig.status.untracked,
          userName: gitConfig.user.name,
          userEmail: gitConfig.user.email,
          remotes: gitConfig.remotes,
          branches: gitConfig.branches.all,
          config: gitConfig.config,
          gitVersion: gitConfig.metadata.gitVersion,
          lastFetch: gitConfig.metadata.lastFetch,
          syncedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      source: 'git',
      data: gitConfig
    });
  } catch (error: any) {
    console.error('Git config error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get Git configuration',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// POST /api/git/config - Execute Git commands
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, projectPath, projectId, userId } = body;

    if (!command) {
      return NextResponse.json(
        { error: 'Command is required' },
        { status: 400 }
      );
    }

    const gitService = new GitConfigService(projectPath || process.cwd());
    
    // Track the change if projectId is provided
    let previousState: any = null;
    if (projectId) {
      const currentConfig = await prisma.gitConfig.findUnique({
        where: { projectId },
        select: {
          id: true,
          currentBranch: true,
          remotes: true
        }
      });
      
      if (currentConfig) {
        previousState = currentConfig;
      }
    }

    // Execute the command
    let result;
    let changeType = 'command';
    let toValue = '';

    // Handle specific commands
    if (command.startsWith('checkout ')) {
      const branch = command.replace('checkout ', '');
      result = await gitService.checkout(branch);
      changeType = 'branch_switch';
      toValue = branch;
    } else if (command === 'fetch' || command.startsWith('fetch ')) {
      const remote = command.replace('fetch ', '') || 'origin';
      result = await gitService.fetch(remote);
      changeType = 'fetch';
      toValue = remote;
    } else if (command === 'pull' || command.startsWith('pull ')) {
      const branch = command.replace('pull ', '') || undefined;
      result = await gitService.pull(branch);
      changeType = 'pull';
      toValue = branch || 'current';
    } else {
      // Execute custom command
      const execResult = await gitService.executeCommand(command);
      result = execResult.success;
      
      // Try to determine change type
      if (command.includes('remote add')) changeType = 'remote_add';
      else if (command.includes('remote remove')) changeType = 'remote_remove';
      else if (command.includes('commit')) changeType = 'commit';
      else if (command.includes('push')) changeType = 'push';
      else if (command.includes('merge')) changeType = 'merge';
      else if (command.includes('rebase')) changeType = 'rebase';
    }

    // Log the change to history
    if (projectId && previousState) {
      await prisma.gitConfigHistory.create({
        data: {
          configId: previousState.id,
          projectId,
          changeType,
          fromValue: previousState.currentBranch || '',
          toValue,
          details: {
            command,
            success: result
          },
          userId: userId || null
        }
      });
    }

    // Get updated config
    const updatedConfig = await gitService.getGitConfig();

    // Update cache
    if (projectId) {
      await prisma.gitConfig.upsert({
        where: { projectId },
        create: {
          projectId,
          projectPath: updatedConfig.repository.path,
          repoName: updatedConfig.repository.name,
          isGitRepo: updatedConfig.repository.isGitRepo,
          isBare: updatedConfig.repository.isBare,
          workingDir: updatedConfig.repository.workingDirectory,
          currentBranch: updatedConfig.branches.current,
          defaultBranch: updatedConfig.branches.defaultBranch,
          isClean: updatedConfig.status.clean,
          ahead: updatedConfig.status.ahead,
          behind: updatedConfig.status.behind,
          staged: updatedConfig.status.staged,
          modified: updatedConfig.status.modified,
          untracked: updatedConfig.status.untracked,
          userName: updatedConfig.user.name,
          userEmail: updatedConfig.user.email,
          remotes: updatedConfig.remotes,
          branches: updatedConfig.branches.all,
          config: updatedConfig.config,
          gitVersion: updatedConfig.metadata.gitVersion,
          lastFetch: updatedConfig.metadata.lastFetch
        },
        update: {
          currentBranch: updatedConfig.branches.current,
          isClean: updatedConfig.status.clean,
          ahead: updatedConfig.status.ahead,
          behind: updatedConfig.status.behind,
          staged: updatedConfig.status.staged,
          modified: updatedConfig.status.modified,
          untracked: updatedConfig.status.untracked,
          remotes: updatedConfig.remotes,
          branches: updatedConfig.branches.all,
          config: updatedConfig.config,
          lastFetch: updatedConfig.metadata.lastFetch,
          syncedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: result,
      command,
      config: updatedConfig
    });
  } catch (error: any) {
    console.error('Git command error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute Git command',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/git/config - Clear cache
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    // Delete cache
    await prisma.gitConfig.delete({
      where: { projectId }
    });

    // Optionally delete history
    const clearHistory = searchParams.get('clearHistory') === 'true';
    if (clearHistory) {
      await prisma.gitConfigHistory.deleteMany({
        where: { projectId }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Git config cache cleared'
    });
  } catch (error: any) {
    console.error('Clear cache error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
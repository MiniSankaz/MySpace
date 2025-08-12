import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGitService } from '@/services/git.service';
import { prisma } from '@/core/database/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { projectId, branchName, force = false } = body;
    
    if (!projectId || !branchName) {
      return NextResponse.json(
        { error: 'Project ID and branch name required' },
        { status: 400 }
      );
    }
    
    // Prevent deletion of protected branches
    const protectedBranches = ['main', 'master', 'develop', 'production'];
    if (protectedBranches.includes(branchName)) {
      return NextResponse.json(
        { error: `Cannot delete protected branch: ${branchName}` },
        { status: 403 }
      );
    }
    
    // Get project from database
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const gitService = getGitService(projectId, project.path, token?.value);
    await gitService.deleteBranch(branchName, force);
    
    return NextResponse.json({ 
      success: true,
      message: `Deleted branch ${branchName}`,
      branch: branchName
    });
  } catch (error) {
    console.error('Failed to delete branch:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete branch' },
      { status: 500 }
    );
  }
}
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
    const { projectId, stashId } = body;
    
    if (!projectId || !stashId) {
      return NextResponse.json(
        { error: 'Project ID and stash ID required' },
        { status: 400 }
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
    await gitService.dropStash(stashId);
    
    return NextResponse.json({ 
      success: true,
      message: `Dropped stash ${stashId}`,
      stashId
    });
  } catch (error) {
    console.error('Failed to drop stash:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to drop stash' },
      { status: 500 }
    );
  }
}
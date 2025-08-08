import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/modules/workspace/services/project.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await projectService.refreshProjectStructure(id);
    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to refresh project structure:', error);
    return NextResponse.json(
      { error: 'Failed to refresh project structure' },
      { status: 500 }
    );
  }
}
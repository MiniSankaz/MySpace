import { Command, AssistantContext, AssistantResponse, Task } from '../types';

export const taskAddCommand: Command = {
  name: 'task.add',
  description: 'Add a new task',
  aliases: ['todo', 't.add'],
  parameters: [
    {
      name: 'title',
      type: 'string',
      required: true,
      description: 'Task title'
    }
  ],
  handler: async (context: AssistantContext, args: Record<string, any>): Promise<AssistantResponse> => {
    const { title } = args;
    
    if (!title) {
      return {
        message: 'Please provide a task title. Example: `task add Buy groceries`',
        suggestions: ['task add Buy groceries', 'task add Call mom']
      };
    }

    const newTask: Task = {
      id: `task-${Date.now()}`,
      title,
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!context.userData) {
      return {
        message: 'Unable to access user data. Please try again.',
        suggestions: ['help', 'task list']
      };
    }

    context.userData.tasks.push(newTask);

    return {
      message: `✅ Task added: "${title}"`,
      suggestions: [
        'task list',
        `task complete ${newTask.id}`,
        'task add another task'
      ],
      data: newTask
    };
  }
};

export const taskListCommand: Command = {
  name: 'task.list',
  description: 'List all tasks',
  aliases: ['tasks', 't.list', 'todos'],
  handler: async (context: AssistantContext): Promise<AssistantResponse> => {
    if (!context.userData || context.userData.tasks.length === 0) {
      return {
        message: 'You have no tasks yet. Add one with `task add [title]`',
        suggestions: ['task add Buy groceries', 'task add Study for exam']
      };
    }

    const tasks = context.userData.tasks;
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    const taskList = [];
    
    if (pendingTasks.length > 0) {
      taskList.push('**📋 Pending Tasks:**');
      pendingTasks.forEach(task => {
        const priority = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        taskList.push(`${priority} ${task.title} (ID: ${task.id})`);
      });
    }

    if (inProgressTasks.length > 0) {
      taskList.push('\n**🚀 In Progress:**');
      inProgressTasks.forEach(task => {
        taskList.push(`• ${task.title} (ID: ${task.id})`);
      });
    }

    if (completedTasks.length > 0) {
      taskList.push('\n**✅ Completed:**');
      completedTasks.slice(-3).forEach(task => {
        taskList.push(`• ~~${task.title}~~`);
      });
    }

    return {
      message: taskList.join('\n'),
      suggestions: [
        'task add New task',
        pendingTasks.length > 0 ? `task complete ${pendingTasks[0].id}` : null,
        'task clear completed'
      ].filter(Boolean) as string[],
      data: { tasks }
    };
  }
};

export const taskCompleteCommand: Command = {
  name: 'task.complete',
  description: 'Mark a task as complete',
  aliases: ['done', 't.done', 'finish'],
  parameters: [
    {
      name: 'identifier',
      type: 'string',
      required: true,
      description: 'Task ID or title'
    }
  ],
  handler: async (context: AssistantContext, args: Record<string, any>): Promise<AssistantResponse> => {
    const { identifier } = args;
    
    if (!identifier) {
      return {
        message: 'Please provide a task ID or title to complete.',
        suggestions: ['task list', 'task complete task-123']
      };
    }

    if (!context.userData) {
      return {
        message: 'Unable to access user data. Please try again.',
        suggestions: ['help', 'task list']
      };
    }

    const task = context.userData.tasks.find(t => 
      t.id === identifier || 
      t.title.toLowerCase().includes(identifier.toLowerCase())
    );

    if (!task) {
      return {
        message: `Task "${identifier}" not found. Use \`task list\` to see all tasks.`,
        suggestions: ['task list', 'task add New task']
      };
    }

    task.status = 'completed';
    task.updatedAt = new Date();

    return {
      message: `✅ Task completed: "${task.title}"`,
      suggestions: [
        'task list',
        'task add New task',
        'task stats'
      ],
      data: task
    };
  }
};
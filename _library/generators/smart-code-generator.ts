/**
 * Smart Code Generator - AI-Enhanced Code Generation
 * Generates React components, API routes, and database schemas
 * with best practices and security patterns
 */

import fs from "fs/promises";
import path from "path";
import { z } from "zod";

// Configuration schemas
const ComponentConfigSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["ui", "business", "layout", "form"]),
  props: z
    .array(
      z.object({
        name: z.string(),
        type: z.string(),
        optional: z.boolean().default(false),
        description: z.string().optional(),
      }),
    )
    .default([]),
  withTypeScript: z.boolean().default(true),
  withStorybook: z.boolean().default(false),
  withTests: z.boolean().default(true),
  withSecurity: z.boolean().default(true),
});

const APIConfigSchema = z.object({
  name: z.string().min(1),
  methods: z
    .array(z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]))
    .default(["GET"]),
  withAuth: z.boolean().default(true),
  withValidation: z.boolean().default(true),
  withRateLimit: z.boolean().default(true),
  withAuditLog: z.boolean().default(true),
  model: z.string().optional(),
});

export type ComponentConfig = z.infer<typeof ComponentConfigSchema>;
export type APIConfig = z.infer<typeof APIConfigSchema>;

export class SmartCodeGenerator {
  private baseDir: string;

  constructor(baseDir: string = process.cwd()) {
    this.baseDir = baseDir;
  }

  /**
   * Generate a React component with best practices
   */
  async generateComponent(config: ComponentConfig): Promise<string> {
    const validatedConfig = ComponentConfigSchema.parse(config);

    const componentCode = this.generateComponentCode(validatedConfig);
    const testCode = validatedConfig.withTests
      ? this.generateTestCode(validatedConfig)
      : null;
    const storyCode = validatedConfig.withStorybook
      ? this.generateStoryCode(validatedConfig)
      : null;

    // Create component directory
    const componentDir = path.join(
      this.baseDir,
      "src/components",
      validatedConfig.type,
      validatedConfig.name,
    );
    await fs.mkdir(componentDir, { recursive: true });

    // Write component file
    const componentPath = path.join(
      componentDir,
      `${validatedConfig.name}.tsx`,
    );
    await fs.writeFile(componentPath, componentCode);

    // Write test file
    if (testCode) {
      const testPath = path.join(
        componentDir,
        `${validatedConfig.name}.test.tsx`,
      );
      await fs.writeFile(testPath, testCode);
    }

    // Write story file
    if (storyCode) {
      const storyPath = path.join(
        componentDir,
        `${validatedConfig.name}.stories.tsx`,
      );
      await fs.writeFile(storyPath, storyCode);
    }

    // Update index exports
    await this.updateComponentIndex(validatedConfig);

    return componentPath;
  }

  /**
   * Generate an API route with security best practices
   */
  async generateAPI(config: APIConfig): Promise<string> {
    const validatedConfig = APIConfigSchema.parse(config);

    const apiCode = this.generateAPICode(validatedConfig);

    // Create API directory
    const apiDir = path.join(this.baseDir, "src/app/api", validatedConfig.name);
    await fs.mkdir(apiDir, { recursive: true });

    // Write API route
    const apiPath = path.join(apiDir, "route.ts");
    await fs.writeFile(apiPath, apiCode);

    return apiPath;
  }

  /**
   * Generate Prisma model and related files
   */
  async generateModel(
    name: string,
    fields: Array<{ name: string; type: string; required: boolean }>,
  ): Promise<void> {
    const modelCode = this.generatePrismaModel(name, fields);
    const serviceCode = this.generateServiceCode(name);
    const typeCode = this.generateTypeCode(name, fields);

    // Add to schema.prisma
    const schemaPath = path.join(this.baseDir, "prisma/schema.prisma");
    const existingSchema = await fs.readFile(schemaPath, "utf-8");
    await fs.writeFile(schemaPath, existingSchema + "\n\n" + modelCode);

    // Create service
    const serviceDir = path.join(this.baseDir, "src/services");
    await fs.mkdir(serviceDir, { recursive: true });
    const servicePath = path.join(
      serviceDir,
      `${name.toLowerCase()}.service.ts`,
    );
    await fs.writeFile(servicePath, serviceCode);

    // Create types
    const typesDir = path.join(this.baseDir, "src/types");
    await fs.mkdir(typesDir, { recursive: true });
    const typePath = path.join(typesDir, `${name.toLowerCase()}.ts`);
    await fs.writeFile(typePath, typeCode);
  }

  /**
   * Generate component code with security and best practices
   */
  private generateComponentCode(config: ComponentConfig): string {
    const imports = [
      "import React from 'react'",
      "import { cn } from '@/shared/lib/utils'",
    ];

    if (config.withSecurity) {
      imports.push("import { sanitizeProps } from '@/lib/security'");
    }

    const propsInterface = this.generatePropsInterface(config);
    const componentBody = this.generateComponentBody(config);

    return `/**
 * ${config.name} - ${this.getComponentDescription(config.type)}
 * Generated with Smart Code Generator
 * 
 * @example
 * \`\`\`tsx
 * <${config.name} ${this.generateExampleProps(config)} />
 * \`\`\`
 */

${imports.join("\n")}

${propsInterface}

export function ${config.name}(${this.generatePropsParameter(config)}) {
  ${config.withSecurity ? "const sanitizedProps = sanitizeProps(props)" : ""}
  
  return (
    ${componentBody}
  )
}

export default ${config.name}
`;
  }

  /**
   * Generate API route code with security
   */
  private generateAPICode(config: APIConfig): string {
    const imports = [
      "import { NextRequest, NextResponse } from 'next/server'",
      "import { prisma } from '@/lib/prisma'",
    ];

    if (config.withAuth) {
      imports.push("import { auth } from '@/infrastructure/auth/auth'");
    }

    if (config.withValidation) {
      imports.push("import { z } from 'zod'");
    }

    if (config.withRateLimit) {
      imports.push("import { advancedRateLimiter } from '@/lib/security'");
    }

    if (config.withAuditLog) {
      imports.push("import crypto from 'crypto'");
    }

    const methods = config.methods
      .map((method) => this.generateAPIMethod(method, config))
      .join("\n\n");

    return `/**
 * ${config.name} API Route
 * Generated with Smart Code Generator
 * Security features: ${this.getSecurityFeatures(config).join(", ")}
 */

${imports.join("\n")}

${config.withValidation ? this.generateValidationSchemas(config) : ""}

${methods}
`;
  }

  /**
   * Generate API method implementation
   */
  private generateAPIMethod(method: string, config: APIConfig): string {
    const authCheck = config.withAuth
      ? `
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }`
      : "";

    const rateLimitCheck = config.withRateLimit
      ? `
  const rateLimitResult = advancedRateLimiter.checkRequestLimit(
    session?.user?.id || request.headers.get('x-forwarded-for') || 'anonymous'
  )
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }`
      : "";

    const auditLog = config.withAuditLog
      ? `
  // Create audit log
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: session?.user?.id,
      action: '${config.name.toUpperCase()}_${method}',
      resource: '${config.name}',
      ipAddress: request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
    },
  })`
      : "";

    return `export async function ${method}(request: NextRequest) {
  try {${authCheck}${rateLimitCheck}

    ${this.generateMethodBody(method, config)}${auditLog}

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('${method} ${config.name} error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}`;
  }

  /**
   * Generate method-specific body
   */
  private generateMethodBody(method: string, config: APIConfig): string {
    switch (method) {
      case "GET":
        return `// Fetch ${config.name} data
    const data = await prisma.${config.model || config.name.toLowerCase()}.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })`;

      case "POST":
        return `// Create new ${config.name}
    const body = await request.json()
    
    ${
      config.withValidation
        ? `// Validate input
    const validatedData = CreateSchema.parse(body)`
        : ""
    }
    
    const data = await prisma.${config.model || config.name.toLowerCase()}.create({
      data: {
        id: crypto.randomUUID(),
        ...${config.withValidation ? "validatedData" : "body"},
        createdBy: session?.user?.id,
      }
    })`;

      case "PUT":
        return `// Update ${config.name}
    const { id } = await params
    const body = await request.json()
    
    ${
      config.withValidation
        ? `// Validate input
    const validatedData = UpdateSchema.parse(body)`
        : ""
    }
    
    const data = await prisma.${config.model || config.name.toLowerCase()}.update({
      where: { id },
      data: {
        ...${config.withValidation ? "validatedData" : "body"},
        updatedBy: session?.user?.id,
        updatedAt: new Date(),
      }
    })`;

      case "DELETE":
        return `// Soft delete ${config.name}
    const { id } = await params
    
    const data = await prisma.${config.model || config.name.toLowerCase()}.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: session?.user?.id,
      }
    })`;

      default:
        return `// ${method} implementation`;
    }
  }

  /**
   * Generate validation schemas
   */
  private generateValidationSchemas(config: APIConfig): string {
    return `
// Validation schemas
const CreateSchema = z.object({
  // Add your fields here
  name: z.string().min(1),
})

const UpdateSchema = CreateSchema.partial()
`;
  }

  /**
   * Generate Prisma model
   */
  private generatePrismaModel(
    name: string,
    fields: Array<{ name: string; type: string; required: boolean }>,
  ): string {
    const fieldDefinitions = fields
      .map((field) => {
        const optional = field.required ? "" : "?";
        return `  ${field.name}${optional}    ${field.type}`;
      })
      .join("\n");

    return `model ${name} {
  id          String    @id @default(cuid())
${fieldDefinitions}
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  createdBy   String?
  updatedBy   String?
  deletedBy   String?
  
  @@index([createdAt])
}`;
  }

  /**
   * Generate service code
   */
  private generateServiceCode(name: string): string {
    const lowerName = name.toLowerCase();
    return `/**
 * ${name} Service
 * Generated with Smart Code Generator
 */

import { prisma } from '@/lib/prisma'
import type { ${name} } from '@/types/${lowerName}'

export class ${name}Service {
  static async findAll() {
    return prisma.${lowerName}.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async findById(id: string) {
    return prisma.${lowerName}.findUnique({
      where: { id, deletedAt: null }
    })
  }

  static async create(data: Omit<${name}, 'id' | 'createdAt' | 'updatedAt'>) {
    return prisma.${lowerName}.create({
      data: {
        id: crypto.randomUUID(),
        ...data
      }
    })
  }

  static async update(id: string, data: Partial<${name}>) {
    return prisma.${lowerName}.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    })
  }

  static async softDelete(id: string, deletedBy: string) {
    return prisma.${lowerName}.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy
      }
    })
  }
}
`;
  }

  // Helper methods
  private generatePropsInterface(config: ComponentConfig): string {
    if (config.props.length === 0) {
      return `interface ${config.name}Props {
  className?: string
  children?: React.ReactNode
}`;
    }

    const props = config.props
      .map((prop) => {
        const optional = prop.optional ? "?" : "";
        const description = prop.description
          ? `\n  /** ${prop.description} */`
          : "";
        return `${description}
  ${prop.name}${optional}: ${prop.type}`;
      })
      .join("\n");

    return `interface ${config.name}Props {
  className?: string${props}
}`;
  }

  private generateComponentBody(config: ComponentConfig): string {
    return `<div className={cn('${config.type}-component', className)}>
      {/* Component content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold">${config.name}</h3>
        {children}
      </div>
    </div>`;
  }

  private getComponentDescription(type: string): string {
    const descriptions = {
      ui: "Reusable UI component",
      business: "Business logic component",
      layout: "Layout wrapper component",
      form: "Form input component",
    };
    return descriptions[type as keyof typeof descriptions] || "Component";
  }

  private getSecurityFeatures(config: APIConfig): string[] {
    const features = [];
    if (config.withAuth) features.push("Authentication");
    if (config.withValidation) features.push("Input Validation");
    if (config.withRateLimit) features.push("Rate Limiting");
    if (config.withAuditLog) features.push("Audit Logging");
    return features;
  }

  private generatePropsParameter(config: ComponentConfig): string {
    return `props: ${config.name}Props`;
  }

  private generateExampleProps(config: ComponentConfig): string {
    return config.props
      .slice(0, 2)
      .map((prop) => `${prop.name}="example"`)
      .join(" ");
  }

  private generateTestCode(config: ComponentConfig): string {
    return `/**
 * ${config.name} Tests
 * Generated with Smart Code Generator
 */

import { render, screen } from '@testing-library/react'
import { ${config.name} } from './${config.name}'

describe('${config.name}', () => {
  it('renders correctly', () => {
    render(<${config.name} />)
    expect(screen.getByText('${config.name}')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<${config.name} className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
`;
  }

  private generateStoryCode(config: ComponentConfig): string {
    return `/**
 * ${config.name} Stories
 * Generated with Smart Code Generator
 */

import type { Meta, StoryObj } from '@storybook/react'
import { ${config.name} } from './${config.name}'

const meta: Meta<typeof ${config.name}> = {
  title: '${config.type}/${config.name}',
  component: ${config.name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
`;
  }

  private generateTypeCode(
    name: string,
    fields: Array<{ name: string; type: string; required: boolean }>,
  ): string {
    const fieldTypes = fields
      .map((field) => {
        const optional = field.required ? "" : "?";
        return `  ${field.name}${optional}: ${field.type}`;
      })
      .join("\n");

    return `/**
 * ${name} Types
 * Generated with Smart Code Generator
 */

export interface ${name} {
  id: string
${fieldTypes}
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  createdBy?: string
  updatedBy?: string
  deletedBy?: string
}

export type Create${name}Input = Omit<${name}, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type Update${name}Input = Partial<Create${name}Input>
`;
  }

  private async updateComponentIndex(config: ComponentConfig): Promise<void> {
    const indexPath = path.join(
      this.baseDir,
      "src/components",
      config.type,
      "index.ts",
    );

    try {
      const existingContent = await fs.readFile(indexPath, "utf-8");
      const exportLine = `export { ${config.name} } from './${config.name}/${config.name}'`;

      if (!existingContent.includes(exportLine)) {
        await fs.writeFile(indexPath, existingContent + "\n" + exportLine);
      }
    } catch (error) {
      // Create new index file
      const exportLine = `export { ${config.name} } from './${config.name}/${config.name}'`;
      await fs.writeFile(indexPath, exportLine + "\n");
    }
  }
}

// CLI interface
export async function generateComponent(
  name: string,
  options: Partial<ComponentConfig> = {},
) {
  const generator = new SmartCodeGenerator();
  const config: ComponentConfig = {
    name,
    type: "ui",
    props: [],
    withTypeScript: true,
    withStorybook: false,
    withTests: true,
    withSecurity: true,
    ...options,
  };

  return generator.generateComponent(config);
}

export async function generateAPI(
  name: string,
  options: Partial<APIConfig> = {},
) {
  const generator = new SmartCodeGenerator();
  const config: APIConfig = {
    name,
    methods: ["GET"],
    withAuth: true,
    withValidation: true,
    withRateLimit: true,
    withAuditLog: true,
    ...options,
  };

  return generator.generateAPI(config);
}

#!/usr/bin/env node

/**
 * Smart Code Generator CLI
 * Usage: npx tsx _library/cli/generate.ts component MyComponent --type=ui
 */

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import {
  SmartCodeGenerator,
  ComponentConfig,
  APIConfig,
} from "../generators/smart-code-generator";

program
  .name("smart-gen")
  .description("Smart Code Generator for CMS-ERP")
  .version("1.0.0");

// Component generation command
program
  .command("component")
  .alias("c")
  .argument("<name>", "Component name")
  .option(
    "-t, --type <type>",
    "Component type (ui, business, layout, form)",
    "ui",
  )
  .option("--no-tests", "Skip test generation")
  .option("--no-security", "Skip security features")
  .option("--storybook", "Generate Storybook stories")
  .option("--interactive", "Interactive mode")
  .description("Generate a React component")
  .action(async (name: string, options) => {
    console.log(chalk.blue("🎨 Generating React Component..."));

    let config: ComponentConfig = {
      name,
      type: options.type,
      withTests: options.tests,
      withSecurity: options.security,
      withStorybook: options.storybook,
      withTypeScript: true,
      props: [],
    };

    if (options.interactive) {
      config = await promptComponentConfig(config);
    }

    try {
      const generator = new SmartCodeGenerator();
      const filePath = await generator.generateComponent(config);

      console.log(chalk.green("✅ Component generated successfully!"));
      console.log(chalk.gray(`   📁 ${filePath}`));

      if (config.withTests) {
        console.log(chalk.gray(`   🧪 Test file included`));
      }

      if (config.withStorybook) {
        console.log(chalk.gray(`   📚 Storybook story included`));
      }

      if (config.withSecurity) {
        console.log(chalk.gray(`   🔐 Security features enabled`));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error generating component:"), error);
      process.exit(1);
    }
  });

// API generation command
program
  .command("api")
  .alias("a")
  .argument("<name>", "API endpoint name")
  .option(
    "-m, --methods <methods>",
    "HTTP methods (comma-separated)",
    "GET,POST",
  )
  .option("--no-auth", "Skip authentication")
  .option("--no-validation", "Skip input validation")
  .option("--no-rate-limit", "Skip rate limiting")
  .option("--no-audit", "Skip audit logging")
  .option("--model <model>", "Associated Prisma model")
  .option("--interactive", "Interactive mode")
  .description("Generate an API route")
  .action(async (name: string, options) => {
    console.log(chalk.blue("🚀 Generating API Route..."));

    let config: APIConfig = {
      name,
      methods: options.methods
        .split(",")
        .map((m: string) => m.trim().toUpperCase()),
      withAuth: options.auth,
      withValidation: options.validation,
      withRateLimit: options.rateLimit,
      withAuditLog: options.audit,
      model: options.model,
    };

    if (options.interactive) {
      config = await promptAPIConfig(config);
    }

    try {
      const generator = new SmartCodeGenerator();
      const filePath = await generator.generateAPI(config);

      console.log(chalk.green("✅ API route generated successfully!"));
      console.log(chalk.gray(`   📁 ${filePath}`));
      console.log(chalk.gray(`   🌐 Methods: ${config.methods.join(", ")}`));

      const features = [];
      if (config.withAuth) features.push("🔐 Authentication");
      if (config.withValidation) features.push("✅ Validation");
      if (config.withRateLimit) features.push("⏱️ Rate Limiting");
      if (config.withAuditLog) features.push("📝 Audit Logging");

      if (features.length > 0) {
        console.log(chalk.gray(`   Features: ${features.join(", ")}`));
      }
    } catch (error) {
      console.error(chalk.red("❌ Error generating API:"), error);
      process.exit(1);
    }
  });

// Model generation command
program
  .command("model")
  .alias("m")
  .argument("<name>", "Model name")
  .option("--interactive", "Interactive mode")
  .description("Generate a Prisma model with service and types")
  .action(async (name: string, options) => {
    console.log(chalk.blue("🗄️ Generating Model..."));

    let fields: Array<{ name: string; type: string; required: boolean }> = [];

    if (options.interactive) {
      fields = await promptModelFields();
    } else {
      // Default fields
      fields = [
        { name: "name", type: "String", required: true },
        { name: "description", type: "String?", required: false },
      ];
    }

    try {
      const generator = new SmartCodeGenerator();
      await generator.generateModel(name, fields);

      console.log(chalk.green("✅ Model generated successfully!"));
      console.log(chalk.gray(`   📄 Schema updated`));
      console.log(chalk.gray(`   🔧 Service created`));
      console.log(chalk.gray(`   📝 Types created`));
      console.log(chalk.yellow("   ⚠️ Remember to run: npx prisma db push"));
    } catch (error) {
      console.error(chalk.red("❌ Error generating model:"), error);
      process.exit(1);
    }
  });

// Interactive prompts
async function promptComponentConfig(
  config: ComponentConfig,
): Promise<ComponentConfig> {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "type",
      message: "Component type:",
      choices: ["ui", "business", "layout", "form"],
      default: config.type,
    },
    {
      type: "confirm",
      name: "withTests",
      message: "Generate tests?",
      default: config.withTests,
    },
    {
      type: "confirm",
      name: "withStorybook",
      message: "Generate Storybook stories?",
      default: config.withStorybook,
    },
    {
      type: "confirm",
      name: "withSecurity",
      message: "Include security features?",
      default: config.withSecurity,
    },
    {
      type: "confirm",
      name: "addProps",
      message: "Add custom props?",
      default: false,
    },
  ]);

  let props = config.props;

  if (answers.addProps) {
    props = await promptComponentProps();
  }

  return {
    ...config,
    ...answers,
    props,
  };
}

async function promptComponentProps(): Promise<ComponentConfig["props"]> {
  const props: ComponentConfig["props"] = [];

  while (true) {
    const { addMore } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addMore",
        message: props.length === 0 ? "Add a prop?" : "Add another prop?",
        default: props.length === 0,
      },
    ]);

    if (!addMore) break;

    const propConfig = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Prop name:",
        validate: (input) => input.trim() !== "" || "Prop name is required",
      },
      {
        type: "input",
        name: "type",
        message: "Prop type:",
        default: "string",
      },
      {
        type: "confirm",
        name: "optional",
        message: "Optional prop?",
        default: true,
      },
      {
        type: "input",
        name: "description",
        message: "Description (optional):",
      },
    ]);

    props.push(propConfig);
  }

  return props;
}

async function promptAPIConfig(config: APIConfig): Promise<APIConfig> {
  const answers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "methods",
      message: "HTTP methods:",
      choices: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      default: config.methods,
    },
    {
      type: "confirm",
      name: "withAuth",
      message: "Require authentication?",
      default: config.withAuth,
    },
    {
      type: "confirm",
      name: "withValidation",
      message: "Include input validation?",
      default: config.withValidation,
    },
    {
      type: "confirm",
      name: "withRateLimit",
      message: "Enable rate limiting?",
      default: config.withRateLimit,
    },
    {
      type: "confirm",
      name: "withAuditLog",
      message: "Enable audit logging?",
      default: config.withAuditLog,
    },
    {
      type: "input",
      name: "model",
      message: "Associated Prisma model (optional):",
      default: config.model,
    },
  ]);

  return {
    ...config,
    ...answers,
  };
}

async function promptModelFields(): Promise<
  Array<{ name: string; type: string; required: boolean }>
> {
  const fields: Array<{ name: string; type: string; required: boolean }> = [];

  while (true) {
    const { addMore } = await inquirer.prompt([
      {
        type: "confirm",
        name: "addMore",
        message: fields.length === 0 ? "Add a field?" : "Add another field?",
        default: fields.length === 0,
      },
    ]);

    if (!addMore) break;

    const fieldConfig = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Field name:",
        validate: (input) => input.trim() !== "" || "Field name is required",
      },
      {
        type: "list",
        name: "type",
        message: "Field type:",
        choices: ["String", "Int", "Float", "Boolean", "DateTime", "Json"],
      },
      {
        type: "confirm",
        name: "required",
        message: "Required field?",
        default: true,
      },
    ]);

    fields.push(fieldConfig);
  }

  return fields;
}

// Library command - show available components and utilities
program
  .command("library")
  .alias("lib")
  .description("Show library components and utilities")
  .action(async () => {
    console.log(chalk.blue("📚 CMS-ERP Library"));
    console.log(chalk.gray("=".repeat(50)));

    console.log(chalk.green("\n🎨 UI Components:"));
    console.log(chalk.gray("  • ActionButton - Versatile action button"));
    console.log(chalk.gray("  • DataTable - Advanced data table"));
    console.log(chalk.gray("  • SmartForm - Auto-generating form"));

    console.log(chalk.green("\n🪝 Hooks:"));
    console.log(chalk.gray("  • useApi - API interaction hook"));
    console.log(chalk.gray("  • useSmartQuery - Advanced data fetching"));

    console.log(chalk.green("\n🔧 Utilities:"));
    console.log(chalk.gray("  • validation/common - Common validators"));
    console.log(chalk.gray("  • api/middleware - API middleware"));

    console.log(chalk.green("\n📝 Templates:"));
    console.log(chalk.gray("  • PageTemplate - Page layout template"));

    console.log(chalk.blue("\n💡 Usage Examples:"));
    console.log(
      chalk.gray("  smart-gen component MyButton --type=ui --interactive"),
    );
    console.log(
      chalk.gray("  smart-gen api users --methods=GET,POST,PUT --interactive"),
    );
    console.log(chalk.gray("  smart-gen model Product --interactive"));
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

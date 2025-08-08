import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting simple seed...");

  try {
    // Clean existing data
    console.log("Cleaning existing data...");
    await prisma.surveyResponse.deleteMany();
    await prisma.survey.deleteMany();
    await prisma.media.deleteMany();
    await prisma.page.deleteMany();
    await prisma.menu.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.role.deleteMany();
    await prisma.user.deleteMany();

    // Create admin user
    console.log("Creating admin user...");
    const adminUser = await prisma.user.create({
      data: {
        id: "admin-user-id",
        email: "admin@example.com",
        username: "admin",
        passwordHash: await bcrypt.hash("password123", 10),
        firstName: "Admin",
        lastName: "User",
        displayName: "Admin User",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create admin role
    console.log("Creating admin role...");
    const adminRole = await prisma.role.create({
      data: {
        id: "admin-role-id",
        name: "Administrator",
        code: "admin",
        description: "Full system access",
        level: 100,
        isSystemRole: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Assign role to user
    await prisma.userRole.create({
      data: {
        id: "admin-user-role-id",
        userId: adminUser.id,
        roleId: adminRole.id,
        isActive: true,
      },
    });

    console.log("✅ User and role created");

    // Create some media
    console.log("Creating media items...");
    const media1 = await prisma.media.create({
      data: {
        id: "media-1",
        filename: "sample-image.jpg",
        originalName: "sample-image.jpg",
        url: "https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=800&h=600&fit=crop",
        mimeType: "image/jpeg",
        size: 500000,
        width: 800,
        height: 600,
        metadata: {
          width: 800,
          height: 600,
        },
        uploadedBy: adminUser.id,
        createdAt: new Date(),
      },
    });

    console.log("✅ Media created");

    // Create a simple page
    console.log("Creating pages...");
    await prisma.page.create({
      data: {
        id: "home-page",
        title: JSON.stringify({ en: "Home", th: "หน้าแรก" }),
        slug: "home",
        components: {
          components: [
            {
              id: "hero-1",
              type: "hero",
              content: {
                en: "Welcome to Our Website",
                th: "ยินดีต้อนรับสู่เว็บไซต์ของเรา",
              },
              props: {
                subtitle: {
                  en: "Your trusted partner",
                  th: "พันธมิตรที่คุณไว้วางใจ",
                },
              },
            },
          ],
        },
        status: "published",
        publishedAt: new Date(),
        createdBy: adminUser.id,
        language: "en",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Page created");

    // Create a simple survey
    console.log("Creating survey...");
    await prisma.survey.create({
      data: {
        id: "survey-1",
        title: { en: "Customer Feedback", th: "ความคิดเห็นลูกค้า" },
        description: {
          en: "Share your thoughts",
          th: "แบ่งปันความคิดเห็นของคุณ",
        },
        slug: "customer-feedback",
        status: "active",
        fields: {
          questions: [
            {
              id: "q1",
              type: "text",
              question: { en: "Your name", th: "ชื่อของคุณ" },
              required: true,
              order: 0,
            },
            {
              id: "q2",
              type: "radio",
              question: {
                en: "How satisfied are you?",
                th: "คุณพึงพอใจแค่ไหน?",
              },
              required: true,
              order: 1,
              options: [
                {
                  id: "opt1",
                  label: { en: "Very satisfied", th: "พอใจมาก" },
                  value: "very_satisfied",
                  order: 0,
                },
                {
                  id: "opt2",
                  label: { en: "Satisfied", th: "พอใจ" },
                  value: "satisfied",
                  order: 1,
                },
                {
                  id: "opt3",
                  label: { en: "Neutral", th: "เฉยๆ" },
                  value: "neutral",
                  order: 2,
                },
              ],
            },
          ],
        },
        settings: {
          showProgressBar: true,
          allowBackNavigation: false,
          shuffleQuestions: false,
          requireLogin: false,
          collectEmail: true,
          sendConfirmation: false,
        },
        createdById: adminUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Survey created");

    // Create navigation menu
    console.log("Creating navigation...");
    await prisma.menu.create({
      data: {
        id: "main-nav",
        name: "Main Navigation",
        code: "main-nav",
        location: "header",
        items: [
          {
            label: { en: "Home", th: "หน้าแรก" },
            url: "/",
            order: 0,
          },
          {
            label: { en: "About", th: "เกี่ยวกับเรา" },
            url: "/about",
            order: 1,
          },
          {
            label: { en: "Contact", th: "ติดต่อ" },
            url: "/contact",
            order: 2,
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("✅ Navigation created");

    // Create basic system config
    console.log("Creating system config...");
    const configs = [
      {
        id: "site-name",
        key: "site.name",
        value: { en: "My Website", th: "เว็บไซต์ของฉัน" },
        type: "string",
        category: "general",
        description: "Site name",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "site-tagline",
        key: "site.tagline",
        value: { en: "Welcome to our site", th: "ยินดีต้อนรับสู่เว็บไซต์" },
        type: "string",
        category: "general",
        description: "Site tagline",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "contact-email",
        key: "contact.email",
        value: "info@example.com",
        type: "string",
        category: "contact",
        description: "Contact email",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    for (const config of configs) {
      await prisma.systemConfig.create({ data: config });
    }

    console.log("✅ System config created");

    console.log(`
🎉 Simple seed completed successfully!

You can now login with:
- Admin: admin@example.com / password123

Created:
- 1 user with admin role
- 1 media item
- 1 page
- 1 survey
- 1 navigation menu
- 3 system config entries
    `);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

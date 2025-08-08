import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

// Thai lorem ipsum generator
function generateThaiText(wordCount: number = 10): string {
  const thaiWords = [
    "สวัสดี",
    "ขอบคุณ",
    "ยินดีต้อนรับ",
    "บริการ",
    "คุณภาพ",
    "พัฒนา",
    "ประสบการณ์",
    "เทคโนโลยี",
    "นวัตกรรม",
    "ความสำเร็จ",
    "โซลูชัน",
    "ธุรกิจ",
    "องค์กร",
    "ระบบ",
    "จัดการ",
    "ข้อมูล",
    "วิเคราะห์",
    "ปรับปรุง",
    "ประสิทธิภาพ",
    "เป้าหมาย",
  ];
  return Array.from({ length: wordCount }, () =>
    faker.helpers.arrayElement(thaiWords),
  ).join(" ");
}

async function main() {
  console.log("🌱 Starting full seed with mock data...");

  try {
    // Clean existing data
    console.log("Cleaning existing data...");
    await prisma.surveyResponse.deleteMany();
    await prisma.survey.deleteMany();
    await prisma.postTag.deleteMany();
    await prisma.postMedia.deleteMany();
    await prisma.post.deleteMany();
    await prisma.galleryMedia.deleteMany();
    await prisma.gallery.deleteMany();
    await prisma.media.deleteMany();
    await prisma.mediaFolder.deleteMany();
    await prisma.page.deleteMany();
    await prisma.menu.deleteMany();
    await prisma.systemConfig.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.category.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // Create permissions
    console.log("Creating permissions...");
    const permissions = [
      { resource: "user", action: "create", description: "Create users" },
      { resource: "user", action: "read", description: "View users" },
      { resource: "user", action: "update", description: "Update users" },
      { resource: "user", action: "delete", description: "Delete users" },
      { resource: "content", action: "create", description: "Create content" },
      { resource: "content", action: "read", description: "View content" },
      { resource: "content", action: "update", description: "Update content" },
      { resource: "content", action: "delete", description: "Delete content" },
      { resource: "media", action: "upload", description: "Upload media" },
      { resource: "media", action: "delete", description: "Delete media" },
      {
        resource: "system",
        action: "configure",
        description: "Configure system",
      },
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      const permission = await prisma.permission.create({
        data: {
          id: faker.string.uuid(),
          code: `${perm.resource}:${perm.action}`,
          name: `${perm.action}_${perm.resource}`,
          resource: perm.resource,
          action: perm.action,
          description: perm.description,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      createdPermissions.push(permission);
    }

    // Create roles
    console.log("Creating roles...");
    const roles = [
      {
        name: "Administrator",
        code: "admin",
        description: "Full system access",
        level: 100,
        permissions: createdPermissions, // All permissions
      },
      {
        name: "Editor",
        code: "editor",
        description: "Content management access",
        level: 50,
        permissions: createdPermissions.filter(
          (p) => p.resource === "content" || p.resource === "media",
        ),
      },
      {
        name: "Author",
        code: "author",
        description: "Create and edit own content",
        level: 30,
        permissions: createdPermissions.filter(
          (p) =>
            (p.resource === "content" &&
              ["create", "read", "update"].includes(p.action)) ||
            (p.resource === "media" && p.action === "upload"),
        ),
      },
      {
        name: "Viewer",
        code: "viewer",
        description: "Read-only access",
        level: 10,
        permissions: createdPermissions.filter((p) => p.action === "read"),
      },
    ];

    const createdRoles = [];
    for (const roleData of roles) {
      const role = await prisma.role.create({
        data: {
          id: faker.string.uuid(),
          name: roleData.name,
          code: roleData.code,
          description: roleData.description,
          level: roleData.level,
          isSystemRole: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Assign permissions to role
      for (const permission of roleData.permissions) {
        await prisma.rolePermission.create({
          data: {
            id: faker.string.uuid(),
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }

      createdRoles.push({ ...role, permissions: roleData.permissions });
    }

    // Create users
    console.log("Creating users...");
    const users = [];
    const userTemplates = [
      {
        email: "admin@example.com",
        username: "admin",
        name: "Admin User",
        roleCode: "admin",
      },
      {
        email: "editor@example.com",
        username: "editor",
        name: "Editor User",
        roleCode: "editor",
      },
      {
        email: "john.doe@example.com",
        username: "johndoe",
        name: "John Doe",
        roleCode: "author",
      },
      {
        email: "jane.smith@example.com",
        username: "janesmith",
        name: "Jane Smith",
        roleCode: "author",
      },
      {
        email: "viewer@example.com",
        username: "viewer",
        name: "Viewer User",
        roleCode: "viewer",
      },
    ];

    for (const template of userTemplates) {
      const [firstName, lastName] = template.name.split(" ");
      const user = await prisma.user.create({
        data: {
          id: faker.string.uuid(),
          email: template.email,
          username: template.username,
          passwordHash: await bcrypt.hash("password123", 10),
          firstName,
          lastName,
          displayName: template.name,
          bio: faker.lorem.paragraph(),
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(template.name)}&background=random`,
          isActive: true,
          emailVerified: faker.date.past(),
          createdAt: faker.date.past({ years: 2 }),
          updatedAt: new Date(),
        },
      });

      // Assign role
      const role = createdRoles.find((r) => r.code === template.roleCode);
      if (role) {
        await prisma.userRole.create({
          data: {
            id: faker.string.uuid(),
            userId: user.id,
            roleId: role.id,
            isActive: true,
          },
        });
      }

      users.push({ ...user, role: template.roleCode });
    }

    console.log("✅ Users and roles created");

    // Create categories
    console.log("Creating categories...");
    const categories = [];
    const categoryNames = [
      { en: "Technology", th: "เทคโนโลยี" },
      { en: "Business", th: "ธุรกิจ" },
      { en: "Design", th: "การออกแบบ" },
      { en: "Marketing", th: "การตลาด" },
      { en: "Development", th: "การพัฒนา" },
    ];

    for (const name of categoryNames) {
      const category = await prisma.category.create({
        data: {
          id: faker.string.uuid(),
          name: JSON.stringify(name),
          slug: faker.helpers.slugify(name.en).toLowerCase(),
          description: faker.lorem.sentence(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      categories.push(category);
    }

    // Create tags
    console.log("Creating tags...");
    const tags = [];
    const tagNames = [
      "javascript",
      "typescript",
      "react",
      "nextjs",
      "nodejs",
      "tailwind",
      "css",
      "html",
      "api",
      "database",
      "tutorial",
      "guide",
      "tips",
      "news",
      "update",
    ];

    for (const name of tagNames) {
      const tag = await prisma.tag.create({
        data: {
          id: faker.string.uuid(),
          name,
          slug: name,
          color: faker.color.rgb({ format: "hex" }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      tags.push(tag);
    }

    // Create media folders
    console.log("Creating media folders...");
    const rootFolders = ["Images", "Documents", "Videos"];
    const mediaFolders = [];

    for (const folderName of rootFolders) {
      const folder = await prisma.mediaFolder.create({
        data: {
          id: faker.string.uuid(),
          name: folderName,
          path: `/${folderName.toLowerCase()}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      mediaFolders.push(folder);
    }

    // Create media items
    console.log("Creating media items...");
    const mediaItems = [];
    const imageUrls = [
      "https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=1200&h=800&fit=crop",
      "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=800&fit=crop",
    ];

    for (let i = 0; i < 20; i++) {
      const isImage = i < 15; // First 15 are images
      const media = await prisma.media.create({
        data: {
          id: faker.string.uuid(),
          filename: isImage ? `image-${i + 1}.jpg` : `document-${i - 14}.pdf`,
          originalName: isImage
            ? faker.system.fileName({ extensionCount: 0 }) + ".jpg"
            : faker.system.fileName({ extensionCount: 0 }) + ".pdf",
          url: isImage
            ? faker.helpers.arrayElement(imageUrls)
            : faker.internet.url() + "/document.pdf",
          mimeType: isImage ? "image/jpeg" : "application/pdf",
          size: faker.number.int({ min: 100000, max: 5000000 }),
          width: isImage ? 1200 : undefined,
          height: isImage ? 800 : undefined,
          alt: isImage ? faker.lorem.sentence() : undefined,
          caption: isImage ? faker.lorem.sentence() : undefined,
          metadata: {
            type: isImage ? "image" : "document",
          },
          folderId: faker.helpers.arrayElement(mediaFolders).id,
          uploadedBy: faker.helpers.arrayElement(
            users.filter((u) => ["admin", "editor", "author"].includes(u.role)),
          ).id,
          createdAt: faker.date.past(),
        },
      });
      mediaItems.push(media);
    }

    console.log("✅ Media items created");

    // Create galleries
    console.log("Creating galleries...");
    const galleries = [];
    const galleryNames = [
      { en: "Team Photos", th: "รูปภาพทีม" },
      { en: "Product Showcase", th: "แสดงผลิตภัณฑ์" },
      { en: "Office Tour", th: "ทัวร์ออฟฟิศ" },
    ];

    for (const name of galleryNames) {
      const gallery = await prisma.gallery.create({
        data: {
          id: faker.string.uuid(),
          name: JSON.stringify(name),
          slug: faker.helpers.slugify(name.en).toLowerCase(),
          description: faker.lorem.paragraph(),
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Add images to gallery
      const galleryImages = faker.helpers.arrayElements(
        mediaItems.filter((m) => m.mimeType.startsWith("image/")),
        6,
      );
      for (let i = 0; i < galleryImages.length; i++) {
        await prisma.galleryMedia.create({
          data: {
            id: faker.string.uuid(),
            galleryId: gallery.id,
            mediaId: galleryImages[i].id,
            order: i,
          },
        });
      }

      galleries.push(gallery);
    }

    // Create blog posts
    console.log("Creating blog posts...");
    const posts = [];
    const postTitles = [
      { en: "Getting Started with Next.js 15", th: "เริ่มต้นกับ Next.js 15" },
      { en: "The Future of Web Development", th: "อนาคตของการพัฒนาเว็บ" },
      {
        en: "Building Scalable Applications",
        th: "สร้างแอปพลิเคชันที่ขยายได้",
      },
      { en: "Understanding TypeScript", th: "ทำความเข้าใจ TypeScript" },
      { en: "Modern CSS Techniques", th: "เทคนิค CSS สมัยใหม่" },
      {
        en: "API Design Best Practices",
        th: "แนวทางปฏิบัติที่ดีสำหรับการออกแบบ API",
      },
      { en: "Database Optimization Tips", th: "เคล็ดลับการปรับปรุงฐานข้อมูล" },
      {
        en: "Security in Web Applications",
        th: "ความปลอดภัยในเว็บแอปพลิเคชัน",
      },
    ];

    for (const title of postTitles) {
      const author = faker.helpers.arrayElement(
        users.filter((u) => ["admin", "editor", "author"].includes(u.role)),
      );
      const post = await prisma.post.create({
        data: {
          id: faker.string.uuid(),
          title: JSON.stringify(title),
          slug: faker.helpers.slugify(title.en).toLowerCase(),
          content: JSON.stringify({
            en: faker.lorem.paragraphs(5, "\n\n"),
            th: generateThaiText(200),
          }),
          excerpt: JSON.stringify({
            en: faker.lorem.paragraph(),
            th: generateThaiText(50),
          }),
          status: faker.helpers.arrayElement([
            "published",
            "draft",
            "archived",
          ]),
          publishedAt: faker.date.past(),
          categoryId: faker.helpers.arrayElement(categories).id,
          featuredImage: faker.helpers.arrayElement(
            mediaItems.filter((m) => m.mimeType.startsWith("image/")),
          ).url,
          authorId: author.id,
          views: faker.number.int({ min: 0, max: 1000 }),
          likes: faker.number.int({ min: 0, max: 100 }),
          createdAt: faker.date.past(),
          updatedAt: new Date(),
        },
      });

      // Add tags
      const postTags = faker.helpers.arrayElements(
        tags,
        faker.number.int({ min: 2, max: 5 }),
      );
      for (const tag of postTags) {
        await prisma.postTag.create({
          data: {
            id: faker.string.uuid(),
            postId: post.id,
            tagId: tag.id,
          },
        });
      }

      // Add media
      const postMedia = faker.helpers.arrayElements(
        mediaItems.filter((m) => m.mimeType.startsWith("image/")),
        2,
      );
      for (const media of postMedia) {
        await prisma.postMedia.create({
          data: {
            id: faker.string.uuid(),
            postId: post.id,
            mediaId: media.id,
          },
        });
      }

      posts.push(post);
    }

    console.log("✅ Blog posts created");

    // Create pages
    console.log("Creating pages...");
    const pageTemplates = [
      {
        title: { en: "Home", th: "หน้าแรก" },
        slug: "home",
        components: [
          {
            id: faker.string.uuid(),
            type: "hero",
            content: {
              en: "Welcome to Our Platform",
              th: "ยินดีต้อนรับสู่แพลตฟอร์มของเรา",
            },
            props: {
              subtitle: {
                en: "Build amazing experiences with our tools",
                th: "สร้างประสบการณ์ที่น่าทึ่งด้วยเครื่องมือของเรา",
              },
              backgroundImage: faker.helpers.arrayElement(
                mediaItems.filter((m) => m.mimeType.startsWith("image/")),
              ).url,
              ctaText: { en: "Get Started", th: "เริ่มต้นใช้งาน" },
              ctaLink: "/get-started",
            },
          },
          {
            id: faker.string.uuid(),
            type: "features",
            content: {
              en: "Our Features",
              th: "คุณสมบัติของเรา",
            },
            props: {
              features: [
                {
                  title: { en: "Fast Performance", th: "ประสิทธิภาพสูง" },
                  description: {
                    en: "Lightning fast load times",
                    th: "โหลดเร็วปานสายฟ้า",
                  },
                  icon: "zap",
                },
                {
                  title: { en: "Secure", th: "ปลอดภัย" },
                  description: {
                    en: "Enterprise-grade security",
                    th: "ความปลอดภัยระดับองค์กร",
                  },
                  icon: "shield",
                },
                {
                  title: { en: "Scalable", th: "ขยายได้" },
                  description: {
                    en: "Grows with your business",
                    th: "เติบโตไปกับธุรกิจของคุณ",
                  },
                  icon: "trending-up",
                },
              ],
            },
          },
        ],
      },
      {
        title: { en: "About Us", th: "เกี่ยวกับเรา" },
        slug: "about",
        components: [
          {
            id: faker.string.uuid(),
            type: "heading",
            content: {
              en: "About Our Company",
              th: "เกี่ยวกับบริษัทของเรา",
            },
            props: {
              level: 1,
              alignment: "center",
            },
          },
          {
            id: faker.string.uuid(),
            type: "text",
            content: {
              en: faker.lorem.paragraphs(3),
              th: generateThaiText(150),
            },
            props: {},
          },
          {
            id: faker.string.uuid(),
            type: "gallery",
            content: {
              en: "Our Office",
              th: "สำนักงานของเรา",
            },
            props: {
              galleryId: galleries[2].id, // Office Tour gallery
            },
          },
        ],
      },
      {
        title: { en: "Contact", th: "ติดต่อ" },
        slug: "contact",
        components: [
          {
            id: faker.string.uuid(),
            type: "heading",
            content: {
              en: "Get in Touch",
              th: "ติดต่อเรา",
            },
            props: {
              level: 1,
            },
          },
          {
            id: faker.string.uuid(),
            type: "text",
            content: {
              en: "We would love to hear from you. Send us a message and we will respond as soon as possible.",
              th: "เรายินดีที่จะได้ยินจากคุณ ส่งข้อความถึงเราและเราจะตอบกลับโดยเร็วที่สุด",
            },
            props: {},
          },
        ],
      },
    ];

    for (const template of pageTemplates) {
      await prisma.page.create({
        data: {
          id: faker.string.uuid(),
          title: JSON.stringify(template.title),
          slug: template.slug,
          components: { components: template.components },
          status: "published",
          publishedAt: new Date(),
          createdBy: users.find((u) => u.role === "admin")!.id,
          language: "en",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    console.log("✅ Pages created");

    // Create surveys
    console.log("Creating surveys...");
    const surveyTemplates = [
      {
        title: {
          en: "Customer Satisfaction Survey",
          th: "แบบสำรวจความพึงพอใจของลูกค้า",
        },
        description: {
          en: "Help us improve our services by sharing your feedback",
          th: "ช่วยเราปรับปรุงบริการโดยการแบ่งปันความคิดเห็นของคุณ",
        },
        questions: [
          {
            type: "scale",
            question: {
              en: "How satisfied are you with our service?",
              th: "คุณพึงพอใจกับบริการของเรามากน้อยเพียงใด?",
            },
            required: true,
            settings: {
              scaleMin: 1,
              scaleMax: 10,
              scaleMinLabel: { en: "Very Dissatisfied", th: "ไม่พอใจมาก" },
              scaleMaxLabel: { en: "Very Satisfied", th: "พอใจมาก" },
            },
          },
          {
            type: "radio",
            question: {
              en: "How likely are you to recommend us?",
              th: "คุณมีแนวโน้มที่จะแนะนำเรามากน้อยเพียงใด?",
            },
            required: true,
            options: [
              {
                label: { en: "Very Likely", th: "แนะนำแน่นอน" },
                value: "very_likely",
              },
              { label: { en: "Likely", th: "น่าจะแนะนำ" }, value: "likely" },
              { label: { en: "Neutral", th: "เฉยๆ" }, value: "neutral" },
              {
                label: { en: "Unlikely", th: "ไม่น่าจะแนะนำ" },
                value: "unlikely",
              },
              {
                label: { en: "Very Unlikely", th: "ไม่แนะนำแน่นอน" },
                value: "very_unlikely",
              },
            ],
          },
          {
            type: "textarea",
            question: {
              en: "What can we improve?",
              th: "เราควรปรับปรุงอะไรบ้าง?",
            },
            required: false,
          },
        ],
      },
      {
        title: { en: "Event Registration", th: "ลงทะเบียนงาน" },
        description: {
          en: "Register for our upcoming conference",
          th: "ลงทะเบียนสำหรับการประชุมที่จะมาถึง",
        },
        questions: [
          {
            type: "text",
            question: { en: "Full Name", th: "ชื่อ-นามสกุล" },
            required: true,
          },
          {
            type: "text",
            question: { en: "Email Address", th: "อีเมล" },
            required: true,
            validation: { type: "email" },
          },
          {
            type: "text",
            question: { en: "Phone Number", th: "เบอร์โทรศัพท์" },
            required: true,
            validation: { type: "phone" },
          },
          {
            type: "select",
            question: { en: "Company Size", th: "ขนาดบริษัท" },
            required: true,
            options: [
              {
                label: { en: "1-10 employees", th: "1-10 พนักงาน" },
                value: "small",
              },
              {
                label: { en: "11-50 employees", th: "11-50 พนักงาน" },
                value: "medium",
              },
              {
                label: { en: "51-200 employees", th: "51-200 พนักงาน" },
                value: "large",
              },
              {
                label: { en: "200+ employees", th: "มากกว่า 200 พนักงาน" },
                value: "enterprise",
              },
            ],
          },
          {
            type: "checkbox",
            question: { en: "Topics of Interest", th: "หัวข้อที่สนใจ" },
            required: false,
            options: [
              {
                label: {
                  en: "AI & Machine Learning",
                  th: "AI และการเรียนรู้ของเครื่อง",
                },
                value: "ai_ml",
              },
              {
                label: { en: "Cloud Computing", th: "คลาวด์คอมพิวติ้ง" },
                value: "cloud",
              },
              {
                label: { en: "Cybersecurity", th: "ความปลอดภัยไซเบอร์" },
                value: "security",
              },
              { label: { en: "DevOps", th: "DevOps" }, value: "devops" },
              {
                label: { en: "Blockchain", th: "บล็อกเชน" },
                value: "blockchain",
              },
            ],
          },
        ],
      },
    ];

    const surveys = [];
    for (let i = 0; i < surveyTemplates.length; i++) {
      const template = surveyTemplates[i];
      const survey = await prisma.survey.create({
        data: {
          id: faker.string.uuid(),
          title: template.title,
          description: template.description,
          slug: `survey-${faker.helpers.slugify(template.title.en).toLowerCase()}`,
          status: "active",
          fields: {
            questions: template.questions.map((q, index) => ({
              id: faker.string.uuid(),
              ...q,
              order: index,
              options: q.options?.map((opt, j) => ({
                id: faker.string.uuid(),
                ...opt,
                order: j,
              })),
            })),
          },
          settings: {
            showProgressBar: true,
            allowBackNavigation: false,
            shuffleQuestions: false,
            requireLogin: false,
            collectEmail: true,
            sendConfirmation: true,
            confirmationMessage: {
              en: "Thank you for your submission!",
              th: "ขอบคุณสำหรับการส่งแบบฟอร์ม!",
            },
          },
          createdById: users.find((u) => u.role === "admin")!.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      surveys.push(survey);
    }

    // Create survey responses
    for (const survey of surveys) {
      const responseCount = faker.number.int({ min: 10, max: 30 });
      for (let i = 0; i < responseCount; i++) {
        const questions = (survey.fields as any).questions || [];
        const answers = questions.map((q: any) => {
          let value;
          switch (q.type) {
            case "text":
              if (q.question.en === "Full Name") {
                value = faker.person.fullName();
              } else if (q.question.en === "Email Address") {
                value = faker.internet.email();
              } else if (q.question.en === "Phone Number") {
                value = faker.phone.number();
              } else {
                value = faker.lorem.sentence();
              }
              break;
            case "textarea":
              value = faker.lorem.paragraph();
              break;
            case "radio":
            case "select":
              value = faker.helpers.arrayElement(q.options || []).value;
              break;
            case "checkbox":
              value = faker.helpers.arrayElements(
                (q.options || []).map((o: any) => o.value),
                { min: 1, max: 3 },
              );
              break;
            case "scale":
              value = faker.number.int({
                min: q.settings?.scaleMin || 1,
                max: q.settings?.scaleMax || 10,
              });
              break;
            case "date":
              value = faker.date.future().toISOString().split("T")[0];
              break;
          }
          return {
            questionId: q.id,
            value,
          };
        });

        await prisma.surveyResponse.create({
          data: {
            id: faker.string.uuid(),
            surveyId: survey.id,
            data: { answers },
            metadata: {
              ip: faker.internet.ip(),
              userAgent: faker.internet.userAgent(),
              duration: faker.number.int({ min: 60, max: 600 }),
            },
            submittedAt: faker.date.recent({ days: 30 }),
          },
        });
      }
    }

    console.log("✅ Surveys and responses created");

    // Create navigation menus
    console.log("Creating navigation menus...");
    await prisma.menu.create({
      data: {
        id: faker.string.uuid(),
        name: "Main Navigation",
        code: "main-nav",
        location: "header",
        items: [
          { label: { en: "Home", th: "หน้าแรก" }, url: "/", order: 0 },
          {
            label: { en: "About", th: "เกี่ยวกับเรา" },
            url: "/about",
            order: 1,
          },
          {
            label: { en: "Blog", th: "บล็อก" },
            url: "/blog",
            order: 2,
            children: categories.map((cat, i) => ({
              label: JSON.parse(cat.name as string),
              url: `/blog/category/${cat.slug}`,
              order: i,
            })),
          },
          {
            label: { en: "Gallery", th: "แกลเลอรี" },
            url: "/gallery",
            order: 3,
          },
          { label: { en: "Contact", th: "ติดต่อ" }, url: "/contact", order: 4 },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await prisma.menu.create({
      data: {
        id: faker.string.uuid(),
        name: "Footer Navigation",
        code: "footer-nav",
        location: "footer",
        items: [
          {
            label: { en: "Privacy Policy", th: "นโยบายความเป็นส่วนตัว" },
            url: "/privacy",
            order: 0,
          },
          {
            label: { en: "Terms of Service", th: "ข้อกำหนดการใช้งาน" },
            url: "/terms",
            order: 1,
          },
          { label: { en: "FAQ", th: "คำถามที่พบบ่อย" }, url: "/faq", order: 2 },
          {
            label: { en: "Support", th: "ฝ่ายสนับสนุน" },
            url: "/support",
            order: 3,
          },
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create system configuration
    console.log("Creating system configuration...");
    const configs = [
      // General settings
      {
        key: "site.name",
        value: { en: "Awesome CMS", th: "CMS สุดเจ๋ง" },
        type: "string",
        category: "general",
      },
      {
        key: "site.tagline",
        value: {
          en: "Your complete content management solution",
          th: "โซลูชันจัดการเนื้อหาที่สมบูรณ์",
        },
        type: "string",
        category: "general",
      },
      {
        key: "site.logo",
        value: mediaItems[0].url,
        type: "string",
        category: "general",
      },
      {
        key: "site.favicon",
        value: mediaItems[1].url,
        type: "string",
        category: "general",
      },
      {
        key: "site.languages",
        value: { default: "en", supported: ["en", "th"] },
        type: "object",
        category: "general",
      },
      {
        key: "site.timezone",
        value: "Asia/Bangkok",
        type: "string",
        category: "general",
      },
      {
        key: "site.dateFormat",
        value: "DD/MM/YYYY",
        type: "string",
        category: "general",
      },

      // Contact settings
      {
        key: "contact.email",
        value: faker.internet.email(),
        type: "string",
        category: "contact",
      },
      {
        key: "contact.phone",
        value: faker.phone.number(),
        type: "string",
        category: "contact",
      },
      {
        key: "contact.address",
        value: {
          en: faker.location.streetAddress(),
          th: faker.location.streetAddress(),
        },
        type: "object",
        category: "contact",
      },
      {
        key: "social.facebook",
        value: "https://facebook.com/awesomecms",
        type: "string",
        category: "contact",
      },
      {
        key: "social.twitter",
        value: "https://twitter.com/awesomecms",
        type: "string",
        category: "contact",
      },
      {
        key: "social.instagram",
        value: "https://instagram.com/awesomecms",
        type: "string",
        category: "contact",
      },
      {
        key: "social.linkedin",
        value: "https://linkedin.com/company/awesomecms",
        type: "string",
        category: "contact",
      },

      // SEO settings
      {
        key: "seo.metaTitle",
        value: {
          en: "Awesome CMS - Content Management System",
          th: "Awesome CMS - ระบบจัดการเนื้อหา",
        },
        type: "object",
        category: "seo",
      },
      {
        key: "seo.metaDescription",
        value: {
          en: "The most powerful and flexible content management system",
          th: "ระบบจัดการเนื้อหาที่ทรงพลังและยืดหยุ่นที่สุด",
        },
        type: "object",
        category: "seo",
      },
      {
        key: "seo.metaKeywords",
        value: ["cms", "content management", "website builder", "page builder"],
        type: "array",
        category: "seo",
      },
      {
        key: "analytics.google",
        value: "G-1234567890",
        type: "string",
        category: "seo",
      },
      {
        key: "analytics.facebook",
        value: "1234567890",
        type: "string",
        category: "seo",
      },

      // Footer settings
      {
        key: "footer.copyright",
        value: {
          en: "© 2024 Awesome CMS. All rights reserved.",
          th: "© 2024 Awesome CMS. สงวนลิขสิทธิ์",
        },
        type: "object",
        category: "footer",
      },
      {
        key: "footer.showSocial",
        value: true,
        type: "boolean",
        category: "footer",
      },
      {
        key: "footer.showNewsletter",
        value: true,
        type: "boolean",
        category: "footer",
      },
      {
        key: "footer.newsletterTitle",
        value: { en: "Subscribe to our newsletter", th: "สมัครรับข่าวสาร" },
        type: "object",
        category: "footer",
      },
      {
        key: "footer.newsletterDescription",
        value: {
          en: "Get the latest updates delivered to your inbox",
          th: "รับข่าวสารล่าสุดส่งตรงถึงอีเมลของคุณ",
        },
        type: "object",
        category: "footer",
      },
    ];

    for (const config of configs) {
      await prisma.systemConfig.create({
        data: {
          id: faker.string.uuid(),
          key: config.key,
          value: config.value,
          type: config.type,
          category: config.category,
          description: `Configuration for ${config.key}`,
          isPublic: config.category !== "seo",
          isEditable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    console.log("✅ System configuration created");

    // Summary
    console.log(`
🎉 Full seed completed successfully!

You can now login with:
- Admin: admin@example.com / password123
- Editor: editor@example.com / password123
- Author: john.doe@example.com / password123
- Author: jane.smith@example.com / password123
- Viewer: viewer@example.com / password123

Created:
- ${await prisma.user.count()} users
- ${await prisma.role.count()} roles with permissions
- ${await prisma.category.count()} categories
- ${await prisma.tag.count()} tags
- ${await prisma.media.count()} media items
- ${await prisma.gallery.count()} galleries
- ${await prisma.post.count()} blog posts
- ${await prisma.page.count()} pages
- ${await prisma.survey.count()} surveys
- ${await prisma.surveyResponse.count()} survey responses
- ${await prisma.menu.count()} navigation menus
- ${await prisma.systemConfig.count()} system configurations
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

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Clean existing data
  await prisma.surveyResponse.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.media.deleteMany();
  await prisma.page.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminUser = await prisma.user.create({
    data: {
      id: faker.string.uuid(),
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

  const editorUser = await prisma.user.create({
    data: {
      id: faker.string.uuid(),
      email: "editor@example.com",
      username: "editor",
      passwordHash: await bcrypt.hash("password123", 10),
      firstName: "Editor",
      lastName: "User",
      displayName: "Editor User",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      id: faker.string.uuid(),
      email: "viewer@example.com",
      username: "viewer",
      passwordHash: await bcrypt.hash("password123", 10),
      firstName: "Viewer",
      lastName: "User",
      displayName: "Viewer User",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("✅ Users created");

  // Create roles
  const adminRole = await prisma.role.create({
    data: {
      id: faker.string.uuid(),
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

  const editorRole = await prisma.role.create({
    data: {
      id: faker.string.uuid(),
      name: "Editor",
      code: "editor",
      description: "Content management access",
      level: 50,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const viewerRole = await prisma.role.create({
    data: {
      id: faker.string.uuid(),
      name: "Viewer",
      code: "viewer",
      description: "Read-only access",
      level: 10,
      isSystemRole: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Assign roles to users
  await prisma.userRole.create({
    data: {
      id: faker.string.uuid(),
      userId: adminUser.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  await prisma.userRole.create({
    data: {
      id: faker.string.uuid(),
      userId: editorUser.id,
      roleId: editorRole.id,
      isActive: true,
    },
  });

  await prisma.userRole.create({
    data: {
      id: faker.string.uuid(),
      userId: viewerUser.id,
      roleId: viewerRole.id,
      isActive: true,
    },
  });

  console.log("✅ Roles created and assigned");

  // Create media items
  const mediaItems: any[] = [];
  const mediaTypes = ["image", "video", "document"] as const;
  const imageUrls = [
    "https://images.unsplash.com/photo-1560707303-4e980ce876ad",
    "https://images.unsplash.com/photo-1517685352821-92cf88aee5a5",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
    "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158",
    "https://images.unsplash.com/photo-1518770660439-4636190af475",
    "https://images.unsplash.com/photo-1555099962-4199c345e5dd",
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
  ];

  for (let i = 0; i < 20; i++) {
    const type = faker.helpers.arrayElement(mediaTypes);
    let url = "";
    let mimeType = "";

    if (type === "image") {
      url = faker.helpers.arrayElement(imageUrls) + "?w=800&h=600&fit=crop";
      mimeType = "image/jpeg";
    } else if (type === "video") {
      url = faker.helpers.arrayElement([
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://vimeo.com/76979871",
        "https://www.youtube.com/watch?v=9bZkp7q19f0",
      ]);
      mimeType = "video/mp4";
    } else {
      url = faker.internet.url() + "/document.pdf";
      mimeType = "application/pdf";
    }

    const media = await prisma.media.create({
      data: {
        id: faker.string.uuid(),
        filename: faker.system.fileName(),
        originalName: faker.system.fileName(),
        url,
        mimeType,
        size: faker.number.int({ min: 100000, max: 10000000 }),
        width: type === "image" ? 800 : undefined,
        height: type === "image" ? 600 : undefined,
        metadata: {
          type,
          duration:
            type === "video"
              ? faker.number.int({ min: 60, max: 600 })
              : undefined,
        },
        uploadedBy: faker.helpers.arrayElement([adminUser.id, editorUser.id]),
      },
    });
    mediaItems.push(media);
  }

  console.log("✅ Media items created");

  // Create surveys
  const surveys = [];
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
      title: { en: "Event Registration Form", th: "แบบฟอร์มลงทะเบียนงาน" },
      description: {
        en: "Register for our upcoming tech conference",
        th: "ลงทะเบียนสำหรับงานประชุมเทคโนโลยีที่จะมาถึง",
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
          type: "select",
          question: { en: "Job Title", th: "ตำแหน่งงาน" },
          required: true,
          options: [
            { label: { en: "Developer", th: "นักพัฒนา" }, value: "developer" },
            { label: { en: "Designer", th: "นักออกแบบ" }, value: "designer" },
            { label: { en: "Manager", th: "ผู้จัดการ" }, value: "manager" },
            {
              label: { en: "Student", th: "นักเรียน/นักศึกษา" },
              value: "student",
            },
            { label: { en: "Other", th: "อื่นๆ" }, value: "other" },
          ],
        },
        {
          type: "checkbox",
          question: {
            en: "Which topics interest you?",
            th: "หัวข้อใดที่คุณสนใจ?",
          },
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
              label: { en: "Web Development", th: "การพัฒนาเว็บ" },
              value: "web_dev",
            },
            {
              label: { en: "Mobile Development", th: "การพัฒนาแอปมือถือ" },
              value: "mobile_dev",
            },
            {
              label: { en: "Cloud Computing", th: "คลาวด์คอมพิวติ้ง" },
              value: "cloud",
            },
            {
              label: { en: "Cybersecurity", th: "ความปลอดภัยไซเบอร์" },
              value: "security",
            },
          ],
        },
        {
          type: "date",
          question: {
            en: "Preferred Workshop Date",
            th: "วันที่ต้องการเข้าร่วมเวิร์คช็อป",
          },
          required: true,
        },
      ],
    },
    {
      title: {
        en: "Product Feedback Form",
        th: "แบบฟอร์มความคิดเห็นผลิตภัณฑ์",
      },
      description: {
        en: "Share your thoughts about our new product",
        th: "แบ่งปันความคิดเห็นเกี่ยวกับผลิตภัณฑ์ใหม่ของเรา",
      },
      questions: [
        {
          type: "radio",
          question: {
            en: "Which product are you reviewing?",
            th: "คุณกำลังรีวิวผลิตภัณฑ์ใด?",
          },
          required: true,
          options: [
            {
              label: { en: "Product A", th: "ผลิตภัณฑ์ A" },
              value: "product_a",
            },
            {
              label: { en: "Product B", th: "ผลิตภัณฑ์ B" },
              value: "product_b",
            },
            {
              label: { en: "Product C", th: "ผลิตภัณฑ์ C" },
              value: "product_c",
            },
          ],
        },
        {
          type: "scale",
          question: {
            en: "Rate the product quality",
            th: "ให้คะแนนคุณภาพผลิตภัณฑ์",
          },
          required: true,
          settings: {
            scaleMin: 1,
            scaleMax: 5,
            scaleMinLabel: { en: "Poor", th: "แย่" },
            scaleMaxLabel: { en: "Excellent", th: "ยอดเยี่ยม" },
          },
        },
        {
          type: "file",
          question: {
            en: "Upload product photos (optional)",
            th: "อัปโหลดรูปผลิตภัณฑ์ (ไม่บังคับ)",
          },
          required: false,
          settings: {
            fileTypes: [".jpg", ".jpeg", ".png"],
          },
        },
      ],
    },
  ];

  for (let i = 0; i < surveyTemplates.length; i++) {
    const template = surveyTemplates[i];
    const survey = await prisma.survey.create({
      data: {
        id: faker.string.uuid(),
        title: template.title,
        description: template.description,
        slug: `survey-${i + 1}`,
        status: faker.helpers.arrayElement(["draft", "active", "closed"]),
        fields: {
          questions: template.questions.map((q, index) => ({
            id: faker.string.uuid(),
            ...q,
            order: index,
            options: q.options?.map((opt, i) => ({
              id: faker.string.uuid(),
              ...opt,
              order: i,
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
        createdById: faker.helpers.arrayElement([adminUser.id, editorUser.id]),
      },
    });
    surveys.push(survey);
  }

  console.log("✅ Surveys created");

  // Create survey responses
  for (const survey of surveys) {
    if (survey.status === "active") {
      const responseCount = faker.number.int({ min: 5, max: 15 });
      for (let i = 0; i < responseCount; i++) {
        const questions = (survey.fields as any)?.questions || [];
        const answers = questions.map((q: any) => {
          let value;
          switch (q.type) {
            case "text":
              value = faker.lorem.sentence();
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
            case "file":
              value = faker.system.fileName();
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
            respondentId: faker.helpers.arrayElement([viewerUser.id, null]),
            submittedAt: faker.date.recent(),
          },
        });
      }
    }
  }

  console.log("✅ Survey responses created");

  // Create pages with Page Builder content
  const pageTemplates: any[] = [
    {
      title: { en: "Home", th: "หน้าแรก" },
      slug: "home",
      content: {
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
                mediaItems.filter((m) => (m.metadata as any)?.type === "image"),
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
          {
            id: faker.string.uuid(),
            type: "gallery",
            content: {
              en: "Our Work",
              th: "ผลงานของเรา",
            },
            props: {
              images: faker.helpers.arrayElements(
                mediaItems
                  .filter((m) => (m.metadata as any)?.type === "image")
                  .map((m) => ({
                    id: m.id,
                    url: m.url,
                    alt: faker.lorem.words(3),
                  })),
                6,
              ),
              layout: "grid",
              columns: 3,
            },
          },
          {
            id: faker.string.uuid(),
            type: "form",
            content: {
              en: "Contact Us",
              th: "ติดต่อเรา",
            },
            props: {
              surveyId: faker.helpers.arrayElement(
                surveys.filter((s) => s.status === "active"),
              ).id,
            },
          },
        ],
      },
      isPublished: true,
    },
    {
      title: { en: "About Us", th: "เกี่ยวกับเรา" },
      slug: "about",
      content: {
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
              th: faker.lorem.paragraphs(3),
            },
            props: {},
          },
          {
            id: faker.string.uuid(),
            type: "video",
            content: {
              en: "Company Introduction",
              th: "แนะนำบริษัท",
            },
            props: {
              src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              type: "youtube",
            },
          },
          {
            id: faker.string.uuid(),
            type: "testimonials",
            content: {
              en: "What Our Clients Say",
              th: "ความคิดเห็นจากลูกค้า",
            },
            props: {
              testimonials: [
                {
                  name: faker.person.fullName(),
                  role: faker.person.jobTitle(),
                  content: faker.lorem.paragraph(),
                  avatar: faker.helpers.arrayElement(
                    mediaItems.filter(
                      (m) => (m.metadata as any)?.type === "image",
                    ),
                  ).url,
                },
                {
                  name: faker.person.fullName(),
                  role: faker.person.jobTitle(),
                  content: faker.lorem.paragraph(),
                  avatar: faker.helpers.arrayElement(
                    mediaItems.filter(
                      (m) => (m.metadata as any)?.type === "image",
                    ),
                  ).url,
                },
              ],
            },
          },
        ],
      },
      isPublished: true,
    },
    {
      title: { en: "Services", th: "บริการ" },
      slug: "services",
      content: {
        components: [
          {
            id: faker.string.uuid(),
            type: "heading",
            content: {
              en: "Our Services",
              th: "บริการของเรา",
            },
            props: {
              level: 1,
            },
          },
          {
            id: faker.string.uuid(),
            type: "cards",
            content: {
              en: "What We Offer",
              th: "สิ่งที่เรานำเสนอ",
            },
            props: {
              cards: [
                {
                  title: { en: "Web Development", th: "พัฒนาเว็บไซต์" },
                  description: {
                    en: "Custom web solutions",
                    th: "โซลูชันเว็บที่ปรับแต่งได้",
                  },
                  image: faker.helpers.arrayElement(
                    mediaItems.filter(
                      (m) => (m.metadata as any)?.type === "image",
                    ),
                  ).url,
                  link: "/services/web-development",
                },
                {
                  title: { en: "Mobile Apps", th: "แอปมือถือ" },
                  description: {
                    en: "iOS and Android apps",
                    th: "แอป iOS และ Android",
                  },
                  image: faker.helpers.arrayElement(
                    mediaItems.filter(
                      (m) => (m.metadata as any)?.type === "image",
                    ),
                  ).url,
                  link: "/services/mobile-apps",
                },
                {
                  title: { en: "Consulting", th: "ที่ปรึกษา" },
                  description: {
                    en: "Expert guidance",
                    th: "คำแนะนำจากผู้เชี่ยวชาญ",
                  },
                  image: faker.helpers.arrayElement(
                    mediaItems.filter(
                      (m) => (m.metadata as any)?.type === "image",
                    ),
                  ).url,
                  link: "/services/consulting",
                },
              ],
            },
          },
          {
            id: faker.string.uuid(),
            type: "pricing",
            content: {
              en: "Pricing Plans",
              th: "แผนราคา",
            },
            props: {
              plans: [
                {
                  name: { en: "Starter", th: "เริ่มต้น" },
                  price: "$99",
                  features: [
                    { en: "5 Projects", th: "5 โปรเจค" },
                    { en: "Basic Support", th: "การสนับสนุนพื้นฐาน" },
                    { en: "10GB Storage", th: "พื้นที่ 10GB" },
                  ],
                },
                {
                  name: { en: "Professional", th: "มืออาชีพ" },
                  price: "$299",
                  features: [
                    { en: "Unlimited Projects", th: "โปรเจคไม่จำกัด" },
                    { en: "Priority Support", th: "การสนับสนุนพิเศษ" },
                    { en: "100GB Storage", th: "พื้นที่ 100GB" },
                  ],
                  highlighted: true,
                },
                {
                  name: { en: "Enterprise", th: "องค์กร" },
                  price: "Custom",
                  features: [
                    { en: "Custom Solutions", th: "โซลูชันที่ปรับแต่งได้" },
                    { en: "Dedicated Support", th: "การสนับสนุนเฉพาะ" },
                    { en: "Unlimited Storage", th: "พื้นที่ไม่จำกัด" },
                  ],
                },
              ],
            },
          },
        ],
      },
      isPublished: true,
    },
    {
      title: { en: "Blog", th: "บล็อก" },
      slug: "blog",
      content: {
        components: [
          {
            id: faker.string.uuid(),
            type: "heading",
            content: {
              en: "Latest Blog Posts",
              th: "บทความล่าสุด",
            },
            props: {
              level: 1,
            },
          },
          {
            id: faker.string.uuid(),
            type: "blog-posts",
            content: {
              en: "Stay updated with our latest insights",
              th: "ติดตามข้อมูลเชิงลึกล่าสุดของเรา",
            },
            props: {
              posts: Array.from({ length: 6 }, () => ({
                id: faker.string.uuid(),
                title: faker.lorem.sentence(),
                excerpt: faker.lorem.paragraph(),
                author: faker.person.fullName(),
                date: faker.date.recent().toISOString(),
                image: faker.helpers.arrayElement(
                  mediaItems.filter(
                    (m) => (m.metadata as any)?.type === "image",
                  ),
                ).url,
                tags: faker.helpers.arrayElements(
                  [
                    "Technology",
                    "Design",
                    "Development",
                    "Business",
                    "Innovation",
                  ],
                  3,
                ),
              })),
              layout: "grid",
            },
          },
        ],
      },
      isPublished: true,
    },
  ];

  for (const template of pageTemplates) {
    await prisma.page.create({
      data: {
        id: faker.string.uuid(),
        title: JSON.stringify(template.title),
        slug: template.slug,
        components: template.content,
        status: template.isPublished ? "published" : "draft",
        publishedAt: template.isPublished ? new Date() : null,
        createdById: faker.helpers.arrayElement([adminUser.id, editorUser.id]),
        updatedById: faker.helpers.arrayElement([adminUser.id, editorUser.id]),
        language: "en",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Pages created");

  // Create navigation
  const mainNav = await prisma.menu.create({
    data: {
      id: faker.string.uuid(),
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
          label: { en: "Services", th: "บริการ" },
          url: "/services",
          order: 2,
          children: [
            {
              label: { en: "Web Development", th: "พัฒนาเว็บไซต์" },
              url: "/services/web-development",
              order: 0,
            },
            {
              label: { en: "Mobile Apps", th: "แอปมือถือ" },
              url: "/services/mobile-apps",
              order: 1,
            },
            {
              label: { en: "Consulting", th: "ที่ปรึกษา" },
              url: "/services/consulting",
              order: 2,
            },
          ],
        },
        {
          label: { en: "Blog", th: "บล็อก" },
          url: "/blog",
          order: 3,
        },
        {
          label: { en: "Contact", th: "ติดต่อ" },
          url: "/contact",
          order: 4,
        },
      ],
      createdById: adminUser.id,
    },
  });

  const footerNav = await prisma.menu.create({
    data: {
      name: "Footer Navigation",
      position: "footer",
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
        {
          label: { en: "FAQ", th: "คำถามที่พบบ่อย" },
          url: "/faq",
          order: 2,
        },
      ],
      createdById: adminUser.id,
    },
  });

  console.log("✅ Navigation created");

  // Create site settings
  const siteConfigs = [
    {
      id: "site-name",
      key: "site.name",
      value: { en: "Awesome CMS", th: "CMS สุดเจ๋ง" },
      type: "string",
      category: "general",
      description: "Site name",
    },
    {
      id: "site-tagline",
      key: "site.tagline",
      value: {
        en: "Your complete content management solution",
        th: "โซลูชันจัดการเนื้อหาที่สมบูรณ์",
      },
      type: "string",
      category: "general",
      description: "Site tagline",
    },
    {
      id: "site-logo",
      key: "site.logo",
      value: faker.helpers.arrayElement(
        mediaItems.filter((m) => (m.metadata as any)?.type === "image"),
      ).url,
      type: "string",
      category: "general",
      description: "Site logo URL",
    },
    {
      id: "site-favicon",
      key: "site.favicon",
      value: faker.helpers.arrayElement(
        mediaItems.filter((m) => (m.metadata as any)?.type === "image"),
      ).url,
      type: "string",
      category: "general",
      description: "Site favicon URL",
    },
    {
      id: "site-languages",
      key: "site.languages",
      value: {
        default: "en",
        supported: ["en", "th"],
      },
      type: "object",
      category: "general",
      description: "Site language settings",
    },
    {
      id: "site-timezone",
      key: "site.timezone",
      value: "Asia/Bangkok",
      type: "string",
      category: "general",
      description: "Site timezone",
    },
  ];

  for (const config of siteConfigs) {
    await prisma.systemConfig.create({ data: config });
  }

  // Contact settings
  const contactConfigs = [
    {
      id: "contact-email",
      key: "contact.email",
      value: faker.internet.email(),
      type: "string",
      category: "contact",
      description: "Contact email",
    },
    {
      id: "contact-phone",
      key: "contact.phone",
      value: faker.phone.number(),
      type: "string",
      category: "contact",
      description: "Contact phone",
    },
    {
      id: "contact-address",
      key: "contact.address",
      value: {
        en: faker.location.streetAddress(),
        th: faker.location.streetAddress(),
      },
      type: "object",
      category: "contact",
      description: "Contact address",
    },
    {
      id: "social-media",
      key: "social.media",
      value: {
        facebook: "https://facebook.com/awesomecms",
        twitter: "https://twitter.com/awesomecms",
        instagram: "https://instagram.com/awesomecms",
        linkedin: "https://linkedin.com/company/awesomecms",
      },
      type: "object",
      category: "contact",
      description: "Social media links",
    },
  ];

  for (const config of contactConfigs) {
    await prisma.systemConfig.create({ data: config });
  }

  // SEO settings
  const seoConfigs = [
    {
      id: "seo-meta-title",
      key: "seo.metaTitle",
      value: {
        en: "Awesome CMS - Content Management System",
        th: "Awesome CMS - ระบบจัดการเนื้อหา",
      },
      type: "object",
      category: "seo",
      description: "Default meta title",
    },
    {
      id: "seo-meta-description",
      key: "seo.metaDescription",
      value: {
        en: "The most powerful and flexible content management system for your business",
        th: "ระบบจัดการเนื้อหาที่ทรงพลังและยืดหยุ่นที่สุดสำหรับธุรกิจของคุณ",
      },
      type: "object",
      category: "seo",
      description: "Default meta description",
    },
    {
      id: "seo-meta-keywords",
      key: "seo.metaKeywords",
      value: ["cms", "content management", "website builder", "page builder"],
      type: "array",
      category: "seo",
      description: "Default meta keywords",
    },
    {
      id: "google-analytics",
      key: "analytics.google",
      value: "UA-123456789-1",
      type: "string",
      category: "seo",
      description: "Google Analytics ID",
    },
    {
      id: "facebook-pixel",
      key: "analytics.facebook",
      value: "1234567890",
      type: "string",
      category: "seo",
      description: "Facebook Pixel ID",
    },
  ];

  for (const config of seoConfigs) {
    await prisma.systemConfig.create({ data: config });
  }

  // Footer settings
  const footerConfigs = [
    {
      id: "footer-copyright",
      key: "footer.copyright",
      value: {
        en: "© 2024 Awesome CMS. All rights reserved.",
        th: "© 2024 Awesome CMS. สงวนลิขสิทธิ์",
      },
      type: "object",
      category: "footer",
      description: "Footer copyright text",
    },
    {
      id: "footer-show-social",
      key: "footer.showSocial",
      value: true,
      type: "boolean",
      category: "footer",
      description: "Show social links in footer",
    },
    {
      id: "footer-show-newsletter",
      key: "footer.showNewsletter",
      value: true,
      type: "boolean",
      category: "footer",
      description: "Show newsletter in footer",
    },
    {
      id: "footer-newsletter-title",
      key: "footer.newsletterTitle",
      value: {
        en: "Subscribe to our newsletter",
        th: "สมัครรับข่าวสาร",
      },
      type: "object",
      category: "footer",
      description: "Newsletter title",
    },
    {
      id: "footer-newsletter-description",
      key: "footer.newsletterDescription",
      value: {
        en: "Get the latest updates and news delivered to your inbox",
        th: "รับข่าวสารและอัปเดตล่าสุดส่งตรงถึงอีเมลของคุณ",
      },
      type: "object",
      category: "footer",
      description: "Newsletter description",
    },
  ];

  for (const config of footerConfigs) {
    await prisma.systemConfig.create({ data: config });
  }

  console.log("✅ Site settings created");

  console.log(`
🎉 Seed completed successfully!

You can now login with:
- Admin: admin@example.com / password123
- Editor: editor@example.com / password123
- Viewer: viewer@example.com / password123

Created:
- ${await prisma.user.count()} users
- ${await prisma.media.count()} media items
- ${await prisma.survey.count()} surveys
- ${await prisma.surveyResponse.count()} survey responses
- ${await prisma.page.count()} pages
- ${await prisma.menu.count()} navigation menus
- ${await prisma.systemConfig.count()} site settings
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

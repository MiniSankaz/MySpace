import { ComponentDefinition, ComponentType } from "../types";

export const componentDefinitions: Record<ComponentType, ComponentDefinition> =
  {
    text: {
      type: "text",
      label: { th: "ข้อความ", en: "Text" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
      defaultContent: { th: "ข้อความตัวอย่าง", en: "Sample text" },
      defaultSettings: {
        padding: { top: "1rem", bottom: "1rem" },
      },
      configurable: true,
    },
    heading: {
      type: "heading",
      label: { th: "หัวข้อ", en: "Heading" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M6 15h14"></path></svg>',
      defaultContent: { th: "หัวข้อ", en: "Heading" },
      defaultSettings: {
        padding: { top: "1.5rem", bottom: "1rem" },
      },
      configurable: true,
    },
    image: {
      type: "image",
      label: { th: "รูปภาพ", en: "Image" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>',
      defaultContent: {
        src: "https://via.placeholder.com/600x400",
        alt: { th: "รูปภาพตัวอย่าง", en: "Sample image" },
      },
      defaultSettings: {
        width: "100%",
        height: "auto",
        objectFit: "cover",
      },
      configurable: true,
    },
    video: {
      type: "video",
      label: { th: "วิดีโอ", en: "Video" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
      defaultContent: {
        src: "",
        type: "youtube",
      },
      defaultSettings: {
        width: "100%",
        aspectRatio: "16:9",
      },
      configurable: true,
    },
    gallery: {
      type: "gallery",
      label: { th: "แกลเลอรี", en: "Gallery" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',
      defaultContent: {
        images: [],
        layout: "grid",
      },
      defaultSettings: {
        columns: 3,
        gap: "1rem",
      },
      configurable: true,
    },
    form: {
      type: "form",
      label: { th: "ฟอร์ม", en: "Form" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
      defaultContent: {
        formId: "",
      },
      defaultSettings: {},
      configurable: true,
    },
    button: {
      type: "button",
      label: { th: "ปุ่ม", en: "Button" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"></path></svg>',
      defaultContent: { th: "คลิกที่นี่", en: "Click here" },
      defaultSettings: {
        href: "#",
        variant: "primary",
        size: "md",
      },
      configurable: true,
    },
    spacer: {
      type: "spacer",
      label: { th: "ช่องว่าง", en: "Spacer" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>',
      defaultContent: null,
      defaultSettings: {
        height: "2rem",
      },
      configurable: true,
    },
    divider: {
      type: "divider",
      label: { th: "เส้นแบ่ง", en: "Divider" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>',
      defaultContent: null,
      defaultSettings: {
        margin: { top: "1rem", bottom: "1rem" },
        borderColor: "#e5e7eb",
        borderWidth: "1px",
      },
      configurable: true,
    },
    html: {
      type: "html",
      label: { th: "HTML", en: "HTML" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>',
      defaultContent: "<div>Custom HTML</div>",
      defaultSettings: {},
      configurable: true,
    },
    embed: {
      type: "embed",
      label: { th: "ฝังโค้ด", en: "Embed" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"></path></svg>',
      defaultContent: "",
      defaultSettings: {
        height: "400px",
      },
      configurable: true,
    },
    accordion: {
      type: "accordion",
      label: { th: "แอคคอร์เดียน", en: "Accordion" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>',
      defaultContent: {
        items: [],
      },
      defaultSettings: {
        allowMultiple: false,
      },
      configurable: true,
    },
    tabs: {
      type: "tabs",
      label: { th: "แท็บ", en: "Tabs" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>',
      defaultContent: {
        tabs: [],
      },
      defaultSettings: {},
      configurable: true,
    },
    map: {
      type: "map",
      label: { th: "แผนที่", en: "Map" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>',
      defaultContent: {
        lat: 13.7563,
        lng: 100.5018,
        zoom: 15,
      },
      defaultSettings: {
        height: "400px",
      },
      configurable: true,
    },
    social: {
      type: "social",
      label: { th: "โซเชียล", en: "Social" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"></path></svg>',
      defaultContent: {
        platform: "facebook",
        url: "",
      },
      defaultSettings: {},
      configurable: true,
    },
    newsletter: {
      type: "newsletter",
      label: { th: "สมัครรับข่าวสาร", en: "Newsletter" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>',
      defaultContent: {
        title: { th: "สมัครรับข่าวสาร", en: "Subscribe to Newsletter" },
        description: {
          th: "รับข่าวสารและโปรโมชั่นล่าสุด",
          en: "Get latest news and promotions",
        },
      },
      defaultSettings: {},
      configurable: true,
    },
    menu: {
      type: "menu",
      label: { th: "เมนู", en: "Menu" },
      icon: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>',
      defaultContent: {
        menuCode: "",
      },
      defaultSettings: {
        style: "horizontal",
      },
      configurable: true,
    },
  };

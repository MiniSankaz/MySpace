import { useState, useEffect } from "react";

interface FooterSettings {
  logo: {
    type: "text" | "image";
    text: { en: string; th: string };
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
  };
  description: { en: string; th: string };
  mainMenu: {
    title: { en: string; th: string };
    links: Array<{
      id: string;
      label: { en: string; th: string };
      url: string;
      order: number;
    }>;
  };
  socialLinks: Array<{
    id: string;
    platform: string;
    url: string;
    icon: string;
    order: number;
  }>;
  policies: {
    title: { en: string; th: string };
    links: Array<{
      id: string;
      label: { en: string; th: string };
      url: string;
      order: number;
    }>;
  };
  newsletter: {
    enabled: boolean;
    title: { en: string; th: string };
    description: { en: string; th: string };
    placeholder: {
      email: { en: string; th: string };
      name: { en: string; th: string };
    };
    buttonText: { en: string; th: string };
    privacyText: { en: string; th: string };
  };
  copyright: {
    text: { en: string; th: string };
    year: string;
    showYear: boolean;
  };
}

const defaultSettings: FooterSettings = {
  logo: {
    type: "text",
    text: { en: "CMS", th: "CMS" },
    image: "",
    imageWidth: 120,
    imageHeight: 60,
  },
  description: {
    en: "Your trusted content management system",
    th: "ระบบจัดการเนื้อหาเว็บไซต์ที่เชื่อถือได้",
  },
  mainMenu: {
    title: { en: "Quick Links", th: "เมนูหลัก" },
    links: [
      { id: "1", label: { en: "Home", th: "หน้าแรก" }, url: "/", order: 1 },
      { id: "2", label: { en: "Blog", th: "บล็อก" }, url: "/blog", order: 2 },
      {
        id: "3",
        label: { en: "About", th: "เกี่ยวกับเรา" },
        url: "/about",
        order: 3,
      },
      {
        id: "4",
        label: { en: "Contact", th: "ติดต่อเรา" },
        url: "/contact",
        order: 4,
      },
    ],
  },
  socialLinks: [
    {
      id: "1",
      platform: "Facebook",
      url: "https://facebook.com",
      icon: "facebook",
      order: 1,
    },
    {
      id: "2",
      platform: "Twitter",
      url: "https://twitter.com",
      icon: "twitter",
      order: 2,
    },
    {
      id: "3",
      platform: "LinkedIn",
      url: "https://linkedin.com",
      icon: "linkedin",
      order: 3,
    },
    {
      id: "4",
      platform: "Instagram",
      url: "https://instagram.com",
      icon: "instagram",
      order: 4,
    },
  ],
  policies: {
    title: { en: "Legal", th: "นโยบาย" },
    links: [
      {
        id: "1",
        label: { en: "Privacy Policy", th: "นโยบายความเป็นส่วนตัว" },
        url: "/p/privacy",
        order: 1,
      },
      {
        id: "2",
        label: { en: "Terms of Service", th: "ข้อกำหนดการใช้งาน" },
        url: "/p/terms",
        order: 2,
      },
      {
        id: "3",
        label: { en: "Cookie Policy", th: "นโยบายคุกกี้" },
        url: "/p/cookies",
        order: 3,
      },
    ],
  },
  newsletter: {
    enabled: true,
    title: { en: "Stay Updated", th: "รับข่าวสารใหม่" },
    description: {
      en: "Subscribe to our newsletter for the latest updates",
      th: "สมัครรับข่าวสารเพื่อติดตามข้อมูลใหม่ล่าสุด",
    },
    placeholder: {
      email: { en: "Enter your email", th: "กรอกอีเมลของคุณ" },
      name: { en: "Your name (optional)", th: "ชื่อของคุณ (ไม่บังคับ)" },
    },
    buttonText: { en: "Subscribe", th: "สมัครรับข่าวสาร" },
    privacyText: {
      en: "We respect your privacy. Unsubscribe at any time.",
      th: "เราเคารพความเป็นส่วนตัวของคุณ สามารถยกเลิกได้ทุกเมื่อ",
    },
  },
  copyright: {
    text: { en: "© CMS. All rights reserved.", th: "© CMS สงวนลิขสิทธิ์" },
    year: new Date().getFullYear().toString(),
    showYear: true,
  },
};

export function useFooterSettings() {
  const [settings, setSettings] = useState<FooterSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/system-config?key=footer");
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          setSettings(data.data[0].value as FooterSettings);
        }
      }
    } catch (error) {
      console.error("Failed to fetch footer settings:", error);
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading };
}

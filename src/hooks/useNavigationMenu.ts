import { useState, useEffect } from "react";

interface MenuItem {
  id: string;
  label: string | { en: string; th: string };
  url: string;
  type: "internal" | "external" | "page" | "category" | "custom";
  target: "_self" | "_blank";
  parentId?: string | null;
  icon?: string;
  order: number;
}

export function useNavigationMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu/items");
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Build hierarchical menu structure
  const buildMenuTree = (items: MenuItem[]): MenuItem[] => {
    const itemMap = new Map<string, MenuItem & { children?: MenuItem[] }>();
    const rootItems: MenuItem[] = [];

    // First pass: create a map of all items
    items.forEach((item) => {
      itemMap.set(item.id, { ...item });
    });

    // Second pass: build the tree
    items.forEach((item) => {
      if (item.parentId && itemMap.has(item.parentId)) {
        const parent = itemMap.get(item.parentId)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(itemMap.get(item.id)!);
      } else {
        rootItems.push(itemMap.get(item.id)!);
      }
    });

    return rootItems.sort((a, b) => a.order - b.order);
  };

  return {
    menuItems: buildMenuTree(menuItems),
    loading,
  };
}

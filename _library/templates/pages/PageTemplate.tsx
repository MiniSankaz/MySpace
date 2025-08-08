import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Title | CMS",
  description: "Page description",
};

interface PageProps {
  params?: { [key: string]: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function PageTemplate({ params, searchParams }: PageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">Page Title</h1>
      <div>{/* Page content here */}</div>
    </div>
  );
}

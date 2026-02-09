import Link from "next/link";

export default function AdminPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Admin Tools</h1>
      <ul className="list-disc pl-6">
        <li><Link href="/admin/data-integrity" className="text-blue-300">Data integrity + table coverage workspace</Link></li>
      </ul>
    </section>
  );
}

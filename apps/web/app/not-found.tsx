import Link from "next/link";

export default function NotFound() {
  return (
    <div className="lab-page max-w-3xl mx-auto px-6 py-24 text-center">
      <p className="font-display text-8xl leading-[0.8] text-blood sm:text-[144px]">404</p>
      <p className="brutal-tag mt-2">unknown selector</p>
      <p className="mt-6 max-w-md mx-auto text-sm">
        This page does not exist in the catalog. Maybe try the{" "}
        <Link href="/errors" className="brutal-link">error encyclopedia</Link>{" "}
        or the <Link href="/" className="brutal-link">paste box</Link>.
      </p>
    </div>
  );
}

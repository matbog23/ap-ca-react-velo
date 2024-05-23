import Link from "next/link";
import headerStyles from "@/styles/Header.module.css";

export default function Layout({ children }) {
  return (
    <div className="header">
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <main>{children}</main>
    </div>
  );
}

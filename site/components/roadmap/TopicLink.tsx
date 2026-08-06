"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { authEnabled } from "@/lib/supabase";
import { LockedNode } from "@/components/auth/SignInGate";

/**
 * Mavzu tuguni qobig'i. Ochiq mavzu — oddiy havola; yopig'i — kirish
 * oynasini ochadigan tugma. Ko'rinishi bir xil bo'lib qolsin deb `className`
 * ikkalasiga ham beriladi.
 */
export function TopicLink({
  href,
  locked,
  title,
  className,
  lockedClassName = "",
  lockSlot,
  children,
}: {
  href: string;
  locked: boolean;
  title: string;
  className: string;
  /** Qulflangan holatda qo'shiladigan sinflar — so'nish uchun. */
  lockedClassName?: string;
  /** Qulf belgisi; faqat yopiq holatda chiziladi. */
  lockSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const user = useAuth((s) => s.user);
  const shut = authEnabled && locked && !user;

  if (shut) {
    return (
      <LockedNode title={title} className={`${className} ${lockedClassName} text-left`}>
        {children}
        {lockSlot}
      </LockedNode>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

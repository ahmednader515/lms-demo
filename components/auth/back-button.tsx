import Link from "next/link";

interface BackButtonProps {
  href: string;
  label: string;
}

export const BackButton = ({
  href,
  label,
}: BackButtonProps) => {
  return (
    <Link
      href={href}
      className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      {label}
    </Link>
  );
}; 
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full text-black drop-shadow-[0_0_1px_rgba(0,0,0,1)]"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M8 0C3.58172 0 0 3.58172 0 8V32C0 36.4183 3.58172 40 8 40H32C36.4183 40 40 36.4183 40 32V8C40 3.58172 36.4183 0 32 0H8ZM16 13H24C25.6569 13 27 14.3431 27 16V24C27 25.6569 25.6569 27 24 27H16C14.3431 27 13 25.6569 13 24V16C13 14.3431 14.3431 13 16 13Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

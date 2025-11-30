import Image from "next/image";
import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className="cursor-pointer">
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="w-11 h-10 bg-[#1885C4] rounded-lg flex items-center justify-center">
          <Image src="/logo.svg" alt="AirSense Logo" width={22} height={18} />
        </div>
        <span className="text-xl font-semibold text-black">AirSense</span>
      </div>
    </Link>
  );
}

import Image from "next/image";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-11 h-10 bg-[#BCF4A8] rounded-lg flex items-center justify-center">
        <Image
          src="/logo.svg"
          alt="AirSense Logo"
          width={22}
          height={18}
          priority
        />
      </div>
      <span className="text-xl font-semibold text-black">AirSense</span>
    </div>
  );
}

import Image from "next/image";
import type { QualityLevel } from "@/lib/types";

interface QualityIconProps {
  level: QualityLevel;
  variant?: "outline" | "filled";
}

export function QualityIcon({ level, variant = "outline" }: QualityIconProps) {
  const iconMap = {
    good: variant === "filled" ? "/smile-with-fill.svg" : "/smile-non-fill.svg",
    moderate:
      variant === "filled"
        ? "/moderate-with-fill.svg"
        : "/moderate-non-fill.svg",
    poor: variant === "filled" ? "/poor-with-fill.svg" : "/poor-non-fill.svg",
  };

  const icon = iconMap[level];

  return (
    <Image
      src={icon}
      alt={`${level} air quality`}
      width={24}
      height={24}
      className="inline-block"
      unoptimized
      key={`${level}-${variant}`}
    />
  );
}

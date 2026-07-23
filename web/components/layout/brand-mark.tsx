import { Zap } from "lucide-react";

export function BrandMark({ size = "default" }: { size?: "default" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className={lg ? "flex flex-col items-center gap-2" : "flex items-center gap-2"}>
      <span
        className={
          (lg ? "size-10" : "size-6") +
          " flex items-center justify-center rounded-md bg-primary text-primary-foreground"
        }
      >
        <Zap size={lg ? 22 : 14} fill="currentColor" />
      </span>
      <span className={lg ? "text-xl font-semibold" : "text-lg font-semibold"}>NovaCRM</span>
    </div>
  );
}

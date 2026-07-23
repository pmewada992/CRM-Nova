import { SignUp } from "@clerk/nextjs";
import { BrandMark } from "@/components/layout/brand-mark";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30">
      <BrandMark size="lg" />
      <SignUp />
    </div>
  );
}

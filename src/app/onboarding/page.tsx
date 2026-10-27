import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/guards";
import { OnboardingForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Choisis ton surnom" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.nickname) redirect("/account");
  return (
    <div className="mx-auto max-w-md">
      <div className="panel space-y-5">
        <div className="text-center">
          <h1 className="heading text-4xl text-gold-gradient">Bienvenue !</h1>
          <p className="text-white/60">Choisis le surnom qui apparaîtra sur ta carte FUT. Il doit être unique.</p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}

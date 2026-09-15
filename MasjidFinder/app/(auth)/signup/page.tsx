import SignupWizard from "./SignupWizard";

export const metadata = { title: "Sign Up — MasjidFinder" };

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-sand-50 py-8">
      <SignupWizard />
    </main>
  );
}

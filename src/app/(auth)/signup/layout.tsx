import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account - Start Building Payslip Templates | Vello",
  description:
    "Sign up for Vello to start designing custom payslip templates for free. Professional HR document generation with drag-and-drop template builder.",
  openGraph: {
    title: "Create Account - Start Building Payslip Templates | Vello",
    description:
      "Sign up for free and start designing custom payslip templates with our drag-and-drop builder.",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

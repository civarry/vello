import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In to Vello - HR Payslip Template Builder",
  description:
    "Sign in to your Vello account to access the payslip template builder, manage employee payroll data, and generate professional HR documents.",
  openGraph: {
    title: "Sign In to Vello - HR Payslip Template Builder",
    description:
      "Sign in to access your payslip templates and HR document generator.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

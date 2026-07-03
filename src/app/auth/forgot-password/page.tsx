import { Metadata } from "next";
import { AuthForm } from "@/components/marketing/auth-form";
export const metadata: Metadata = { title: "Reset password" };
export default function ForgotPage() { return <AuthForm mode="forgot" />; }

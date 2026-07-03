import { Metadata } from "next";
import { AuthForm } from "@/components/marketing/auth-form";
export const metadata: Metadata = { title: "Create your account" };
export default function SignupPage() { return <AuthForm mode="signup" />; }

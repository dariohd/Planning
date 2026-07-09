import { demoLoginEnabled } from "@/auth";
import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return <LoginClient demoLoginEnabled={demoLoginEnabled} googleLoginEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)} />;
}

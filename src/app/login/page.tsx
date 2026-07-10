import { demoLoginEnabled } from "@/auth";
import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  const credentialsFormEnabled =
    demoLoginEnabled ||
    process.env.ALLOW_DEV_LOGIN === "true" ||
    Boolean(process.env.DEMO_USERNAME && process.env.DEMO_PASSWORD);

  return (
    <LoginClient
      credentialsFormEnabled={credentialsFormEnabled}
      demoLoginEnabled={demoLoginEnabled}
      googleLoginEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)}
    />
  );
}

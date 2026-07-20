import Script from "next/script";

const siteKey = process.env.NEXT_PUBLIC_BULLE_SITE_KEY;

export function BulleWidget() {
  if (!siteKey) return null;

  return (
    <Script
      src="https://bullechatbot.vercel.app/widget/bulle.js"
      data-site-key={siteKey}
      data-proxy="same-origin"
      data-primary-color="#00205b"
      strategy="lazyOnload"
    />
  );
}

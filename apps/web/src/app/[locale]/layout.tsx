import { NextIntlClientProvider } from "next-intl";
import { Noto_Serif_Devanagari, Tiro_Bangla } from "next/font/google";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Footer } from "@/components/public/common/footer";
import { LocaleDigitLocalizer } from "@/components/public/common/locale-digit-localizer";
import { MainHeader } from "@/components/public/common/main-header";
import { ScrollAnimations } from "@/components/public/common/scroll-animations";
import { UtilityBar } from "@/components/public/common/utility-bar";
import { Providers } from "@/components/providers";
import { locales } from "@/i18n/locales";
import { getSiteContent } from "@/content";

const tiroBangla = Tiro_Bangla({
  display: "swap",
  preload: false,
  subsets: ["bengali"],
  variable: "--font-tiro-bangla",
  weight: "400",
});

const notoSerifDevanagari = Noto_Serif_Devanagari({
  display: "swap",
  preload: false,
  subsets: ["devanagari"],
  variable: "--font-noto-serif-devanagari",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const content = getSiteContent(locale);
  const seoData = content.seo;

  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    alternates: {
      languages: { en: "/en", bn: "/bn", hi: "/hi", "x-default": "/en" },
    },
    openGraph: {
      type: "website",
      locale,
      title: seoData.title,
      description: seoData.description,
      images: [
        {
          url: seoData.ogImage,
          width: 1200,
          height: 630,
          alt: seoData.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoData.title,
      description: seoData.description,
      images: [seoData.ogImage],
    },
  };
}
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  const localeFontClass =
    locale === "bn"
      ? tiroBangla.variable
      : locale === "hi"
        ? notoSerifDevanagari.variable
        : "";
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>
        <LocaleDigitLocalizer className={localeFontClass} locale={locale}>
          <ScrollAnimations>
            <UtilityBar />
            <MainHeader />
            <main id="main-content">{children}</main>
            <Footer locale={locale} />
          </ScrollAnimations>
        </LocaleDigitLocalizer>
      </Providers>
    </NextIntlClientProvider>
  );
}

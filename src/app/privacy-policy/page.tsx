import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "kompres.web.id processes every image locally in your browser. No files are uploaded, processed, or stored on any server.",
  alternates: {
    canonical: "/privacy-policy",
  },
};

const LAST_UPDATED = "August 16, 2026";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md px-2 py-1 -mx-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to kompres<span className="text-foreground">.web.id</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-xs text-muted-foreground">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5">
          <p className="text-sm leading-relaxed">
            <strong className="text-foreground">The short version:</strong>{" "}
            your images never leave your device. All compression and conversion
            happens inside your browser, on your own hardware. We have no
            upload endpoint, no server-side processing, and no server-side
            storage for image files. The only data that ever reaches our
            infrastructure is anonymous, page-level analytics (see{" "}
            <a href="#analytics" className="underline underline-offset-2 hover:text-foreground">
              Analytics
            </a>
            ).
          </p>
        </div>

        <div className="mt-10 space-y-10">
          <Section id="how-it-works" title="How the app works">
            <p>
              kompres.web.id is a static web application. When you add images
              to the app, the following happens — entirely on your device:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                <span className="text-foreground font-medium">Opening files.</span>{" "}
                The files you select or drop are read by JavaScript directly
                from your local disk, using the browser&apos;s standard File
                API. They are loaded into your tab&apos;s memory as{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">Blob</code>{" "}
                objects.
              </li>
              <li>
                <span className="text-foreground font-medium">Decoding.</span>{" "}
                Images are decoded in your browser: common raster formats
                (PNG, JPG, WebP, BMP, GIF, AVIF) through the browser&apos;s
                built-in Canvas API, TIFF through the open-source{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">utif</code>{" "}
                library, HEIC through{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">heic2any</code>,
                and SVG/ICO via in-browser rasterization. All of these run as
                JavaScript inside your tab.
              </li>
              <li>
                <span className="text-foreground font-medium">
                  Compressing &amp; converting.
                </span>{" "}
                Output files are produced by encoding the decoded pixels back
                to your chosen format — again via the Canvas API and bundled
                JavaScript encoders (including hand-written BMP and ICO
                encoders). No request is made anywhere during this step.
              </li>
              <li>
                <span className="text-foreground font-medium">Storing.</span>{" "}
                Your files are kept in{" "}
                <strong className="text-foreground">IndexedDB</strong>, a
                storage area inside your own browser (database name{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  image-compressor-db
                </code>
                ), so your library survives a page reload. This is device-local
                storage, not a server.
              </li>
              <li>
                <span className="text-foreground font-medium">Downloading.</span>{" "}
                Downloaded files and ZIP archives are assembled in memory by
                your browser and saved straight to your device.
              </li>
            </ol>
          </Section>

          <Section id="no-uploads" title="No uploads, no server-side processing">
            <p>
              There is no code path that transmits image data over the
              network. The application contains no upload form, no file
              endpoint, and no network calls that carry file bytes — you can
              verify this yourself: open your browser&apos;s developer tools,
              watch the <em>Network</em> tab, and process an image. You will
              see no request containing your file.
            </p>
            <p>
              Compression quality and speed are bounded by your own device —
              which is exactly the point: the work happens on your hardware,
              not ours.
            </p>
          </Section>

          <Section id="no-server-storage" title="No server-side storage of your files">
            <p>
              Because files are never uploaded, they cannot be stored on our
              servers. The only place your images exist is:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>your device&apos;s file system (the originals you picked), and</li>
              <li>
                your browser&apos;s local IndexedDB storage for the copies you
                added to the app.
              </li>
            </ul>
            <p>
              To remove them, use the delete button on any file card, or
              &ldquo;Clear cache&rdquo; in the header to wipe everything at
              once. Clearing the site&apos;s data in your browser settings
              (often labelled &ldquo;cookies and site data&rdquo;) removes the
              entire database just as completely.
            </p>
          </Section>

          <Section id="analytics" title="Analytics">
            <p>
              This site uses a self-hosted Matomo instance to understand
              aggregate usage — for example, that a page was visited and from
              which country the page was requested. Matomo receives standard
              technical request data (such as your IP-derived, anonymized
              location and browser user agent) and may set a first-party
              cookie for visit deduplication.
            </p>
            <p>
              Analytics never has access to your images, file names, or any
              content you process, because none of it is ever transmitted. If
              you prefer not to be counted, a browser extension or setting
              that blocks tracking scripts will prevent it entirely — the
              compressor keeps working either way.
            </p>
          </Section>

          <Section id="never-collected" title="What we never collect">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Your image files, in whole or in part</li>
              <li>File names or metadata of the images you process</li>
              <li>Accounts — the app has no sign-up and no user accounts</li>
              <li>Personal information of any kind — the app has no forms that collect it</li>
            </ul>
          </Section>

          <Section id="third-party" title="Third parties">
            <p>
              No third party processes, receives, or stores your images —
              there is nothing to send them. The fonts and code that make up
              the app are served from this site itself, not from a
              third-party CDN. The only external service involved in running
              the site is the Matomo analytics described above.
            </p>
          </Section>

          <Section id="changes" title="Changes to this policy">
            <p>
              If the app&apos;s behavior ever changes in a way that affects
              privacy, this page will be updated and the &ldquo;last
              updated&rdquo; date above revised. The core promise is not
              expected to change: image processing on this site stays
              client-side.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to the compressor
          </Link>
        </div>
      </main>

      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground">
          kompres.web.id · All processing happens locally in your browser.
        </div>
      </footer>
    </div>
  );
}

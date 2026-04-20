import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { logFrontendError, extractErrorMessage } from "@/utils/log-frontend-error";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Upperhand Dashboard" },
      { name: "description", content: "Upper Hand Portal is a web app for hair transplant clinics to acquire new patients." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Upperhand Dashboard" },
      { property: "og:description", content: "Upper Hand Portal is a web app for hair transplant clinics to acquire new patients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Upperhand Dashboard" },
      { name: "twitter:description", content: "Upper Hand Portal is a web app for hair transplant clinics to acquire new patients." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b3623e69-825b-4ea0-9f1e-954fb164b4b2/id-preview-d5f0506f--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app-1776646147165.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b3623e69-825b-4ea0-9f1e-954fb164b4b2/id-preview-d5f0506f--1d2b5d82-7b6e-4a9c-9899-a64f78717875.lovable.app-1776646147165.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onError = (event: ErrorEvent) => {
      const msg = event.message || extractErrorMessage(event.error, "Uncaught error");
      // Filter noisy ResizeObserver / extension warnings
      if (/ResizeObserver loop/i.test(msg)) return;
      void logFrontendError("window.error", `Uncaught browser error: ${msg}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error instanceof Error ? event.error.stack : null,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = extractErrorMessage(reason, "Unhandled promise rejection");
      void logFrontendError("window.unhandledrejection", `Unhandled promise rejection: ${msg}`, {
        rawReason: reason instanceof Error
          ? { name: reason.name, message: reason.message, stack: reason.stack }
          : (() => { try { return JSON.parse(JSON.stringify(reason)); } catch { return String(reason); } })(),
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return <Outlet />;
}

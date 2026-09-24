import { developerCredit } from "@/data/developer-credit";

type AdminFooterProps = {
  brandName: string;
  appVersion: string;
};

/**
 * Compact chrome footer — company from developer-credit.json only.
 * Theme gradient (sidebar surface → deeper tones), right → left.
 */
export function AdminFooter({ brandName, appVersion }: AdminFooterProps) {
  const year = new Date().getFullYear();
  const { company } = developerCredit;

  return (
    <footer className="admin-chrome-footer" aria-label="Admin platform footer">
      <div className="admin-chrome-footer__inner">
        <p className="admin-chrome-footer__line">
          <span>Platform template v{appVersion}</span>
          <span className="admin-chrome-footer__dot" aria-hidden>
            ·
          </span>
          <span>Built for {brandName}</span>
        </p>
        <p className="admin-chrome-footer__line admin-chrome-footer__line--end">
          <span>{company}</span>
          <span className="admin-chrome-footer__dot" aria-hidden>
            ·
          </span>
          <span>© {year}</span>
        </p>
      </div>
    </footer>
  );
}

import type { ReactNode } from "react";
import type { AppPath } from "../useAppPath.ts";
import { ActionButton } from "../components/ActionButton.tsx";

type Props = {
  title: string;
  navigate: (to: AppPath) => void;
  children: ReactNode;
};

export function LegalShell({ title, navigate, children }: Props) {
  return (
    <div className="layout-root">
      <header className="app-header legal-header">
        <div className="app-header__brand">
          <geraldo-text variant="h2-page" weight="medium" as="h1">
            {title}
          </geraldo-text>
          <geraldo-text variant="caption" as="p">
            Painel da loja · aiqfome
          </geraldo-text>
        </div>
        <div className="app-header__actions">
          <ActionButton variant="outline" color="primary" type="button" onClick={() => navigate("/")}>
            Voltar ao painel
          </ActionButton>
        </div>
      </header>

      <main className="app-main legal-main">
        <article className="legal-article">{children}</article>
      </main>

      <footer className="app-footer legal-footer">
        <nav className="legal-footer-nav" aria-label="Documentos legais">
          <ActionButton variant="ghost" color="primary" type="button" size="sm" onClick={() => navigate("/termos")}>
            Termos de uso
          </ActionButton>
          <span className="legal-footer-sep" aria-hidden>
            ·
          </span>
          <ActionButton
            variant="ghost"
            color="primary"
            type="button"
            size="sm"
            onClick={() => navigate("/privacidade")}
          >
            Política de privacidade
          </ActionButton>
        </nav>
        <geraldo-text variant="caption" as="p" className="legal-footer-note">
          Geraldo UI · aiqfome
        </geraldo-text>
      </footer>
    </div>
  );
}

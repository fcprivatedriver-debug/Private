"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  ACCENT_CANDIDATES,
  BRAND_INK,
  HERO_VERSIONS,
  OVERLAY_CANDIDATES,
  type AccentCandidateId,
  type HeroVersionId,
} from "@/config/brand";

type Labels = {
  title: string;
  lead: string;
  note: string;
  versionsTitle: string;
  colorTitle: string;
  overlayTitle: string;
  previewTitle: string;
  selectionTitle: string;
  copyLine1: string;
  copyLine2: string;
  ctaPrimary: string;
  ctaSecondary: string;
  preferred: string;
  notLocked: string;
  textSide: string;
  photoSide: string;
};

function EditorialHeroPreview({
  photoSrc,
  accent,
  overlay,
  labels,
  versionLabel,
}: {
  photoSrc: string;
  accent: string;
  overlay: number;
  labels: Labels;
  versionLabel: string;
}) {
  const style = {
    "--lab-accent": accent,
    "--lab-overlay": String(overlay),
  } as CSSProperties;

  return (
    <article className="editorial-hero" style={style}>
      <p className="editorial-hero-label">{versionLabel}</p>
      <div className="editorial-hero-split">
        <div className="editorial-hero-copy-col">
          <p className="lab-hero-eyebrow">{labels.textSide}</p>
          <h3 className="lab-hero-brand" aria-label="ZRIK">
            <span style={{ color: "var(--lab-accent)" }}>Z</span>
            <span style={{ color: BRAND_INK }}>RIK</span>
          </h3>
          <p className="lab-hero-copy">
            <span className="hero-copy-line">{labels.copyLine1}</span>
            <span className="hero-copy-line">{labels.copyLine2}</span>
          </p>
          <div className="lab-hero-ctas">
            <span className="btn btn-primary lab-btn-primary">{labels.ctaPrimary}</span>
            <span className="btn btn-secondary lab-btn-secondary">{labels.ctaSecondary}</span>
          </div>
        </div>

        <div className="editorial-hero-photo-col" aria-label={labels.photoSide}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoSrc} alt="" className="editorial-hero-photo" />
          <div className="editorial-hero-veil" aria-hidden />
        </div>
      </div>
    </article>
  );
}

export function HomepageLab({ locale, labels }: { locale: string; labels: Labels }) {
  const isPt = locale.startsWith("pt");
  const [versionId, setVersionId] = useState<HeroVersionId>("V3");
  const [colorId, setColorId] = useState<AccentCandidateId>("C1");
  const [overlayId, setOverlayId] = useState<(typeof OVERLAY_CANDIDATES)[number]["id"]>("O55");

  const version = HERO_VERSIONS.find((v) => v.id === versionId)!;
  const color = ACCENT_CANDIDATES.find((c) => c.id === colorId)!;
  const overlay = OVERLAY_CANDIDATES.find((o) => o.id === overlayId)!;

  const featuredStyle = useMemo(
    () =>
      ({
        "--lab-accent": color.hex,
        "--lab-overlay": String(overlay.value),
      }) as CSSProperties,
    [color.hex, overlay.value],
  );

  return (
    <div className="homepage-lab">
      <header className="branding-preview-intro">
        <h1 className="page-title">{labels.title}</h1>
        <p className="page-lead">{labels.lead}</p>
        <p className="lab-note">{labels.note}</p>
      </header>

      <div className="lab-controls">
        <section className="lab-panel">
          <h2 className="lab-panel-title">{labels.versionsTitle}</h2>
          <div className="lab-option-grid lab-option-grid-3">
            {HERO_VERSIONS.map((v) => {
              const active = v.id === versionId;
              return (
                <button
                  key={v.id}
                  type="button"
                  className={active ? "lab-option is-active" : "lab-option"}
                  onClick={() => setVersionId(v.id)}
                  aria-pressed={active}
                >
                  <span
                    className="lab-option-thumb"
                    style={{ backgroundImage: `url(${v.src})` }}
                  />
                  <span className="lab-option-body">
                    <strong>{isPt ? v.titlePt : v.title}</strong>
                    <span className="muted">{isPt ? v.descPt : v.desc}</span>
                    <span className="lab-mood">{isPt ? v.moodPt : v.mood}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lab-panel">
          <h2 className="lab-panel-title">{labels.colorTitle}</h2>
          <div className="lab-option-grid lab-option-grid-3">
            {ACCENT_CANDIDATES.map((c) => {
              const active = c.id === colorId;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={active ? "lab-option lab-color is-active" : "lab-option lab-color"}
                  onClick={() => setColorId(c.id)}
                  aria-pressed={active}
                >
                  <span className="lab-color-swatch" style={{ background: c.hex }} />
                  <span className="lab-option-body">
                    <strong>
                      {isPt ? c.namePt : c.name}
                      {c.preferred ? (
                        <span className="branding-default-badge">{labels.preferred}</span>
                      ) : null}
                    </strong>
                    <span className="petrol-hex">{c.hex}</span>
                    <span className="muted">{c.vibe}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lab-panel">
          <h2 className="lab-panel-title">{labels.overlayTitle}</h2>
          <div className="lab-overlay-row">
            {OVERLAY_CANDIDATES.map((o) => {
              const active = o.id === overlayId;
              return (
                <button
                  key={o.id}
                  type="button"
                  className={active ? "lab-chip is-active" : "lab-chip"}
                  onClick={() => setOverlayId(o.id)}
                  aria-pressed={active}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <section className="lab-panel lab-preview-wrap" style={featuredStyle}>
        <div className="lab-preview-head">
          <h2 className="lab-panel-title">{labels.previewTitle}</h2>
          <p className="lab-not-locked">{labels.notLocked}</p>
        </div>
        <EditorialHeroPreview
          photoSrc={version.src}
          accent={color.hex}
          overlay={overlay.value}
          labels={labels}
          versionLabel={isPt ? version.titlePt : version.title}
        />
      </section>

      <section className="lab-panel">
        <h2 className="lab-panel-title">
          {isPt ? "As 3 versões lado a lado" : "All 3 versions side by side"}
        </h2>
        <p className="muted" style={{ margin: "0 0 1rem", maxWidth: "40rem" }}>
          {isPt
            ? "Mesma cor e overlay seleccionados — só muda a fotografia e a história."
            : "Same selected color and overlay — only the photograph and story change."}
        </p>
        <div className="lab-versions-stack">
          {HERO_VERSIONS.map((v) => (
            <EditorialHeroPreview
              key={v.id}
              photoSrc={v.src}
              accent={color.hex}
              overlay={overlay.value}
              labels={labels}
              versionLabel={isPt ? v.titlePt : v.title}
            />
          ))}
        </div>
      </section>

      <aside className="lab-selection">
        <h2 className="lab-panel-title">{labels.selectionTitle}</h2>
        <ul className="lab-selection-list">
          <li>
            <span className="muted">Hero</span>
            <strong>{isPt ? version.titlePt : version.title}</strong>
          </li>
          <li>
            <span className="muted">Color</span>
            <strong>
              {isPt ? color.namePt : color.name} · {color.hex}
            </strong>
          </li>
          <li>
            <span className="muted">Overlay</span>
            <strong>{overlay.label}</strong>
          </li>
        </ul>
      </aside>
    </div>
  );
}

"use client";

import { useMemo, useState, type CSSProperties } from "react";
import {
  ACCENT_CANDIDATES,
  BRAND_INK,
  HERO_PHOTO_CANDIDATES,
  OVERLAY_CANDIDATES,
  type AccentCandidateId,
  type HeroPhotoId,
} from "@/config/brand";

type Labels = {
  title: string;
  lead: string;
  note: string;
  photoTitle: string;
  colorTitle: string;
  overlayTitle: string;
  previewTitle: string;
  selectionTitle: string;
  copy: string;
  ctaPrimary: string;
  ctaSecondary: string;
  preferred: string;
  current: string;
  notLocked: string;
};

export function HomepageLab({ locale, labels }: { locale: string; labels: Labels }) {
  const isPt = locale.startsWith("pt");
  const [photoId, setPhotoId] = useState<HeroPhotoId>("A");
  const [colorId, setColorId] = useState<AccentCandidateId>("C1");
  const [overlayId, setOverlayId] = useState<(typeof OVERLAY_CANDIDATES)[number]["id"]>("O72");

  const photo = HERO_PHOTO_CANDIDATES.find((p) => p.id === photoId)!;
  const color = ACCENT_CANDIDATES.find((c) => c.id === colorId)!;
  const overlay = OVERLAY_CANDIDATES.find((o) => o.id === overlayId)!;

  const previewStyle = useMemo(
    () =>
      ({
        "--lab-accent": color.hex,
        "--lab-accent-strong": color.hex,
        "--lab-photo": `url("${photo.src}")`,
        "--lab-overlay": String(overlay.value),
      }) as CSSProperties,
    [color.hex, photo.src, overlay.value],
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
          <h2 className="lab-panel-title">{labels.photoTitle}</h2>
          <div className="lab-option-grid lab-option-grid-2">
            {HERO_PHOTO_CANDIDATES.map((p) => {
              const active = p.id === photoId;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={active ? "lab-option is-active" : "lab-option"}
                  onClick={() => setPhotoId(p.id)}
                  aria-pressed={active}
                >
                  <span
                    className="lab-option-thumb"
                    style={{ backgroundImage: `url(${p.src})` }}
                  />
                  <span className="lab-option-body">
                    <strong>{isPt ? p.titlePt : p.title}</strong>
                    <span className="muted">{isPt ? p.descPt : p.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="lab-panel">
          <h2 className="lab-panel-title">{labels.colorTitle}</h2>
          <div className="lab-option-grid lab-option-grid-4">
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
                      {c.id === "C4" ? (
                        <span className="lab-current-badge">{labels.current}</span>
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

      <section className="lab-panel lab-preview-wrap">
        <div className="lab-preview-head">
          <h2 className="lab-panel-title">{labels.previewTitle}</h2>
          <p className="lab-not-locked">{labels.notLocked}</p>
        </div>

        <div className="lab-hero-frame" style={previewStyle}>
          <div className="lab-hero-media" aria-hidden />
          <div className="lab-hero-veil" aria-hidden />
          <div className="lab-hero-content">
            <p className="lab-hero-eyebrow">
              {isPt ? "Mobilidade privada · Premium" : "Private mobility · Premium"}
            </p>
            <h3 className="lab-hero-brand" aria-label="ZRIK">
              <span style={{ color: "var(--lab-accent)" }}>Z</span>
              <span style={{ color: BRAND_INK }}>RIK</span>
            </h3>
            <p className="lab-hero-copy">{labels.copy}</p>
            <div className="lab-hero-ctas">
              <span className="btn btn-primary lab-btn-primary">{labels.ctaPrimary}</span>
              <span className="btn btn-secondary lab-btn-secondary">{labels.ctaSecondary}</span>
            </div>
          </div>
        </div>
      </section>

      <aside className="lab-selection">
        <h2 className="lab-panel-title">{labels.selectionTitle}</h2>
        <ul className="lab-selection-list">
          <li>
            <span className="muted">Photo</span>
            <strong>{isPt ? photo.titlePt : photo.title}</strong>
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

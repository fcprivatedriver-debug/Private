"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Service } from "@/data/services";

type Props = {
  services: Service[];
};

export function ServicesExplorer({ services }: Props) {
  const baseId = useId();
  const [activeId, setActiveId] = useState(services[0]?.id ?? "jovens");
  const [mobileOpenId, setMobileOpenId] = useState<string | null>(null);

  const active = services.find((s) => s.id === activeId) ?? services[0];

  function selectDesktop(id: Service["id"]) {
    setActiveId(id);
  }

  function toggleMobile(id: Service["id"]) {
    setMobileOpenId((current) => (current === id ? null : id));
  }

  return (
    <div className="services-explorer">
      {/* Desktop / large tablet: list + side panel */}
      <div className="services-explorer-desktop" aria-label="Explorar serviços">
        <ul className="services-cat-list" role="listbox" aria-label="Categorias de serviço">
          {services.map((service) => {
            const selected = service.id === active.id;
            return (
              <li key={service.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`services-cat-btn${selected ? " is-active" : ""}`}
                  onMouseEnter={() => selectDesktop(service.id)}
                  onFocus={() => selectDesktop(service.id)}
                  onClick={() => selectDesktop(service.id)}
                >
                  <span>{service.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {active && (
          <div
            key={active.id}
            className="services-detail-panel"
            aria-live="polite"
            aria-atomic="true"
          >
            <p className="services-detail-name">{active.name}</p>
            <p className="services-detail-desc">{active.description}</p>
            {active.note && <p className="services-detail-note">{active.note}</p>}
            <ul className="services-detail-examples">
              {active.examples.map((ex) => (
                <li key={ex}>{ex}</li>
              ))}
            </ul>
            {active.highlights && active.highlights.length > 0 && (
              <ul className="services-detail-highlights">
                {active.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            )}
            <Link
              href={`/contactos?servico=${active.id}`}
              className="btn btn-primary btn-sm services-detail-cta"
            >
              {active.cta || "Pedir este serviço"}
            </Link>
          </div>
        )}
      </div>

      {/* Mobile / small tablet: accordion */}
      <div className="services-explorer-mobile">
        <ul className="services-accordion">
          {services.map((service) => {
            const open = mobileOpenId === service.id;
            const panelId = `${baseId}-${service.id}-panel`;
            const btnId = `${baseId}-${service.id}-btn`;
            return (
              <li key={service.id} className={`services-acc-item${open ? " is-open" : ""}`}>
                <button
                  type="button"
                  id={btnId}
                  className="services-acc-trigger"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => toggleMobile(service.id)}
                >
                  <span>{service.name}</span>
                  <span className="services-acc-chevron" aria-hidden>
                    ›
                  </span>
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className="services-acc-panel"
                  aria-hidden={!open}
                >
                  <div className="services-acc-panel-inner">
                    <p className="services-detail-desc">{service.description}</p>
                    {service.note && <p className="services-detail-note">{service.note}</p>}
                    <ul className="services-detail-examples">
                      {service.examples.map((ex) => (
                        <li key={ex}>{ex}</li>
                      ))}
                    </ul>
                    {service.highlights && service.highlights.length > 0 && (
                      <ul className="services-detail-highlights">
                        {service.highlights.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href={`/contactos?servico=${service.id}`}
                      className="btn btn-primary btn-sm services-detail-cta"
                      tabIndex={open ? 0 : -1}
                    >
                      {service.cta || "Pedir este serviço"}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

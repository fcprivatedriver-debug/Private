"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND } from "@/config/brand";
import { SERVICE_OPTIONS, getService } from "@/data/services";
import {
  buildWhatsAppMessage,
  mailtoLink,
  whatsappLinkWithMessage,
  type ServiceRequestPayload,
} from "@/lib/contact";

const empty: ServiceRequestPayload = {
  name: "",
  phone: "",
  email: "",
  service: "",
  date: "",
  time: "",
  pickup: "",
  destination: "",
  notes: "",
};

export function ContactForm() {
  const params = useSearchParams();
  const preselected = params.get("servico") || "";
  const [data, setData] = useState<ServiceRequestPayload>({
    ...empty,
    service: preselected && getService(preselected) ? preselected : preselected === "outro" ? "outro" : "",
  });
  const [privacy, setPrivacy] = useState(false);
  const [touched, setTouched] = useState(false);

  const serviceLabel = useMemo(() => {
    const found = SERVICE_OPTIONS.find((o) => o.value === data.service);
    return found?.label || data.service;
  }, [data.service]);

  const payload: ServiceRequestPayload = {
    ...data,
    service: serviceLabel,
  };

  const canSend = privacy && data.name.trim() && data.phone.trim();

  function update<K extends keyof ServiceRequestPayload>(key: K, value: ServiceRequestPayload[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="contact-form-shell fade-up">
      <h2 className="contact-form-title">Pedir serviço</h2>
      <p className="contact-form-lead">
        Preencha os dados que souber. Entramos em contacto para definir o preço e confirmar o serviço.
      </p>

      <div className="contact-form-grid">
        <div className="field">
          <label className="label" htmlFor="name">
            Nome *
          </label>
          <input
            className="input"
            id="name"
            name="name"
            autoComplete="name"
            value={data.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="phone">
            Telefone *
          </label>
          <input
            className="input"
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={data.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={data.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="service">
            Serviço pretendido
          </label>
          <select
            className="input"
            id="service"
            name="service"
            value={data.service}
            onChange={(e) => update("service", e.target.value)}
          >
            <option value="">Selecionar…</option>
            {SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="date">
            Data pretendida
          </label>
          <input
            className="input"
            id="date"
            name="date"
            type="date"
            value={data.date}
            onChange={(e) => update("date", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="time">
            Hora pretendida
          </label>
          <input
            className="input"
            id="time"
            name="time"
            type="time"
            value={data.time}
            onChange={(e) => update("time", e.target.value)}
          />
        </div>
        <div className="field field-span">
          <label className="label" htmlFor="pickup">
            Local de recolha
          </label>
          <input
            className="input"
            id="pickup"
            name="pickup"
            placeholder="Morada ou local"
            value={data.pickup}
            onChange={(e) => update("pickup", e.target.value)}
          />
        </div>
        <div className="field field-span">
          <label className="label" htmlFor="destination">
            Destino (se aplicável)
          </label>
          <input
            className="input"
            id="destination"
            name="destination"
            placeholder="Opcional"
            value={data.destination}
            onChange={(e) => update("destination", e.target.value)}
          />
        </div>
        <div className="field field-span">
          <label className="label" htmlFor="notes">
            Observações
          </label>
          <textarea
            className="input"
            id="notes"
            name="notes"
            rows={4}
            value={data.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={privacy}
          onChange={(e) => setPrivacy(e.target.checked)}
        />
        <span>
          Li e aceito a{" "}
          <a href="/privacidade" style={{ textDecoration: "underline" }}>
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      {touched && !canSend && (
        <p className="form-hint-error">
          Indique o nome, telefone e aceite a política de privacidade para continuar.
        </p>
      )}

      <div className="contact-actions">
        <a
          className="btn btn-whatsapp"
          href={canSend ? whatsappLinkWithMessage(buildWhatsAppMessage(payload)) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!canSend) {
              e.preventDefault();
              setTouched(true);
            }
          }}
        >
          Enviar pelo WhatsApp
        </a>
        <a
          className="btn btn-secondary"
          href={canSend ? mailtoLink(payload) : undefined}
          onClick={(e) => {
            if (!canSend) {
              e.preventDefault();
              setTouched(true);
            }
          }}
        >
          Enviar por email
        </a>
      </div>

      <p className="contact-aside">
        Ou fale já connosco:{" "}
        <a href={BRAND.whatsappUrl} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
        {" · "}
        <a href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a>
        {" · "}
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
    </div>
  );
}

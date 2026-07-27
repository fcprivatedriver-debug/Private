import { requireUser } from "@/lib/session";
import { BiometricsSettings } from "@/components/mel/BiometricsSettings";
import { MEL_MODULES } from "@/modules/registry";

export default async function SettingsPage() {
  const { user } = await requireUser();

  return (
    <div className="stack anim-rise">
      <div>
        <h1 className="page-title">Definições</h1>
        <p className="page-lead">Conta, biometria e módulos.</p>
      </div>

      <div className="panel">
        <h2>Conta</h2>
        <p>
          <strong>{user.name}</strong>
          <br />
          <span className="muted">{user.email}</span>
        </p>
      </div>

      <div className="panel">
        <h2>Segurança</h2>
        <BiometricsSettings
          initialEnabled={user.biometricsEnabled}
          hasPin={Boolean(user.pinHash)}
        />
      </div>

      <div className="panel">
        <h2>Módulos</h2>
        <ul className="list-plain">
          {MEL_MODULES.map((m) => (
            <li key={m.id} className="list-row">
              <div>
                <strong>{m.labelPt}</strong>
                <p className="muted small" style={{ margin: "0.2rem 0 0" }}>
                  {m.descriptionPt}
                </p>
              </div>
              <span className="badge">
                {m.status === "active"
                  ? "Activo"
                  : m.status === "preview"
                    ? "Pré-visualização"
                    : "Em breve"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

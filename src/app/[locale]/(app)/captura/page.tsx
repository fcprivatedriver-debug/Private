import { VoiceCapture } from "@/components/mel/VoiceCapture";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ auto?: string }>;
}) {
  const params = await searchParams;
  const autoStart = params.auto === "1";

  return (
    <div className="anim-rise">
      <h1 className="page-title">Captura</h1>
      <p className="page-lead">Fala ou escreve — a Mel organiza por ti.</p>
      <div className="panel">
        <VoiceCapture autoStart={autoStart} />
      </div>
    </div>
  );
}

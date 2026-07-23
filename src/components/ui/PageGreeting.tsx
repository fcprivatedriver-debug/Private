export function PageGreeting({
  hello,
  sub,
}: {
  hello: string;
  sub: string;
}) {
  return (
    <div className="greeting fade-up">
      <h1 className="greeting-hello">{hello}</h1>
      <p className="greeting-sub">{sub}</p>
    </div>
  );
}

export function SummaryStrip({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="summary-strip fade-up-delay">
      {items.map((item) => (
        <div key={item.label} className="summary-item">
          <div className="label-sm">{item.label}</div>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

interface Props { text: string; hint?: string }

export default function ErrorLine({ text, hint }: Props) {
  return (
    <div aria-live="assertive">
      <div className="terminal__error">{text}</div>
      {hint && <div className="terminal__error-hint">{hint}</div>}
    </div>
  );
}

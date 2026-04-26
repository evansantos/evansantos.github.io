interface Props { text: string }

export default function EchoLine({ text }: Props) {
  return <div className="terminal__echo">{text}</div>;
}

import { voiceList } from "./catalog";
export type Segment = { text: string; voice: string };
export function segments(
  script: string,
  mode: string,
  voice: string,
  secondVoice: string,
): Segment[] {
  if (
    !voiceList.some((v) => v.id === voice) ||
    !voiceList.some((v) => v.id === secondVoice)
  )
    throw new Error("Choose a valid voice.");
  if (mode !== "podcast") return split(script.trim(), voice);
  const turns: { text: string; voice: string }[] = [];
  for (const line of script.split("\n")) {
    if (!line.trim()) continue;
    const match = /^\s*(?:Host\s*)?([12])\s*:\s*(.*)$/iu.exec(line);
    if (match) {
      if (!match[2].trim())
        throw new Error("Each turn must contain text.");
      turns.push({
        text: match[2].trim(),
        voice: match[1] === "1" ? voice : secondVoice,
      });
    } else if (turns.length) {
      turns[turns.length - 1].text += "\n" + line.trim();
    } else throw new Error("Start turns with “1:” or “2:”.");
  }
  if (
    !turns.length ||
    !turns.some((t) => t.voice === voice) ||
    !turns.some((t) => t.voice === secondVoice) ||
    voice === secondVoice
  )
    throw new Error(
      "A podcast requires turns from two hosts with different voices.",
    );
  return turns.flatMap((t) => split(t.text, t.voice));
}
function split(text: string, voice: string) {
  const out: Segment[] = [];
  let rest = text;
  while (rest.length) {
    let end = Math.min(1800, rest.length);
    if (end < rest.length) {
      const boundary = Math.max(
        rest.lastIndexOf(". ", end),
        rest.lastIndexOf("! ", end),
        rest.lastIndexOf("? ", end),
        rest.lastIndexOf("\n", end),
      );
      if (boundary > 900) end = boundary + 1;
      else {
        const space = rest.lastIndexOf(" ", end);
        if (space > 900) end = space;
      }
    }
    const chunk = rest.slice(0, end).trim();
    if (chunk) out.push({ text: chunk, voice });
    rest = rest.slice(end).trim();
  }
  return out;
}

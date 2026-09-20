export type CaptionWord = { text: string; start: number; end: number };
export const captionStyles = ["classic", "bold", "karaoke", "highlight", "pop", "minimal", "neon", "typewriter"] as const;
export type CaptionStyle = typeof captionStyles[number];
export type CaptionFormat = "9:16" | "1:1" | "16:9" | "4:5";
export type CaptionDocument = {
  words: CaptionWord[]; style: CaptionStyle; format: CaptionFormat;
  position: "bottom" | "middle" | "top"; enabled: boolean;
  accent?: string; textColor?: string; size?: number; uppercase?: boolean;
  resolution?: "720p" | "1080p"; fit?: "contain" | "cover";
};
export type CaptionLook = Omit<CaptionDocument, "words">;
export const captionPresets: { id: CaptionStyle; name: string; description: string; accent: string; uppercase: boolean }[] = [
  { id: "karaoke", name: "Karaoke", description: "Every word gets its moment", accent: "#c8f560", uppercase: true },
  { id: "highlight", name: "Highlight", description: "A colorful background follows the voice", accent: "#ffe16b", uppercase: false },
  { id: "bold", name: "Bold", description: "Large text with a clear outline", accent: "#c8f560", uppercase: true },
  { id: "pop", name: "Focus", description: "One word. All the attention.", accent: "#c8f560", uppercase: true },
  { id: "classic", name: "Classic", description: "Readable text on a dark background", accent: "#c8f560", uppercase: false },
  { id: "minimal", name: "Clean", description: "Subtle text, more picture", accent: "#c8f560", uppercase: false },
  { id: "neon", name: "Neon", description: "A colorful accent with a soft glow", accent: "#73e8ec", uppercase: true },
  { id: "typewriter", name: "Reveal", description: "Words appear with the narration", accent: "#c8f560", uppercase: false },
];
export const defaultCaptions: CaptionDocument = { words: [], style: "karaoke", format: "9:16", position: "bottom", enabled: true };
export const demoWords: CaptionWord[] = [
  { text: "Every", start: 0, end: .65 }, { text: "story", start: .65, end: 1.3 },
  { text: "deserves", start: 1.3, end: 2 }, { text: "a voice.", start: 2, end: 2.8 },
];
export function captionLook(document: CaptionDocument): CaptionLook {
  return {
    style: document.style, format: document.format, position: document.position, enabled: document.enabled,
    accent: document.accent || captionPresets.find(p => p.id === document.style)!.accent,
    textColor: document.textColor || "#ffffff", size: document.size || 1, uppercase: document.uppercase || false,
    resolution: document.resolution || "720p", fit: document.fit || "contain",
  };
}
export function alignmentWords(alignment: { characters: string[]; characterStartTimesSeconds: number[]; characterEndTimesSeconds: number[] } | undefined): CaptionWord[] {
  if (!alignment) return [];
  const { characters, characterStartTimesSeconds: starts, characterEndTimesSeconds: ends } = alignment;
  if (characters.length !== starts.length || characters.length !== ends.length) return [];
  const words: CaptionWord[] = [];
  let word: CaptionWord | null = null, inTag = false;
  const flush = () => { if (word) words.push(word); word = null; };
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    if (!Number.isFinite(starts[i]) || !Number.isFinite(ends[i]) || starts[i] < 0 || ends[i] < starts[i]) return [];
    if (char === "[") { flush(); inTag = true; }
    if (inTag) { if (char === "]") inTag = false; continue; }
    if (/\s/.test(char)) { flush(); continue; }
    if (!word) word = { text: "", start: starts[i], end: ends[i] };
    word.text += char; word.end = ends[i];
  }
  flush();
  return words;
}
export function captionGroups(words: CaptionWord[]) {
  const groups: CaptionWord[][] = [];
  let group: CaptionWord[] = [];
  for (const word of words) {
    if (group.length && (group.length === 4 || word.start - group.at(-1)!.end > 0.8 || group.map(w => w.text).join(" ").length + word.text.length > 38)) {
      groups.push(group); group = [];
    }
    group.push(word);
    if (/[.!?]$/.test(word.text)) { groups.push(group); group = []; }
  }
  if (group.length) groups.push(group);
  return groups;
}
export function subtitleFile(words: CaptionWord[], type: "srt" | "vtt") {
  const time = (n: number) => new Date(Math.round(n * 1000)).toISOString().slice(11, 23).replace(".", type === "srt" ? "," : ".");
  return (type === "vtt" ? "WEBVTT\n\n" : "") + captionGroups(words).map((g, i) =>
    `${i + 1}\n${time(g[0].start)} --> ${time(g.at(-1)!.end)}\n${g.map(w => w.text).join(" ")}\n`).join("\n");
}

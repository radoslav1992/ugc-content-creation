export type StudioVoice = { id: string; name: string; description: string; sampleUrl?: string | null };
export const studioVoices = [
  { id: "studio-boris", name: "Boris", description: "A full, confident narrator" },
  { id: "studio-mila", name: "Mila", description: "A soft, natural voice" },
  { id: "studio-nikola", name: "Nikola", description: "Clear, calm delivery" },
  { id: "studio-elena", name: "Elena", description: "Warm, expressive narration" },
] as const;
export const emotionTags = [
  ["excited", "Excitement"], ["curious", "Curiosity"],
  ["whispers", "Whisper"], ["laughs", "Laughter"],
  ["sighs", "Sigh"], ["sad", "Sadness"],
  ["calm", "Calm"], ["serious", "Serious"],
] as const;
export const studioMaxChars = 1500;
export const studioCreditsPerChar = 3;
export const stripTags = (text: string) => text.replace(/\[[^\]]*\]/g, "");
export function validateStudioScript(text: string) {
  if (!stripTags(text).trim() || text.length > studioMaxChars)
    throw new Error(`The script must contain text and be no more than ${studioMaxChars} characters, including tags.`);
  if (text.replace(/\[[a-z ]+\]/g, "").match(/[\[\]]/) ||
      [...text.matchAll(/\[([^\]]+)\]/g)].some(m => !emotionTags.some(([tag]) => tag === m[1])))
    throw new Error("Use the emotion tags from the toolbar above the script.");
  return text.length * studioCreditsPerChar;
}
export function validateSuggestedDelivery(original: string, suggestion: string) {
  validateStudioScript(suggestion);
  if (stripTags(suggestion) !== stripTags(original))
    throw new Error("The suggestion changed your words. Try again or add emotions manually.");
  return suggestion;
}

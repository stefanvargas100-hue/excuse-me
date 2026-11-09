// Extend this list with normalized spellings. Matching ignores separators and simple swaps.
export const BLOCKED_NAME_WORDS = ['fuck', 'fock', 'shit', 'bitch', 'asshole', 'cunt', 'nigger', 'faggot'];
export function blockedPlayerName(name) {
  const swaps = {0:'o',1:'i',3:'e','@':'a','$':'s'};
  const text = name.toLowerCase().normalize('NFKD').replace(/[013@$]/g, c => swaps[c]).replace(/[^a-z]/g, '');
  return BLOCKED_NAME_WORDS.some(word => text.includes(word));
}

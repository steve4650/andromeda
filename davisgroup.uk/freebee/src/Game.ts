interface Answer {
  word: string;
  score: number;
}

function sort_answers(a: Answer, b: Answer) {
  return a.score < b.score || (a.score === b.score && a.word < b.word) ? -1 : 1;
}

interface Dictionary {
  [word: string]: number;
}

interface Puzzles {
  [puzzleID: string]: string;
}

/** How much a given guess scores. */
function score(letters: string[], yellow: string, guess: string, words: Dictionary | null): number {
  const guess_cleaned = guess.trim().toUpperCase();
  if (words === null) {
    return 0;
  }
  if (guess_cleaned.length < 4) {
    return 0;
  }
  if (guess_cleaned.indexOf(yellow) === -1) {
    return 0;
  }
  if (new Set([...letters, yellow, ...guess_cleaned.split("")]).size > 7) {
    return 0;
  }
  if (words[guess_cleaned.toLowerCase()] !== 1) {
    return 0;
  }
  if (guess.length === 4) {
    return 1;
  }
  if (new Set(guess_cleaned.split("")).size === 7) {
    return 7 + guess_cleaned.length;
  }
  return guess_cleaned.length;
}

function total_score(list: Answer[]): number {
  return list.reduce((sum: number, b: Answer): number => sum + b.score, 0);
}

export { type Answer, type Dictionary, type Puzzles, score, sort_answers, total_score };

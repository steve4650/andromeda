import type { Answer } from "./Game";

interface StoredState {
  answers: Answer[];
  total_score: number;
}

function getURLHash() {
  return window.location.hash.replace(/^#/, "");
}

function setURLHash(val: string | null) {
  if (val !== null) {
    window.location.hash = val.replace(/^#/, "");
  }
}

function saveState(puzzleID: string, answers: Answer[], totalScore: number) {
  localStorage.setItem(`freebee-${puzzleID}`, JSON.stringify({ answers, total_score: totalScore }));
}

function loadState(puzzleID: string): StoredState {
  const res = localStorage.getItem(`freebee-${puzzleID}`);
  if (res === null) {
    return { answers: [], total_score: 0 };
  }
  return JSON.parse(res);
}

export { getURLHash, loadState, saveState, setURLHash };

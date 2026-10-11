import { useEffect, useRef, useState } from "react";
import { GameBoard } from "./components/GameBoard";
import { getURLHash, loadState, saveState, setURLHash } from "./Helpers";
import "./App.css";
import { HowToPlayPopup } from "./components/HowToPlayPopup";
import { PuzzleSelectorPopup } from "./components/PuzzleSelectorPopup";
import { ScoreBoard } from "./components/ScoreBoard";
import {
  type Answer,
  type Dictionary,
  type Puzzles,
  score,
  sort_answers,
  total_score,
} from "./Game";

interface ActiveGameProps {
  puzzleID: string | null;
  letters: string[];
  yellow: string;
  words: Dictionary | null;
  choosePuzzleDialog: React.RefObject<HTMLDialogElement | null>;
  howToPlayDialog: React.RefObject<HTMLDialogElement | null>;
}

function ActiveGame({
  puzzleID,
  letters,
  yellow,
  words,
  choosePuzzleDialog,
  howToPlayDialog,
}: ActiveGameProps) {
  const [guess, setGuess] = useState("");
  const [answers, setAnswers] = useState<Answer[]>(() =>
    puzzleID !== null ? loadState(puzzleID).answers : [],
  );
  const totalScore = total_score(answers);

  useEffect(() => {
    if (puzzleID !== null) {
      saveState(puzzleID, answers, totalScore);
    }
  }, [answers, puzzleID, totalScore]);

  return (
    <div className="flex flex-col bg-stone-800 w-full h-screen p-5 items-center">
      <div className="flex flex-row place-self-start pb-3">
        <span className="font-sans text-3xl self-start text-white">FreeBee🐝</span>
        <button
          type="button"
          className="button bg-yellow-200 text-stone-800 ml-2 py-1 px-2"
          onClick={() => {
            if (choosePuzzleDialog.current !== null) {
              choosePuzzleDialog.current.showModal();
            }
          }}
        >
          More
        </button>
        <button
          type="button"
          className="button bg-yellow-200 text-stone-800 ml-1 py-1 px-2"
          onClick={() => {
            if (howToPlayDialog.current !== null) {
              howToPlayDialog.current.showModal();
            }
          }}
        >
          How to Play
        </button>
      </div>
      <GameBoard letters={letters} yellow={yellow} />
      <div className="mt-10">
        <input
          className="bg-stone-700 text-white text-lg font-mono"
          type="text"
          value={guess}
          onChange={(e) => {
            const trimmed = e.target.value.trim();
            setGuess(trimmed);
            const n = score(letters, yellow, trimmed, words);
            if (
              n > 0 &&
              !answers.find((x) => x.word.toLowerCase() === e.target.value.toLowerCase())
            ) {
              setAnswers(
                [
                  ...answers,
                  {
                    word: e.target.value,
                    score: n,
                  },
                ].sort(sort_answers),
              );
            }
          }}
        />
      </div>
      <ScoreBoard list={answers} totalScore={totalScore} />
    </div>
  );
}

function App() {
  // Application state
  const [puzzleID, setPuzzleID] = useState<string | null>(() => getURLHash() || null);
  const [words, setWords] = useState<Dictionary | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzles | null>(null);
  const [loading, setLoading] = useState(true);
  const choosePuzzleDialog = useRef<HTMLDialogElement>(null);
  const howToPlayDialog = useRef<HTMLDialogElement>(null);

  // Load data
  useEffect(() => {
    fetch("api/words.json")
      .then((res) => res.json())
      .then((data: Dictionary) => setWords(data));
    fetch("api/puzzles.json")
      .then((res) => res.json())
      .then((data: Puzzles) => {
        setLoading(false);
        setPuzzles(data);
        if (!getURLHash()) {
          const id = Object.keys(data).sort().reverse()[0];
          if (id !== undefined) {
            setPuzzleID(id);
          }
        }
      });
  }, []);

  useEffect(() => {
    setURLHash(puzzleID);
  }, [puzzleID]);

  const currentPuzzle =
    puzzles !== null &&
    puzzleID !== null &&
    puzzles[puzzleID] !== undefined &&
    puzzles[puzzleID].length === 7
      ? puzzles[puzzleID]
      : null;

  const yellow = currentPuzzle !== null ? currentPuzzle[0] : ".";
  const letters =
    currentPuzzle !== null ? currentPuzzle.substring(1).split("") : [".", ".", ".", ".", ".", "."];

  // Render
  if (letters.length === 6) {
    return (
      <>
        <ActiveGame
          key={puzzleID ?? "default"}
          puzzleID={puzzleID}
          letters={letters}
          yellow={yellow}
          words={words}
          choosePuzzleDialog={choosePuzzleDialog}
          howToPlayDialog={howToPlayDialog}
        />
        <PuzzleSelectorPopup
          ref={choosePuzzleDialog}
          setPuzzleID={setPuzzleID}
          puzzles={puzzles}
          loading={loading}
        />
        <HowToPlayPopup ref={howToPlayDialog} />
      </>
    );
  }
  return null;
}

export default App;

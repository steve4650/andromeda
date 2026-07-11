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

function App() {
  // Application state
  const [letters, setLetters] = useState([".", ".", ".", ".", ".", "."]);
  const [yellow, setYellow] = useState(".");
  const [guess, setGuess] = useState("");
  const [puzzleID, setPuzzleID] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [words, setWords] = useState<Dictionary | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzles | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalScore, setTotalScore] = useState(0);
  const choosePuzzleDialog = useRef(null);
  const howToPlayDialog = useRef(null);

  // Load data
  useEffect(() => {
    if (getURLHash().length !== 0) {
      setPuzzleID(getURLHash());
    }
    fetch("api/words.json")
      .then((res) => res.json())
      .then((data: Dictionary) => setWords(data));
    fetch("api/puzzles.json")
      .then((res) => res.json())
      .then((data: Puzzles) => {
        setLoading(false);
        setPuzzles(data);
        if (getURLHash().length === 0) {
          const id = Object.keys(data).sort().reverse()[0];
          if (id !== undefined) {
            setPuzzleID(id);
          }
        }
      });
  }, []);

  useEffect(() => {
    setURLHash(puzzleID);
    setGuess("");
    if (
      puzzles !== null &&
      puzzleID !== null &&
      puzzles[puzzleID] !== undefined &&
      puzzles[puzzleID].length === 7
    ) {
      setYellow(puzzles[puzzleID][0]);
      setLetters(puzzles[puzzleID].substring(1).split(""));
      const state = loadState(puzzleID);
      setAnswers(state.answers);
      setTotalScore(state.total_score);
    }
  }, [puzzleID, puzzles]);

  useEffect(() => {
    if (puzzleID !== null) {
      setTotalScore(total_score(answers));
      saveState(puzzleID, answers, totalScore);
    }
  }, [answers]);

  // Render
  if (letters.length === 6) {
    return (
      <>
        <div className="flex flex-col bg-stone-800 w-full h-screen p-5 items-center">
          <div className="flex flex-row place-self-start pb-3">
            <span className="font-sans text-3xl self-start text-white">FreeBee🐝</span>
            <button
              type="button"
              className="button bg-yellow-200 text-stone-800 ml-2 py-1 px-2"
              onClick={() => {
                if (choosePuzzleDialog.current !== null) {
                  //@ts-expect-error
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
                  //@ts-expect-error
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
                const guess = e.target.value.trim();
                setGuess(guess);
                const n = score(letters, yellow, guess, words);
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

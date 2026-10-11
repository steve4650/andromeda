import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Chikorita.css";

export default function Chikorita() {
  const [loadData] = useState(() => {
    if (typeof window === "undefined") {
      return { html: "", css: "" };
    }
    if (!(window.location.hash === "" || window.location.hash === "#")) {
      try {
        return JSON.parse(decodeURI(window.location.hash.slice(1)));
      } catch {
        return { html: "", css: "" };
      }
    }
    return { html: "", css: "" };
  });

  const [currentInput, setCurrentInput] = useState("html");
  const [htmlInputText, setHtmlInputText] = useState(loadData.html);
  const [cssInputText, setCssInputText] = useState(loadData.css);
  const [pos, setPos] = useState(0);

  const htmlRef = useRef<HTMLTextAreaElement>(null);
  const cssRef = useRef<HTMLTextAreaElement>(null);

  const displayOutput = `<html><head><style>${cssInputText}</style></head><body>${htmlInputText}</body></html>`;

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>, inputtype: string) {
    if (inputtype === "html") {
      setHtmlInputText(e.target.value);
    } else if (inputtype === "css") {
      setCssInputText(e.target.value);
    } else {
      console.error(`invalid inputtype ${inputtype} passed to handleInput`);
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    const activeRef = currentInput === "html" ? htmlRef : cssRef;
    const oppRef = currentInput === "html" ? cssRef : htmlRef;
    const setInputText = currentInput === "html" ? setHtmlInputText : setCssInputText;

    if (activeRef.current === null || oppRef.current === null) {
      return;
    }
    const str = activeRef.current.value;
    const pos1 = activeRef.current.selectionStart;
    const pos2 = activeRef.current.selectionEnd;
    if (event.code === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.shiftKey) {
        if (pos1 === pos2) {
          setInputText(`${str.slice(0, pos1)}\t${str.slice(pos1)}`);
          setPos(pos1 + 1);
        } else {
          const ind = str.slice(0, pos1).lastIndexOf("\n");
          if (ind !== -1) {
            const fullLineSel = str.slice(ind, pos2).replaceAll("\n", "\n\t");
            setInputText(str.slice(0, ind) + fullLineSel + str.slice(pos2));
            setPos(pos2 + 1);
          } else {
            const fullLineSel = `\t${str.slice(0, pos2).replaceAll("\n", "\n\t")}`;
            setInputText(fullLineSel + str.slice(pos2));
            setPos(pos2 + 1);
          }
        }
      } else {
        oppRef.current.focus();
        setCurrentInput(currentInput === "html" ? "css" : "html");
      }
    } else if (event.code === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const match = str
        .slice(str.slice(0, pos1).lastIndexOf("\n") + 1)
        .match(/^[ \f\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*/);
      const lastNewline = match === null ? "" : match[0];
      setInputText(`${str.slice(0, pos1)}\n${lastNewline}${str.slice(pos1)}`);
      setPos(pos1 + 1 + lastNewline.length);
    }
  };

  useEffect(() => {
    window.location.hash = encodeURI(JSON.stringify({ html: htmlInputText, css: cssInputText }));
  }, [htmlInputText, cssInputText]);

  useEffect(() => {
    const activeRef = currentInput === "html" ? htmlRef : cssRef;
    if (activeRef.current === null) {
      return;
    }
    activeRef.current.selectionStart = activeRef.current.selectionEnd = pos;
  }, [pos, currentInput]);

  return (
    <div className="chikorita-container" onKeyDown={handleKeyDown}>
      <div className="chikorita-topbar">
        <Link to="/">← davisgroup.uk</Link>
        <span>Sketch HTML + CSS</span>
      </div>
      <div className="chikorita-main">
        <div className="panel-webview">
          <iframe
            title="Display HTML Output"
            className="webview"
            sandbox=""
            srcDoc={displayOutput}
          />
        </div>
        <div className="panel-input">
          <textarea
            ref={htmlRef}
            value={htmlInputText}
            onChange={(e) => handleInput(e, "html")}
            onFocus={() => setCurrentInput("html")}
            placeholder="<!-- HTML here -->"
          />
          <textarea
            ref={cssRef}
            value={cssInputText}
            onChange={(e) => handleInput(e, "css")}
            onFocus={() => setCurrentInput("css")}
            placeholder="/* CSS here */"
          />
        </div>
      </div>
    </div>
  );
}

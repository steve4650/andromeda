import { useEffect, useRef, useState } from "react";
import "./App.css";

function App() {
  let loadData = { html: "", css: "" };
  if (!(window.location.hash === "" || window.location.hash === "#")) {
    loadData = JSON.parse(decodeURI(window.location.hash.slice(1)));
  }

  const [currentInput, setCurrentInput] = useState("html");
  const [htmlInputText, setHtmlInputText] = useState(loadData.html);
  const [cssInputText, setCssInputText] = useState(loadData.css);
  const [htmlInputPos, setHtmlInputPos] = useState(0);
  const [cssInputPos, setCssInputPos] = useState(0);
  const [displayOutput, setDisplayOutput] = useState("");
  const [pos, setPos] = useState(0);

  const inputRefs = {
    html: {
      ref: useRef<HTMLTextAreaElement>(null),
      opposite: "css",
      inputText: htmlInputText,
      setInputText: setHtmlInputText,
      inputPos: htmlInputPos,
      setInputPos: setHtmlInputPos,
    },
    css: {
      ref: useRef<HTMLTextAreaElement>(null),
      opposite: "html",
      inputText: cssInputText,
      setInputText: setCssInputText,
      inputPos: cssInputPos,
      setInputPos: setCssInputPos,
    },
  };

  const input = currentInput === "html" ? inputRefs.html : inputRefs.css;
  const oppositeInput = currentInput === "html" ? inputRefs.css : inputRefs.html;

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>, inputtype: string) {
    if (inputtype === "html") {
      setHtmlInputText(e.target.value);
    } else if (inputtype === "css") {
      setCssInputText(e.target.value);
    } else {
      console.error(`error 289139: invalid inputtype ${inputtype} passed to handleInput`);
      return;
    }
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (input.ref.current === null || oppositeInput.ref.current === null) {
      return;
    }
    const str = input.ref.current.value;
    const pos1 = input.ref.current.selectionStart;
    const pos2 = input.ref.current.selectionEnd;
    if (event.code === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      if (!event.shiftKey) {
        if (pos1 === pos2) {
          input.setInputText(`${str.slice(0, pos1)}\t${str.slice(pos1)}`);
          setPos(pos1 + 1);
        } else {
          const ind = str.slice(0, pos1).lastIndexOf("\n");
          if (ind !== -1) {
            const fullLineSel = str.slice(ind, pos2).replaceAll("\n", "\n\t");
            input.setInputText(str.slice(0, ind) + fullLineSel + str.slice(pos2));
            setPos(pos2 + 1);
          } else {
            const fullLineSel = `\t${str.slice(0, pos2).replaceAll("\n", "\n\t")}`;
            input.setInputText(fullLineSel + str.slice(pos2));
            setPos(pos2 + 1);
          }
        }
      } else {
        oppositeInput.ref.current.focus();
        setCurrentInput(currentInput === "html" ? "css" : "html");
      }
    } else if (event.code === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      const match = str
        .slice(str.slice(0, pos1).lastIndexOf("\n") + 1)
        .match(/^[ \f\r\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*/);
      const lastNewline = match === null ? "" : match[0];
      input.setInputText(`${str.slice(0, pos1)}\n${lastNewline}${str.slice(pos1)}`);
      setPos(pos1 + 1 + lastNewline.length);
    }
  };

  useEffect(() => {
    setDisplayOutput(
      `<html><head><style>${cssInputText}</style></head><body>${htmlInputText}</body></html>`,
    );
    window.location.hash = encodeURI(JSON.stringify({ html: htmlInputText, css: cssInputText }));
  }, [htmlInputText, cssInputText]);

  useEffect(() => {
    if (input.ref.current === null) {
      return;
    }
    input.ref.current.selectionStart = input.ref.current.selectionEnd = pos;
  }, [pos]);

  return (
    <div className="app" onKeyDown={handleKeyDown}>
      <div className="panel-webview">
        <iframe title="Display HTML Output" className="webview" sandbox="" srcDoc={displayOutput} />
      </div>
      <div className="panel-input">
        <textarea
          ref={inputRefs.html.ref}
          value={htmlInputText}
          onChange={(e) => handleInput(e, "html")}
          onFocus={() => setCurrentInput("html")}
        />
        <textarea
          ref={inputRefs.css.ref}
          value={cssInputText}
          onChange={(e) => handleInput(e, "css")}
          onFocus={() => setCurrentInput("css")}
        />
      </div>
    </div>
  );
}

export default App;

function GameBoard(props: { letters: string[]; yellow: string }) {
  return (
    <div className="flex flex-col">
      <pre className="text-5xl font-mono text-white">
        {`    ${props.letters[0]}   \n${props.letters[1]}       ${props.letters[2]}`}
      </pre>
      <pre className="text-5xl font-mono bg-yellow-300 text-black">{`    ${props.yellow}   `}</pre>
      <pre className="text-5xl font-mono text-white">
        {`${props.letters[4]}       ${props.letters[5]}\n    ${props.letters[3]}    `}
      </pre>
    </div>
  );
}

export { GameBoard };

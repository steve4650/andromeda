import type { Answer } from "../Game";

function ScoreBoard(props: { list: Answer[]; totalScore: number }) {
  if (props.list.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col text-xl mt-10 max-w-full">
      {
        <>
          <span className="text-white underline underline-offset-2 my-1">{props.totalScore}</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-(--breakpoint-xl) mx-auto">
            {props.list.map((item) => (
              <span className="text-white uppercase" key={item.word}>
                {`${item.word} (${item.score})`}
              </span>
            ))}
          </div>
        </>
      }
    </div>
  );
}

export { ScoreBoard };

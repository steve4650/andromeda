import type { Puzzles } from "../Game";

function PuzzleSelectorPopup(props: {
  puzzles: Puzzles | null;
  setPuzzleID: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  ref: React.RefObject<null>;
}) {
  return (
    <dialog ref={props.ref} className="modal">
      <div className="modal-box bg-stone-800">
        <h3 className="font-bold text-lg text-stone-200 my-2">More Puzzles</h3>
        <ul className="list-disc list-inside">
          {props.puzzles === null
            ? null
            : Object.keys(props.puzzles)
                .sort()
                .reverse()
                .map((id) => (
                  <li key={`puzzle-${id}`}>
                    <a
                      className="text-blue-300"
                      href={`#${id}`}
                      onClick={() => {
                        props.setPuzzleID(id);
                        if (props.ref.current !== null) {
                          //@ts-expect-error
                          props.ref.current.close();
                        }
                      }}
                    >
                      {id}
                    </a>
                  </li>
                ))}
        </ul>
        <div className="modal-action">
          <form method="dialog">
            <button
              type="button"
              className="button bg-yellow-200 text-stone-800 py-1 px-2"
              onClick={() => {
                console.log("a");
                if (props.ref.current !== null) {
                  console.log(props.ref.current);
                  //@ts-expect-error
                  props.ref.current.close();
                }
              }}
            >
              Close
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}

export { PuzzleSelectorPopup };

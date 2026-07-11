function HowToPlayPopup(props: { ref: React.RefObject<null> }) {
  return (
    <dialog ref={props.ref} className="modal">
      <div className="modal-box bg-stone-800">
        <h3 className="font-bold text-lg text-stone-200 my-2">How to Play</h3>
        <p className="my-1">Guess words which using only the 7 letters on the board.</p>
        <p className="my-1">4-letter words are 1 point, 5-letter words are 2 points, and so on.</p>
        <p className="my-1">
          +7 points for finding a word which uses all letters (there will always be one).
        </p>
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

export { HowToPlayPopup };

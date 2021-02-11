import { useRef, useState } from "react";
import "./App.css";

const { get } = require("idb-keyval");

function App({ worker }) {
  const matchIdRef = useRef(0);
  const [cMatchId, setMatchId] = useState(0);
  const [data, setData] = useState([]);

  const connectToWW = (matchId) => {
    worker.postMessage(matchId);
    console.log("Message posted to worker", matchId);

    worker.onmessage = function (e) {
      console.log("Message received from worker", e.data);

      get(parseInt(matchId)).then((val) => {
        if (e.data.dirty || e.data.matchId !== cMatchId) {
          setMatchId(matchId);
          console.log("setting data to:", val);
          setData(val);
        }
        console.log(val);
      });
    };
  };

  return (
    <div className="App">
      <input type="text" ref={matchIdRef}></input>
      <button
        onClick={() => {
          connectToWW(matchIdRef.current.value);
        }}
      >
        Get Data
      </button>

      <ul>
        {data !== undefined &&
          data.map((d) => {
            return (
              <li>
                {d.match_id} - {d.timestamp}
              </li>
            );
          })}
      </ul>
    </div>
  );
}

export default App;

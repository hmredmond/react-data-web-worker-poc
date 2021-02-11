import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

const myWorker = new Worker("./data.worker", { type: "module" });

ReactDOM.render(
  <React.StrictMode>
    <App worker={myWorker} />
  </React.StrictMode>,
  document.getElementById("root")
);

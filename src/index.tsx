/* @refresh reload */
import { render } from "solid-js/web";
import Stocktake from "./Stocktake";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element #root was not found in the document.");
}

render(() => <Stocktake />, root);

import { SubstitutionApp } from "./ui/app";
import "./style.css";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  new SubstitutionApp(root);
}

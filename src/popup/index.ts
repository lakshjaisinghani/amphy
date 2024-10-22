import { mount } from "svelte"
import Popup from "../components/Popup.svelte";

function render() {
    const target = document.getElementById("app");

    if (target) {
        mount(Popup, { target });
    }
}

document.addEventListener("DOMContentLoaded", render);

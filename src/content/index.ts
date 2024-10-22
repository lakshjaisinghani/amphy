import { mount } from "svelte"
import Highlighter from "../components/Highlighter.svelte";

const app = mount(Highlighter, { target: document.body })

export default app;
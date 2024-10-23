<script lang="ts">
  import { onMount } from "svelte";
  import { chromeStorageSync } from "../lib/storage";
  import { Prompt, CreateLLMSession } from "../lib/llm";

  type QA = { question: string; answer: string };

  const notesStore = chromeStorageSync<string[]>("notes");
  let notes: string[] = [];
  let quiz: QA[] = [];
  let isGeneratingQuiz = false;
  let visibleAnswers: boolean[] = [];

  onMount(() => {
    const unsubscribe = notesStore.subscribe((value) => {
      notes = value || [];
    });

    return unsubscribe;
  });

  function deleteNote(index: number) {
    notesStore.update((currentNotes) => {
      if (currentNotes && currentNotes.length > index) {
        currentNotes.splice(index, 1);
      }
      return currentNotes;
    });
  }

  async function generateQuiz() {
    const systemPrompt =
      'You are a function that generate quiz questions \
      and answers as separate arrays based on notes. \
      Do not use codeblock. \
      Format: \
      ["q1", "q2", "q3"]\n["a1", "a2", "a3"] \
    ';

    isGeneratingQuiz = true;

    const llmSession = await CreateLLMSession(systemPrompt);

    if (!llmSession) {
      return;
    }

    const prompt = notes.join("\n");

    try {
      const response = await Prompt(llmSession, prompt);
      const rawQuiz = response.split("\n");
      const questions = JSON.parse(rawQuiz[0]) as string[];
      const answers = JSON.parse(rawQuiz[1]) as string[];
      quiz = questions.map((question, index) => ({
        question,
        answer: answers[index],
      }));
      visibleAnswers = new Array(quiz.length).fill(false);
    } catch (error) {
      console.error("Error generating quiz:", error);
      quiz = [
        { question: "Error generating quiz", answer: "Please try again" },
      ];
    } finally {
      isGeneratingQuiz = false;
      llmSession.destroy();
    }
  }

  function toggleAnswer(index: number) {
    visibleAnswers[index] = !visibleAnswers[index];
    visibleAnswers = [...visibleAnswers];
  }
</script>

<main>
  <div id="notes">
    {#if notes.length > 0}
      {#each notes as note, index}
        <div class="note-item">
          <span class="note-text">{note}</span>
          <button class="delete-button" on:click={() => deleteNote(index)}
            >Delete</button
          >
        </div>
      {/each}
    {:else}
      <p id="no-notes">No notes yet</p>
    {/if}
  </div>

  <button
    on:click={generateQuiz}
    disabled={isGeneratingQuiz || notes.length === 0}
  >
    {isGeneratingQuiz ? "Generating Quiz..." : "Generate Quiz"}
  </button>

  {#if quiz.length > 0}
    <div id="quiz">
      <h2>Quiz</h2>
      <ol>
        {#each quiz as q, index}
          <li>
            <button on:click={() => toggleAnswer(index)}>{q.question}</button>
            {#if visibleAnswers[index]}
              <p class="answer">{q.answer}</p>
            {/if}
          </li>
        {/each}
      </ol>
    </div>
  {/if}
</main>

<style>
  .note-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    background-color: #ffffff;
    padding: 10px;
    border-radius: 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .note-text {
    flex-grow: 1;
    margin-right: 10px;
  }
  .delete-button {
    background-color: #e74c3c;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: background-color 0.3s;
  }
  .delete-button:hover {
    background-color: #c0392b;
  }

  button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 10px 15px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
    margin-top: 15px;
  }

  button:hover {
    background-color: #2980b9;
  }

  button:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }

  #quiz {
    margin-top: 20px;
  }

  #quiz h2 {
    font-size: 1.2em;
    margin-bottom: 10px;
  }

  #quiz ol {
    padding-left: 20px;
  }

  #quiz li {
    margin-bottom: 15px;
  }

  #quiz button {
    text-align: left;
    width: 100%;
    background-color: #f0f0f0;
    color: #333;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  #quiz button:hover {
    background-color: #e0e0e0;
  }

  .answer {
    margin-top: 10px;
    padding: 10px;
    background-color: #e8f5e9;
    border-radius: 5px;
    border-left: 4px solid #4caf50;
  }
</style>

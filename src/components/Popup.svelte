<script lang="ts">
  import { onMount } from "svelte";
  import { marked } from "marked";
  import { chromeStorageSync } from "../lib/storage";
  import { Prompt, CreateLLMSession } from "../lib/llm";

  type QA = { question: string; answer: string };

  const notesStore = chromeStorageSync<string[]>("notes");
  let notes: string[] = [];
  let userQuestion: string = "";
  let answerToUserQuestion: string = "";
  let isGeneratingAnswerToUserQuestion = false;
  let quiz: QA[] = [];
  let isGeneratingQuiz = false;
  let visibleQuizAnswers: boolean[] = [];

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

  async function askQuestion(prompt: string) {
    const systemPrompt =
      'You answer questions based on notes given below. \
      Do not add extra info not found in notes. \
      NOTES: \
    ' + "\n" + notes.join("\n");

    answerToUserQuestion = "";
    isGeneratingAnswerToUserQuestion = true; 

    const llmSession = await CreateLLMSession(systemPrompt);

    if (!llmSession) {
      return;
    }

    try {
      answerToUserQuestion = await Prompt(llmSession, prompt);
    } catch (error) {
      console.error("Error answering question:", error);
      alert("Error answering question. Please try again");
    } finally {
      isGeneratingAnswerToUserQuestion = false;
      llmSession.destroy();
    }
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
      visibleQuizAnswers = new Array(quiz.length).fill(false);
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
    visibleQuizAnswers[index] = !visibleQuizAnswers[index];
    visibleQuizAnswers = [...visibleQuizAnswers];
  }

  async function handleAskQuestion() {
    if (userQuestion.trim()) {
      await askQuestion(userQuestion);
    }
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

  <div id="ask-question">
    <input
      type="text"
      bind:value={userQuestion}
      on:keypress={(e) => e.key === "Enter" && handleAskQuestion()}
      placeholder="Ask a question about your notes"
    />
    <button on:click={handleAskQuestion} disabled={!userQuestion.trim() || isGeneratingAnswerToUserQuestion}>
      {isGeneratingAnswerToUserQuestion ? "Answering..." : "Ask"}
    </button>
  </div>

  {#if answerToUserQuestion}
    <div id="answer">
      {@html marked(answerToUserQuestion)}
    </div>
  {/if}

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
            {#if visibleQuizAnswers[index]}
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

  #ask-question {
    display: flex;
    margin-top: 15px;
  }

  #ask-question input {
    flex-grow: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 5px 0 0 5px;
  }

  #ask-question button {
    border-radius: 0 5px 5px 0;
    margin-top: 0;
  }

  #answer {
    margin-top: 20px;
    padding: 15px;
    background-color: #e8f5e9;
    border-radius: 5px;
    border-left: 4px solid #4caf50;
  }

</style>

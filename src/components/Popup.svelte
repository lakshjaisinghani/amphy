<script lang="ts">
  import { onMount } from "svelte";
  import { chromeStorageSync } from "../lib/storage";

  const notesStore = chromeStorageSync<string[]>("notes");
  let notes: string[] = [];

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
</style>

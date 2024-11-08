<script lang="ts">
    import { chromeStorageSync } from "../lib/storage";
    import type { NoteGroup } from "../lib/types";

    const notesStore = chromeStorageSync<NoteGroup[]>("notes");
    const activeTabStore = chromeStorageSync<string>("activeTab");

    let noteGroups: NoteGroup[] = $state([]);
    let activeTab = $state("General");
    let popup: HTMLElement | null = $state(null);
    let selectedText = $state("");
    let popupX = $state(0);
    let popupY = $state(0);
    let popupHovered = $state(false);

    notesStore.subscribe((value) => {
        noteGroups = value || [{ tab: "General", notes: [] }];
    });

    activeTabStore.subscribe((value) => {
        activeTab = value || "General";
    });
    
    // Adjust popup position when hovered
    // if too close to the egdes (quick fix for now)
    $effect(() => {
        if (popupHovered) {
            const element = document.getElementById('highlight-popup');
            const width = element?.clientWidth;

            if (popupX + (width || 0) >= window.innerWidth) {
                popupX = window.innerWidth - ((width || 0) * 1.3);
            }
        }
    });

    function handleDocumentClick(event: MouseEvent) {
        selectedText = window.getSelection()?.toString().trim() || "";

        if (popup && !popup.contains(event.target as Node)) {
            selectedText = "";
        }

        if (selectedText.length > 0 && !popup) {
            popupX = event.pageX - 20;
            popupY = event.pageY + 10;
        }
    }

    function saveHighlightClick(event: MouseEvent) {
        event.stopPropagation(); // Prevent the click from bubbling up to the document
        saveHighlight();
    }

    function saveHighlight() {
        console.log("saveHighlight: ", selectedText);
        notesStore.update((noteGroups) => {
            const groups = noteGroups || [];
            const activeGroup = groups.find((g) => g.tab === activeTab);

            if (activeGroup) {
                activeGroup.notes.push(selectedText);
            } else {
                groups.push({
                    tab: activeTab,
                    notes: [selectedText],
                });
            }

            activeTabStore.set(activeTab);

            selectedText = ""; // clears the popup
            return groups;
        });
    }

    function handleKeyPress(event: KeyboardEvent) {
        if (event.ctrlKey && event.shiftKey && event.key === "A") {
            event.preventDefault();
            saveHighlight();
        }
    }
</script>

<svelte:window onclick={handleDocumentClick} onkeypress={handleKeyPress} />

{#if selectedText}
    <div
        bind:this={popup}
        id="highlight-popup"
        role="application"
        class="absolute h-12 hover:w-72 bg-amber-50 outline outline-1 outline-gray-300 rounded-lg p-3 z-50 flex flex-shrink-0 items-center"
        style="left: {popupX}px; top: {popupY}px;"
        onmouseenter={() => { popupHovered = true }}
        onmouseleave={() => { popupHovered = false }}
    >
        💊
        {#if popupHovered}
            <div class="ml-4">
                <select bind:value={activeTab} class="text-sm mr-3 bg-amber-50">
                    {#each noteGroups as group}
                    <option value={group.tab}>{group.tab}</option>
                {/each}
                {#if noteGroups.length === 1 && noteGroups[0].tab === "General"}
                    <option value="Important">Important</option>
                    <option value="Todo">Todo</option>
                    <option value="Research">Research</option>
                {/if}
            </select>
            </div>
            <div class="text-amber-400 text-xl flex items-center">
                |
            </div>
            <button class="m-4 text-sm bg-amber-100 px-2 py-1 rounded-md" onclick={saveHighlightClick}>Save</button>
            <span class="text-gray-400 text-xs mx-2">Ctrl + Shift + A</span> 
        {/if}
    </div>
{/if}




<style>
    /* select {
        padding: 4px 8px;
        margin-right: 8px;
        border-radius: 6px;
        border: 1px solid #ddddddc4;
        font-size: 14px;
        background-color: white;
        color: black;
    } */
</style>

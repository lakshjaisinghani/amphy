<script lang="ts">
    import { chromeStorageSync } from "../lib/storage";

    interface NoteGroup {
        tab: string;
        notes: string[];
    }

    export let noteGroups: NoteGroup[];
    export let activeTab: string;

    const activeTabStore = chromeStorageSync<string>("activeTab");
    const notesStore = chromeStorageSync<NoteGroup[]>("notes");

    let isAddingTab = false;
    let newTabName = "";

    const MAX_TAB_NAME_LENGTH = 20;
    let editingTab = "";
    let editTabName = "";

    // Generate consistent colors for tabs based on their names
    function getTabColor(tabName: string) {
        // Simple hash function to get consistent index
        const hash = tabName.split("").reduce((acc, char) => {
            return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);

        // Extract the RGB values from the hash
        const r = (hash >> 16) & 0xff;
        const g = (hash >> 8) & 0xff;
        const b = hash & 0xff;

        // Convert RGB values to a hex string for color
        const color = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

        return color;
    }

    function startEditingTab(tab: string) {
        if (tab !== "General") {
            editingTab = tab;
            editTabName = tab;
        }
    }

    function saveTabEdit() {
        if (!editTabName.trim() || editTabName === editingTab) {
            editingTab = "";
            return;
        }

        const trimmedName = editTabName.slice(0, MAX_TAB_NAME_LENGTH);

        notesStore.update((groups) => {
            const group = groups.find((g) => g.tab === editingTab);
            if (group) {
                group.tab = trimmedName;
                setActiveTab(trimmedName);
            }
            return groups;
        });

        editingTab = "";
    }

    function setActiveTab(tab: string) {
        activeTabStore.set(tab);
    }

    function deleteTab(tabName: string) {
        if (tabName === "General") return; // Prevent deleting General tab

        notesStore.update((groups) => {
            const filteredGroups = groups.filter((g) => g.tab !== tabName);
            if (activeTab === tabName) {
                setActiveTab("General");
            }
            return filteredGroups;
        });
    }

    function truncateText(text: string, maxLength: number) {
        return text.length > maxLength
            ? text.slice(0, maxLength) + "..."
            : text;
    }

    function handleAddTab() {
        if (!newTabName.trim()) return;

        // Limit tab name length
        const trimmedName = newTabName.slice(0, MAX_TAB_NAME_LENGTH);

        notesStore.update((groups) => {
            if (!groups.some((g) => g.tab === trimmedName)) {
                groups.push({ tab: trimmedName, notes: [] });
            }
            setActiveTab(trimmedName);
            newTabName = "";
            isAddingTab = false;
            return groups;
        });
    }
</script>

<div class="tabs">
    <div class="tab-selector">
        {#if editingTab === activeTab}
            <input
                type="text"
                bind:value={editTabName}
                maxlength={MAX_TAB_NAME_LENGTH}
                on:blur={saveTabEdit}
                on:keypress={(e) => e.key === "Enter" && saveTabEdit()}
                class="edit-tab-input"
            />
        {:else}
            <div class="select-wrapper">
                <select
                    bind:value={activeTab}
                    on:change={() => setActiveTab(activeTab)}
                    on:dblclick={() => startEditingTab(activeTab)}
                    title="Double-click to edit tab name"
                >
                    {#each noteGroups as group}
                        <option
                            value={group.tab}
                            style="background-color: {getTabColor(group.tab)}60"
                        >
                            {truncateText(group.tab, MAX_TAB_NAME_LENGTH)}
                        </option>
                    {/each}
                </select>
                <div
                    class="selected-color-indicator"
                    style="background-color: {getTabColor(activeTab)}"
                ></div>
            </div>
        {/if}

        {#if activeTab !== "General" && editingTab !== activeTab && !isAddingTab}
            <button
                class="delete-tab"
                on:click={() => deleteTab(activeTab)}
                title="Delete current tab"
                
            >
                ×
            </button>
        {/if}

        {#if editingTab !== activeTab && !isAddingTab}
            <button
                class="add-tab-button"
                on:click={() => (isAddingTab = true)}
                title="Create new tab"
            >
                +
            </button>
        {/if}
    </div>

    {#if isAddingTab}
        <div class="new-tab-input">
            <input
                type="text"
                bind:value={newTabName}
                placeholder="New tab name"
                maxlength={MAX_TAB_NAME_LENGTH}
                on:keypress={(e) => e.key === "Enter" && handleAddTab()}
            />
            <button
                class="confirm-tab"
                on:click={handleAddTab}
                title="Confirm new tab">✓</button
            >
            <button
                class="cancel-tab"
                on:click={() => {
                    isAddingTab = false;
                    newTabName = "";
                }}
                title="Cancel">×</button
            >
        </div>
    {/if}
</div>

<style>
    .tabs {
        border-bottom: 1px solid #ddd;
        padding-bottom: 8px;
    }

    .tab-selector {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    select {
        padding: 8px;
        border-radius: 5px;
        border: 1px solid #ddd;
        background-color: white;
        cursor: pointer;
        font-size: 14px;
        padding-left: 24px;
        appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 8px center;
        background-size: 16px;
        width: 200px;
        padding-right: 32px;
    }

    .delete-tab {
        background: #f0f0f0;
        border: none;
        color: #666;
        padding: 4px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        height: 27px;
        width: 27px;
    }

    .add-tab-button {
        background-color: #f0f0f0;
        color: #333;
        border: none;
        padding: 4px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        height: 27px;
        width: 27px;
    }

    .new-tab-input {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 8px;
    }

    .new-tab-input input {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 14px;
    }

    .confirm-tab,
    .cancel-tab {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        height: 27px;
        width: 27px;
    }

    .confirm-tab {
        color: #2ecc71;

    }

    .cancel-tab {
        color: #e74c3c;
        padding: 8px;
    }

    .select-wrapper {
        position: relative;
        flex-grow: 1;
        display: flex;
        align-items: center;
    }

    .selected-color-indicator {
        position: absolute;
        left: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }

    .edit-tab-input {
        flex-grow: 1;
        padding: 8px;
        padding-left: 24px;
        border: 1px solid #3498db;
        border-radius: 5px;
        font-size: 14px;
        outline: none;
    }

    /* Add hover effects for better interactivity */
    button:hover {
        opacity: 0.8;
        transform: scale(1.05);
        transition: all 0.2s ease;
    }

    select:hover {
        border-color: #3498db;
    }

    /* Style the select options */
    select option {
        padding: 8px;
        font-size: 14px;
    }
</style>

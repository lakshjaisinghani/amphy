document.addEventListener('DOMContentLoaded', function() {
  displayNotes();
});

function displayNotes() {
  chrome.storage.sync.get('notes', function(data) {
    const notesContainer = document.getElementById('notes');
    notesContainer.innerHTML = '';

    if (data.notes && data.notes.length > 0) {
      data.notes.forEach(function(note, index) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.innerHTML = `
          <span class="note-text">${note}</span>
          <button class="delete-button" data-index="${index}">Delete</button>
        `;
        notesContainer.appendChild(noteElement);
      });

      // Add event listeners to delete buttons
      const deleteButtons = document.querySelectorAll('.delete-button');
      deleteButtons.forEach(button => {
        button.addEventListener('click', deleteNote);
      });
    } else {
      notesContainer.innerHTML = '<p id="no-notes">No notes yet</p>';
    }
  });
}

function deleteNote(event) {
  const index = parseInt(event.target.getAttribute('data-index'));
  chrome.storage.sync.get('notes', function(data) {
    if (data.notes && data.notes.length > index) {
      data.notes.splice(index, 1);
      chrome.storage.sync.set({notes: data.notes}, function() {
        displayNotes();
      });
    }
  });
}

// const textToggle = document.getElementById('textToggle');
// textToggle.addEventListener('change', function() {
//   document.body.style.userSelect = this.checked ? 'text' : 'none';
//   if (this.checked) {
//     addMouseupListener(); // Re-enable mouseup listener if toggled on
//   } else {
//     removeMouseupListener(); // Disable mouseup listener if toggled off
//   }
// });
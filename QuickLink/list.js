document.addEventListener('DOMContentLoaded', function () {
    console.log('DOMContentLoaded event fired on list page');
    
    const editModal = document.getElementById('editModal');
    editModal.style.display = 'none';
    
    const addModal = document.getElementById('addModal');
     addModal.style.display = 'none';

    // Function to show a specific tab
    function showTab(tabId) {
        const tabs = document.querySelectorAll('.tabContent');
        tabs.forEach(tab => {
            if (tab.id === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

	const searchInput = document.getElementById('searchInput');
	
	searchInput.addEventListener('input', function () {
        const searchQuery = searchInput.value;
        fetchAllUrls(searchQuery);
    });

	// Add event listener for the clear button
	const clearButton = document.getElementById('clearButton');
	clearButton.addEventListener('click', function () {
		const searchInput = document.getElementById('searchInput');
		searchInput.value = '';  // Clear the search input box
		fetchAllUrls();  // Display all urls
	});

    // Add event listeners to tab buttons
    const notesTabButton = document.getElementById('notesTabButton');
    notesTabButton.addEventListener('click', function () {
        showTab('notesTab');
        notesTabButton.classList.add('active');
        settingsTabButton.classList.remove('active');
    });

    const settingsTabButton = document.getElementById('settingsTabButton');
    settingsTabButton.addEventListener('click', function () {
        showTab('settingsTab');
        settingsTabButton.classList.add('active');
        notesTabButton.classList.remove('active');
    });


    // By default, show the notes tab
    showTab('notesTab');
    notesTabButton.classList.add('active');
	
	
    async function loadData() {
        return new Promise((resolve) => {
            chrome.storage.sync.get('urls', (result) => {
                const urls = result.urls || [];
                 resolve(urls);
            });
        });
    }

    async function saveData(urls) {
        return new Promise((resolve) => {
           chrome.storage.sync.set({ urls: urls }, () => {
             resolve();
            });
        });
   }
   function generateData(){
        return [];
    }

    // Function to fetch all urls and update urls info
	async function fetchAllUrls(searchQuery = '') {
		try {
            let urls = await loadData();
            const searchKeywords = searchQuery.trim().split(/\s+/); // split the queries allowing multiple search criteria

            // Filter urls based on search keywords
            if (searchKeywords.length > 0) {
            urls = urls.filter(url =>
                searchKeywords.some(keyword =>
                    new RegExp(keyword, 'i').test(url.keyword) ||  // <-- Alteration 2
                    (Array.isArray(url.text) && url.text.some(text => new RegExp(keyword, 'i').test(text)))    // <-- Alteration 2
                    )
                );
            }

            console.log('Filtered urls:', urls);
            displayUrls(urls);
            const storageUsed = await getStorageUsed();
            // Update the #notesInfo div with the filtered urls count
            const numberOfUrls = urls.length;
            console.log('Number of filtered urls:', numberOfUrls);
            const notesInfoDiv = document.getElementById('notesInfo');
            notesInfoDiv.innerHTML = `
                <p>Number of URLs: ${numberOfUrls}</p>
				<p>Database size: ${storageUsed}</p>
                 <div class="storage-bar-container">
                     <div class="storage-bar" style="width: ${calculateStorageBarWidth(storageUsed)}%;"></div>
                  </div>
            `;

        } catch(error) {
            console.error('Error fetching urls: ', error);
        }
	}


	// Function to calculate database size based on urls
    function calculateDatabaseSize(urls) {
        let dbSize = 0;
        urls.forEach(url => {
			if(Array.isArray(url.text)) {
               dbSize += JSON.stringify(url).length + url.text.reduce((sum,str)=> sum+str.length, 0);
			} else {
				dbSize += JSON.stringify(url).length + (url.text ? url.text.length : 0);
			}
        });
        return dbSize;
    }

     async function getStorageUsed() {
            return new Promise((resolve, reject) => {
                 chrome.storage.sync.getBytesInUse('urls', (bytes) => {
                     if(chrome.runtime.lastError) {
                           reject(chrome.runtime.lastError);
                     } else {
                           resolve(formatBytes(bytes));
                     }
                 });
            });
     }

     function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function calculateStorageBarWidth(storageUsed) {
           const storageUsedNum = parseInt(storageUsed.split(' ')[0]);
           const storageUsedUnit = storageUsed.split(' ')[1];
          let percentage = 0;
           if(storageUsedUnit === 'KB') {
             percentage = Math.min((storageUsedNum/100),1) * 100
          }
          if(storageUsedUnit === 'Bytes') {
            percentage = (storageUsedNum/100000) * 100;
           }

           return percentage;
    }
    // Function to display urls
    function displayUrls(urls) {
        const notesList = document.getElementById('notesList');
        notesList.innerHTML = ''; // Clear previous content
        if (urls.length === 0) {
            notesList.textContent = 'No URLs found.';
        } else {
            let notePairDiv = null;
            for (let i = 0; i < urls.length; i++) {
               
                if(i % 3 === 0) {
                     notePairDiv = document.createElement('div');
                    notePairDiv.className = 'note-pair';
                      notesList.appendChild(notePairDiv);
                }

                const note = urls[i];
                const noteDiv = createUrlElement(note);
                  notePairDiv.appendChild(noteDiv);
            }
        }
    }
	function createUrlElement(url) {
		const urlDiv = document.createElement('div');
		urlDiv.className = 'note';
		let urlText = Array.isArray(url.text) ? url.text.join('<br>') : url.text;
		urlDiv.innerHTML = `
			<div>
				<strong>${url.keyword}</strong>: <span class="note-text">${urlText}</span>
			</div>
			<button class="edit-note-button">
				<img src="edit.png" alt="Edit" />
			</button>
			<button class="delete-note-button">
				<img src="delete.png" alt="Delete" />
			</button>
		`;

		// Add event listeners for editing and deleting
		urlDiv.querySelector('.edit-note-button').addEventListener('click', () => {
			editUrl(url);
		});
		urlDiv.querySelector('.delete-note-button').addEventListener('click', () => {
			console.log(`Delete button clicked for url with keyword: "${url.keyword}"`);
			deleteUrl(url.keyword);
		});

		return urlDiv;
	}

    // Function to edit a url
   async function editUrl(url) {
        const editModal = document.getElementById('editModal');
		const editKeywordInput = document.getElementById('editKeyword');
        const editUrlsInput = document.getElementById('editUrls');
        const closeModalButton = editModal.querySelector('.close-modal');
        const saveEditButton = document.getElementById('saveEditButton');
        const cancelEditButton = document.getElementById('cancelEditButton');
        
        editKeywordInput.value = url.keyword;
         editUrlsInput.value = Array.isArray(url.text) ? url.text.join('\n') : url.text;
        editModal.style.display = 'block';
        
         // Function to close the modal
        function closeModal() {
             editModal.style.display = "none";
              document.removeEventListener('keydown', handleEscClose);
          }
        
          // Function to handle ESC key press
        function handleEscClose(event) {
           if (event.key === 'Escape') {
                closeModal();
            }
        }
    
        document.addEventListener('keydown', handleEscClose);


        closeModalButton.onclick = function() {
           closeModal();
         };
        
        cancelEditButton.onclick = function() {
           closeModal();
        };

          saveEditButton.onclick = async function () {
               const newKeyword =  editKeywordInput.value;
               const newText =  editUrlsInput.value;

            if (newKeyword !== null && newText !== null) {
                 try {
                     let urls = await loadData();
                    const updatedUrls = urls.map(u => {
                        if (u.keyword === url.keyword) {
                            let newUrls = newText.split('\n').map(url => url.trim()).filter(Boolean);
                            return { ...u, keyword: newKeyword, text: newUrls};
                        }
                        return u;
                    });
                    await saveData(updatedUrls);
                    fetchAllUrls();
                } catch (error) {
                   console.error('Error editing url: ', error);
                }
             }

             closeModal();

        }
    }
    
    async function addUrl() {
        const addModal = document.getElementById('addModal');
		const addKeywordInput = document.getElementById('addKeyword');
        const addUrlsInput = document.getElementById('addUrls');
        const closeModalButton = addModal.querySelector('.close-modal');
        const saveAddButton = document.getElementById('saveAddButton');
        const cancelAddButton = document.getElementById('cancelAddButton');
         addModal.style.display = 'block';
          // Function to close the modal
          function closeModal() {
             addModal.style.display = "none";
             document.removeEventListener('keydown', handleEscClose);
           }
        
          // Function to handle ESC key press
        function handleEscClose(event) {
           if (event.key === 'Escape') {
                closeModal();
            }
        }
         document.addEventListener('keydown', handleEscClose);


        closeModalButton.onclick = function() {
           closeModal();
         };
        
        cancelAddButton.onclick = function() {
           closeModal();
        };

        saveAddButton.onclick = async function () {
            const newKeyword =  addKeywordInput.value;
            const newText =  addUrlsInput.value;
            
              if (newKeyword !== null && newText !== null) {
                    try {
                        let urls = await loadData();
                        const existingNote = urls.find(url => url.keyword === newKeyword);
                            if (existingNote) {
                                 alert('Keyword already exists!');
                                 return;
                             }  else {
                                 const newUrls = newText.split('\n').map(url => url.trim()).filter(Boolean);
                                  const newNote = {
                                        keyword: newKeyword,
                                        text: newUrls,
                                        isUrl: true,
                                        timestamp: new Date().toISOString(),
                                  };
                                  urls.push(newNote);
                                   await saveData(urls);
                                  fetchAllUrls(); // Refresh the urls list
                             }

                     } catch (error) {
                        console.error('Error adding URL:', error);
                        alert('Error adding URL!');
                     }

                }
            
             closeModal();
         }
    }
    

    // Function to delete a url
	async function deleteUrl(keyword) {
		const confirmation = confirm("Are you sure you want to delete this URL?");
        if (confirmation) {
             try {
                let urls = await loadData();
                const updatedUrls = urls.filter(url => url.keyword !== keyword);
                 await saveData(updatedUrls);
                fetchAllUrls(); // Refresh the urls list
             } catch(error) {
                 console.error('Error deleting url: ', error);
            }
         }
    }

    // Function to delete all urls
    async function deleteAllUrls() {
        const confirmation = confirm('Are you sure you want to delete all URLs? This action cannot be undone.');
        if (confirmation) {
            try {
                await saveData(generateData());
                fetchAllUrls();
            } catch (error) {
                  console.error('Error deleting all urls: ', error);
            }

        }
    }

    // Event listener for search button
    const searchButton = document.getElementById('searchButton');

    const deleteAllButton = document.getElementById('deleteAllButton');
    deleteAllButton.addEventListener('click', function () {
        deleteAllUrls();
    });

    const shortcutPageButton = document.getElementById('shortcutPageButton');
    shortcutPageButton.addEventListener('click', function () {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
    });

    fetchAllUrls();
    
    const addUrlButton = document.getElementById('addUrlButton');
     addUrlButton.addEventListener('click', () => {
       addUrl();
   });
    // Fetch and display the current shortcuts
    const currentShortcutDiv = document.getElementById('currentShortcut');
    chrome.commands.getAll((commands) => {
        const popupShortcut = commands.find(command => command.name === '_execute_action')?.shortcut;
        const settingsShortcut = commands.find(command => command.name === 'open_settings')?.shortcut;
        currentShortcutDiv.innerHTML = `
            Shortcut for Popup: ${popupShortcut || 'Not Set'}<br>
            Shortcut for Settings: ${settingsShortcut || 'Not Set'}
        `;
    });
	
	// Function to export urls
    async function exportUrls() {
         try {
            const urls = await loadData();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(urls));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "urls.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        } catch(error) {
             console.error('Error exporting urls:', error);
        }
    }

const exportButton = document.getElementById('exportButton');
exportButton.addEventListener('click', exportUrls);

// Function to import urls
    async function importUrls(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(event) {
            try {
                const urls = JSON.parse(event.target.result);
                await saveData(urls);
                fetchAllUrls();
             } catch(error) {
               console.error('Error importing urls:', error);
            }
        };

        reader.readAsText(file);
    }

const importFileInput = document.getElementById('importFileInput');
const importButton = document.getElementById('importButton');
importButton.addEventListener('click', () => importFileInput.click());
importFileInput.addEventListener('change', importUrls);
	
});
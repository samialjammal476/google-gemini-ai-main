document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const modelType = document.getElementById('modelType');
    const imageUploadBtn = document.getElementById('imageUploadBtn');
    const imageInput = document.getElementById('imageInput');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const createCacheCheckbox = document.getElementById('createCache');
    const cacheTTLInput = document.getElementById('cacheTTL');
    const cacheIdInput = document.getElementById('cacheId');
    const listCachesBtn = document.getElementById('listCachesBtn');
    const cacheList = document.getElementById('cacheList');

    // State variables
    let selectedImages = [];
    let currentCacheId = null;

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    imageUploadBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageUpload);
    modelType.addEventListener('change', toggleImageUpload);
    listCachesBtn.addEventListener('click', listCaches);

    // Initialize UI
    toggleImageUpload();

    // Functions
    function toggleImageUpload() {
        const isTextOnly = modelType.value === 'text_only';
        imageUploadBtn.style.display = isTextOnly ? 'none' : 'flex';
        
        if (isTextOnly) {
            // Clear images if switching to text only
            selectedImages = [];
            imagePreviewContainer.innerHTML = '';
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessageToChat(message, 'user');
        userInput.value = '';

        // Show typing indicator
        const typingIndicator = addTypingIndicator();

        try {
            const selectedModel = modelType.value;
            let requestBody = {
                modelType: selectedModel,
                prompt: message
            };

            // Add cache options if text_only model
            if (selectedModel === 'text_only') {
                if (createCacheCheckbox.checked) {
                    requestBody.createCache = true;
                    requestBody.cacheTTL = cacheTTLInput.value + 's';
                }
                
                if (cacheIdInput.value) {
                    requestBody.cacheId = cacheIdInput.value;
                }
            }

            // Add images if text_and_image model
            if (selectedModel === 'text_and_image' && selectedImages.length > 0) {
                requestBody.imageParts = selectedImages;
            }

            const response = await fetch('http://localhost:3000/chat-with-gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            // Remove typing indicator
            chatMessages.removeChild(typingIndicator);

            if (data.Error) {
                addMessageToChat(`Error: ${data.Error}`, 'bot');
            } else {
                addMessageToChat(data.result, 'bot');
                
                // Update cache ID if returned
                if (data.cacheId) {
                    currentCacheId = data.cacheId;
                    cacheIdInput.value = data.cacheId;
                }
            }

            // Clear image previews after sending
            if (selectedModel === 'text_and_image') {
                selectedImages = [];
                imagePreviewContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Error:', error);
            chatMessages.removeChild(typingIndicator);
            addMessageToChat('Sorry, there was an error processing your request.', 'bot');
        }
    }

    function addMessageToChat(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // Use marked to parse Markdown to HTML
        messageContent.innerHTML = marked.parse(message);
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function formatMessage(message) {
        // Handle code blocks with 
        let formatted = message.replace(/([\s\S]*?)```/g, (match, code) => {
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        });
        
        // Handle line breaks
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&")
            .replace(/</g, "<")
            .replace(/>/g, ">")
            .replace(/"/g, "\"")
            .replace(/'/g, "'");
    }

    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        
        const typingContent = document.createElement('div');
        typingContent.className = 'message-content';
        typingContent.innerHTML = '<div class="loading"></div>';
        
        typingDiv.appendChild(typingContent);
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return typingDiv;
    }

    async function handleImageUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;
            
            try {
                // Convert to base64 for preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageUrl = e.target.result;
                    
                    // Create image preview
                    const previewDiv = document.createElement('div');
                    previewDiv.className = 'image-preview';
                    
                    const img = document.createElement('img');
                    img.src = imageUrl;
                    previewDiv.appendChild(img);
                    
                    // Add remove button
                    const removeBtn = document.createElement('div');
                    removeBtn.className = 'remove-image';
                    removeBtn.innerHTML = '×';
                    removeBtn.addEventListener('click', () => {
                        imagePreviewContainer.removeChild(previewDiv);
                        selectedImages = selectedImages.filter(url => url !== imageUrl);
                    });
                    
                    previewDiv.appendChild(removeBtn);
                    imagePreviewContainer.appendChild(previewDiv);
                    
                    // Add to selected images
                    selectedImages.push(imageUrl);
                };
                
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }
        
        // Reset file input
        event.target.value = '';
    }

    async function listCaches() {
        try {
            const response = await fetch('http://localhost:3000/manage-cache', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'list' })
            });
            
            const data = await response.json();
            
            if (data.success) {
                displayCaches(data.caches);
            } else {
                alert('Error listing caches: ' + data.error);
            }
        } catch (error) {
            console.error('Error listing caches:', error);
            alert('Error listing caches');
        }
    }

    function displayCaches(caches) {
        cacheList.innerHTML = '';
        
        if (!caches || caches.length === 0) {
            cacheList.innerHTML = '<p>No caches available</p>';
            return;
        }
        
        caches.forEach(cache => {
            const cacheItem = document.createElement('div');
            cacheItem.className = 'cache-item';
            
            const cacheInfo = document.createElement('div');
            cacheInfo.innerHTML = `
                <strong>ID:</strong> ${cache.id}<br>
                <small>Expires: ${new Date(cache.expiresAt).toLocaleString()}</small>
            `;
            
            const cacheActions = document.createElement('div');
            cacheActions.className = 'cache-item-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-cache';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteCache(cache.id));
            
            const updateBtn = document.createElement('button');
            updateBtn.className = 'update-cache';
            updateBtn.textContent = 'Update TTL';
            updateBtn.addEventListener('click', () => {
                const newTTL = prompt('Enter new TTL in seconds:', '3600');
                if (newTTL) updateCacheTTL(cache.id, newTTL);
            });
            
            const useBtn = document.createElement('button');
            useBtn.textContent = 'Use';
            useBtn.addEventListener('click', () => {
                cacheIdInput.value = cache.id;
                currentCacheId = cache.id;
            });
            
            cacheActions.appendChild(useBtn);
            cacheActions.appendChild(updateBtn);
            cacheActions.appendChild(deleteBtn);
            
            cacheItem.appendChild(cacheInfo);
            cacheItem.appendChild(cacheActions);
            
            cacheList.appendChild(cacheItem);
        });
    }

    async function deleteCache(cacheId) {
        try {
            const response = await fetch('http://localhost:3000/manage-cache', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'delete',
                    cacheId: cacheId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Cache deleted successfully');
                listCaches();
                
                // Clear current cache ID if it was deleted
                if (currentCacheId === cacheId) {
                    currentCacheId = null;
                    cacheIdInput.value = '';
                }
            } else {
                alert('Error deleting cache: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting cache:', error);
            alert('Error deleting cache');
        }
    }

    async function updateCacheTTL(cacheId, ttl) {
        try {
            const response = await fetch('http://localhost:3000/manage-cache', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    action: 'update',
                    cacheId: cacheId,
                    ttl: ttl + 's'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Cache TTL updated successfully');
                listCaches();
            } else {
                alert('Error updating cache TTL: ' + data.error);
            }
        } catch (error) {
            console.error('Error updating cache TTL:', error);
            alert('Error updating cache TTL');
        }
    }
});

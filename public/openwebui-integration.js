// public/openwebui-integration.js
class OpenWebUICityFinder {
    constructor() {
        this.isInitialized = false;
        this.apiUrl = 'http://192.168.56.10:3000/api/maps'; // UPDATED
        this.apiKey = 'openwebui-maps-integration-2024';
    }

    init() {
        if (this.isInitialized) return;

        console.log('Initializing Open WebUI City Finder Integration for 192.168.56.10');
        
        // Wait for Open WebUI to load
        this.waitForOpenWebUI().then(() => {
            this.injectCityFinderButton();
            this.isInitialized = true;
        });
    }

    async waitForOpenWebUI() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // Check for Open WebUI specific elements
                const openWebUIElements = document.querySelector('[class*="chat"], [class*="message"], [class*="input"]');
                if (openWebUIElements) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
            }, 10000);
        });
    }

    injectCityFinderButton() {
        // Find the chat input area in Open WebUI
        const chatInputContainer = this.findChatInput();
        
        if (chatInputContainer) {
            this.createCityFinderButton(chatInputContainer);
        } else {
            console.warn('Could not find Open WebUI chat input container');
            // Try again after a delay
            setTimeout(() => this.injectCityFinderButton(), 2000);
        }
    }

    findChatInput() {
        // Common Open WebUI selectors
        const selectors = [
            '[data-testid="chat-input"]',
            'textarea[placeholder*="message"]',
            '.chat-input',
            '.message-input',
            'form textarea',
            'input[type="text"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element.parentElement;
            }
        }

        return null;
    }

    createCityFinderButton(container) {
        // Check if button already exists
        if (document.getElementById('openwebui-city-finder-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'openwebui-city-finder-btn';
        button.innerHTML = '🏙️ City Finder';
        button.style.cssText = `
            margin-left: 10px;
            padding: 10px 16px;
            background: linear-gradient(135deg, #10a37f, #0d8c6c);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;

        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });

        button.addEventListener('click', () => {
            this.openCityFinderModal();
        });

        container.appendChild(button);
        console.log('City Finder button injected into Open WebUI');
    }

    openCityFinderModal() {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'city-finder-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 1000px;
            height: 80vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;

        modal.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #10a37f, #0d8c6c); color: white;">
                    <h3 style="margin: 0;">🏙️ City Finder</h3>
                    <button id="close-city-finder" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
                </div>
                <div style="flex: 1; overflow: hidden;">
                    <iframe src="http://192.168.56.10:3000" 
                            style="width: 100%; height: 100%; border: none;"
                            title="City Finder"></iframe>
                </div>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Add close functionality
        const closeBtn = document.getElementById('close-city-finder');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', function closeOnEscape(e) {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', closeOnEscape);
            }
        });
    }

    // Method to send search results to Open WebUI chat
    sendToChat(message) {
        // Find the chat input and simulate typing
        const chatInput = this.findChatInput()?.querySelector('textarea, input[type="text"]');
        if (chatInput) {
            // Focus the input
            chatInput.focus();
            
            // Set the message (this might need adjustment based on Open WebUI's implementation)
            chatInput.value = message;
            
            // Trigger input event
            chatInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            console.log('Message sent to Open WebUI chat:', message);
        }
    }
}

// Initialize the integration when the script loads
const cityFinderIntegration = new OpenWebUICityFinder();

// Export for ES modules
export function init() {
    return cityFinderIntegration.init();
}

export default cityFinderIntegration;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => cityFinderIntegration.init());
} else {
    cityFinderIntegration.init();
}

/**
 * TURF X — AI Match & Venue Concierge Chatbot
 * Interactive widget with curated Mumbai Turf topics, quick questions, and conversational answers.
 */

const Chatbot = (function() {
  const state = {
    isOpen: false,
    categories: [],
    messages: [
      {
        sender: 'bot',
        text: `Hey there! ⚡ Welcome to **Turf X Mumbai**.<br><br>I'm your 24/7 Match & Equipment Assistant. How can I help you gear up for your game tonight?`
      }
    ]
  };

  async function init() {
    setupDomListeners();
    await fetchFaqCategories();
    renderQuickQuestions();
    renderMessages();
  }

  function setupDomListeners() {
    const triggerBtn = document.getElementById('chatbotTriggerBtn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', toggleChatbot);
    }

    const closeBtn = document.getElementById('closeChatbotBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', toggleChatbot);
    }

    const sendBtn = document.getElementById('chatSendBtn');
    const input = document.getElementById('chatTextInput');

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => sendUserMessage());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendUserMessage();
      });
    }
  }

  function toggleChatbot() {
    state.isOpen = !state.isOpen;
    const win = document.getElementById('chatbotWindow');
    if (win) {
      win.classList.toggle('active', state.isOpen);
      if (state.isOpen) {
        document.getElementById('chatTextInput')?.focus();
        scrollToBottom();
      }
    }
  }

  async function fetchFaqCategories() {
    try {
      const res = await fetch('/api/chat/faq');
      const data = await res.json();
      if (data.success) {
        state.categories = data.data;
      }
    } catch (e) {
      console.warn('Could not load chat topics:', e);
    }
  }

  function renderQuickQuestions(filterCat = null) {
    const container = document.getElementById('chatbotQuickChips');
    if (!container) return;

    let questionsList = [];
    if (filterCat) {
      const cat = state.categories.find(c => c.category === filterCat);
      if (cat) questionsList = cat.questions;
    } else {
      // Pick first 4 top questions across categories
      state.categories.forEach(c => {
        if (c.questions && c.questions[0]) {
          questionsList.push(c.questions[0]);
        }
      });
    }

    container.innerHTML = questionsList.map(q => `
      <button class="quick-q-chip" onclick="Chatbot.askPresetQuestion('${q.id}', '${escapeAttr(q.question)}')">
        ${q.question}
      </button>
    `).join('');
  }

  function escapeAttr(str) {
    return str.replace(/'/g, "\\'");
  }

  function renderMessages() {
    const body = document.getElementById('chatbotMessagesBody');
    if (!body) return;

    body.innerHTML = state.messages.map(m => `
      <div class="chat-bubble ${m.sender}">
        ${m.text}
      </div>
    `).join('');

    scrollToBottom();
  }

  function scrollToBottom() {
    const body = document.getElementById('chatbotMessagesBody');
    if (body) {
      setTimeout(() => {
        body.scrollTop = body.scrollHeight;
      }, 50);
    }
  }

  async function askPresetQuestion(qId, questionText) {
    // Add user question to bubble
    state.messages.push({ sender: 'user', text: questionText });
    renderMessages();

    // Show temporary typing indicator
    const typingMsg = { sender: 'bot', text: 'Thinking... ⚡' };
    state.messages.push(typingMsg);
    renderMessages();

    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: qId, query: questionText })
      });
      const data = await res.json();

      // Replace typing with response
      state.messages.pop();
      if (data.success) {
        const formattedReply = data.reply.replace(/\n/g, '<br>');
        state.messages.push({ sender: 'bot', text: formattedReply });

        if (data.suggestions && data.suggestions.length > 0) {
          renderSuggestionChips(data.suggestions);
        }
      }
    } catch (e) {
      state.messages.pop();
      state.messages.push({ sender: 'bot', text: 'Sorry, I encountered an issue. Please try again!' });
    }

    renderMessages();
  }

  async function sendUserMessage() {
    const input = document.getElementById('chatTextInput');
    const text = input?.value?.trim();
    if (!text) return;

    input.value = '';

    // Add user message
    state.messages.push({ sender: 'user', text });
    renderMessages();

    // Show typing
    state.messages.push({ sender: 'bot', text: 'Checking Mumbai arenas... ⚽' });
    renderMessages();

    try {
      const res = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      const data = await res.json();

      state.messages.pop();
      if (data.success) {
        const formattedReply = data.reply.replace(/\n/g, '<br>');
        state.messages.push({ sender: 'bot', text: formattedReply });

        if (data.suggestions && data.suggestions.length > 0) {
          renderSuggestionChips(data.suggestions);
        }
      }
    } catch (e) {
      state.messages.pop();
      state.messages.push({ sender: 'bot', text: 'Network connection issue. Make sure server is running.' });
    }

    renderMessages();
  }

  function renderSuggestionChips(suggestions) {
    const container = document.getElementById('chatbotQuickChips');
    if (!container) return;

    container.innerHTML = suggestions.map(q => `
      <button class="quick-q-chip" onclick="Chatbot.askCustomPrompt('${escapeAttr(q)}')">
        ${q}
      </button>
    `).join('');
  }

  function askCustomPrompt(prompt) {
    const input = document.getElementById('chatTextInput');
    if (input) {
      input.value = prompt;
      sendUserMessage();
    }
  }

  return {
    state,
    init,
    toggleChatbot,
    askPresetQuestion,
    askCustomPrompt
  };
})();

// Attach to window and bootstrap
window.Chatbot = Chatbot;
document.addEventListener('DOMContentLoaded', Chatbot.init);

const BASE_URL = 'http://localhost:5001';

export const chatApi = {
  async connect(username, serverIp = 'host.docker.internal', serverPort = 5000) {
    try {
      const response = await fetch(`${BASE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_ip: serverIp,
          server_port: serverPort,
          username: username
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    }
  },

  async checkStatus() {
    try {
      const response = await fetch(`${BASE_URL}/status`);
      return await response.json();
    } catch (error) {
      console.error('Failed to check status:', error);
      return { connected: false };
    }
  },

  async getUsers() {
    try {
      const response = await fetch(`${BASE_URL}/users`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch users:', error);
      return { users: [] };
    }
  },

  async sendMessage(target, message) {
    try {
      const response = await fetch(`${BASE_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, message })
      });
      return await response.json();
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },

  async getMessages() {
    try {
      const response = await fetch(`${BASE_URL}/messages`);
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      return { messages: [] };
    }
  }
};

import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '/';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
});

export default socket;
